/**
 * Media data-access service.
 *
 * Storage provider: Supabase Storage, bucket MEDIA_BUCKET ("article-media"),
 * public-read. File bytes live in Storage; the `media` table holds metadata.
 *
 * Upload request:
 *   POST {VITE_SUPABASE_URL}/storage/v1/object/{bucket}/{folder}/{unique-name}
 *   headers: apikey (anon key) + Authorization: Bearer <signed-in user's token>
 *
 * Security:
 *   - Only active admins may upload/delete: enforced server-side by the
 *     storage.objects and media RLS policies (see the storage migration).
 *   - The bucket enforces the size limit and MIME allow-list server-side.
 *   - The service-role key is NEVER used here.
 *   - File type is taken from the file's content (magic bytes), not from its
 *     name or the browser-reported type.
 */

import { supabase, supabaseStorage, MEDIA_BUCKET, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';
import type { Media, MediaInsert, MediaUpdate } from '../../types/article';
import { invalidate } from '../cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Accepted types → file extension used for the stored object. Keep in sync with the bucket's allowed_mime_types. */
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg':    'jpg',
  'image/png':     'png',
  'image/webp':    'webp',
  'image/gif':     'gif',
  'image/avif':    'avif',
  'image/svg+xml': 'svg',
};
const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSIONS));
const ACCEPTED_LABEL = 'JPEG, PNG, WebP, GIF, AVIF or SVG';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — same as the bucket's file_size_limit

/** Longest side of stored photos. Larger uploads are scaled down in the browser. */
const MAX_IMAGE_DIMENSION = 2400;
/** Longest side of the thumbnail used by grids, the picker and article cards. */
const THUMB_DIMENSION = 640;
/** Formats the browser can re-encode (AVIF/GIF/SVG are stored as uploaded). */
const RESIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

const STORAGE_HOST = (() => { try { return new URL(SUPABASE_URL).host; } catch { return SUPABASE_URL; } })();

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MediaUploadError extends Error {
  /** true when the user cancelled the upload */
  readonly cancelled: boolean;
  constructor(message: string, opts: { cancelled?: boolean } = {}) {
    super(message);
    this.name = 'MediaUploadError';
    this.cancelled = opts.cancelled ?? false;
  }
}

export type UploadProgressFn = (uploadedBytes: number, totalBytes: number) => void;

// ---------------------------------------------------------------------------
// File type detection & validation
// ---------------------------------------------------------------------------

const ascii = (b: Uint8Array, from: number, len: number) =>
  String.fromCharCode(...Array.from(b.subarray(from, from + len)));

/**
 * Identify an image by its content. Returns the MIME type, or null.
 * HEIC/HEIF is recognised only so the user gets a helpful message.
 */
export async function detectImageType(file: Blob): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  if (head.length < 4) return null;
  if (head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF) return 'image/jpeg';
  if (head[0] === 0x89 && ascii(head, 1, 3) === 'PNG') return 'image/png';
  if (ascii(head, 0, 4) === 'GIF8') return 'image/gif';
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(head, 4, 4) === 'ftyp') {
    const brand = ascii(head, 8, 4);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  const text = new TextDecoder().decode(head).replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(text)) return 'image/svg+xml';
  return null;
}

/** @deprecated kept for existing callers — use detectImageType */
export async function validateFileContent(file: File): Promise<boolean> {
  const t = await detectImageType(file);
  return t !== null && ALLOWED_MIME_TYPES.has(t);
}

/**
 * Validate a file before upload. Returns the content-detected MIME type.
 * Throws MediaUploadError with a message the editor can act on.
 */
export async function validateImageFile(file: File): Promise<string> {
  if (file.size === 0) throw new MediaUploadError(`"${file.name}" is empty.`);
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MediaUploadError(`"${file.name}" is ${(file.size / 1_048_576).toFixed(1)} MB. The maximum is 10 MB — resize or compress it and try again.`);
  }
  const detected = await detectImageType(file);
  if (detected === 'image/heic') {
    throw new MediaUploadError(`"${file.name}" is a HEIC/HEIF photo, which web browsers cannot display. Export it as JPEG (on iPhone: Settings → Camera → Formats → Most Compatible) and upload again.`);
  }
  if (!detected || !ALLOWED_MIME_TYPES.has(detected)) {
    throw new MediaUploadError(`"${file.name}" is not a supported image. Upload ${ACCEPTED_LABEL} files (max 10 MB).`);
  }
  return detected;
}

// ---------------------------------------------------------------------------
// Storage error → clear message
// ---------------------------------------------------------------------------

/**
 * Explain a failed Storage request precisely. The raw server response is kept
 * at the end so the cause can always be diagnosed.
 */
export function describeStorageError(status: number, responseText: string): string {
  let raw = responseText?.slice(0, 300) ?? '';
  let isJson = false;
  try {
    const body = JSON.parse(responseText);
    raw = [body.error, body.message].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(': ') || raw;
    isJson = true;
  } catch { /* not JSON */ }
  const where = `bucket "${MEDIA_BUCKET}" at ${STORAGE_HOST}`;
  const detail = `(HTTP ${status}${raw ? `: ${raw}` : ''})`;
  const text = raw.toLowerCase();

  if (status === 0) {
    return `Could not reach Supabase Storage at ${STORAGE_HOST}. Check your internet connection. If it persists, VITE_SUPABASE_URL may be wrong in the deployment settings.`;
  }
  if (!isJson) {
    return `The upload address ${STORAGE_HOST} did not answer like Supabase Storage. VITE_SUPABASE_URL is probably set to the wrong address in the deployment settings. ${detail}`;
  }
  if (/bucket not found|no such bucket|nosuchbucket|container/.test(text) || (status === 404 && !/object/.test(text))) {
    return `Storage ${where} does not exist in this Supabase project. Run the storage migration (supabase/migrations/20261104000000_storage_article_media.sql), or if your images are in a bucket with another name, set VITE_SUPABASE_MEDIA_BUCKET to that name. ${detail}`;
  }
  if (/row-level security|row level security|unauthorized|not authorized|permission/.test(text) || status === 403) {
    return `Permission denied by the storage policies for ${where}. Only active CMS admins may upload — check your profile role and that the storage migration has been applied. ${detail}`;
  }
  if (/jwt|token|expired|invalid signature/.test(text) || status === 401) {
    return `Your session has expired or is invalid. Sign out, sign in again, then retry the upload. ${detail}`;
  }
  if (/size|too large|payload/.test(text) || status === 413) {
    return `The file is larger than the bucket allows (10 MB). Compress it and try again. ${detail}`;
  }
  if (/mime|content type|not supported|invalid_mime/.test(text) || status === 415) {
    return `The bucket does not accept this file type. Upload ${ACCEPTED_LABEL}. ${detail}`;
  }
  if (/already exists|duplicate/.test(text) || status === 409) {
    return `A file with the same storage path already exists. Please try again. ${detail}`;
  }
  return `Upload to ${where} failed. ${detail}`;
}

// ---------------------------------------------------------------------------
// Image preparation (resize + thumbnail) — runs in the browser
// ---------------------------------------------------------------------------

/**
 * Thumbnail object path for a stored image, or null for formats without one.
 * Deterministic, so no extra database column is needed:
 *   articles/2026/11/123-uuid.jpg → articles/2026/11/123-uuid.thumb.webp
 */
export function thumbPathFor(storagePath: string): string | null {
  return /\.(jpe?g|png|webp|avif)$/i.test(storagePath) ? storagePath.replace(/\.[^./]+$/, '.thumb.webp') : null;
}

async function decodeImage(file: Blob): Promise<ImageBitmap | null> {
  try {
    // from-image applies the camera's EXIF rotation (sideways phone photos)
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    return null;
  }
}

function drawScaled(bitmap: ImageBitmap, maxDim: number, opaque: boolean): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  if (opaque) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

interface PreparedImage {
  main:      Blob;
  mainType:  string;
  width:     number | null;
  height:    number | null;
  thumb:     Blob | null;
  thumbType: string | null;
}

/**
 * Scale large photos down to MAX_IMAGE_DIMENSION (re-encoding also strips
 * EXIF data such as GPS location) and build a THUMB_DIMENSION thumbnail.
 * Falls back to the untouched original whenever processing is not possible
 * or would not make the file smaller.
 */
async function prepareImage(file: File, mime: string): Promise<PreparedImage> {
  const original: PreparedImage = { main: file, mainType: mime, width: null, height: null, thumb: null, thumbType: null };
  if (mime === 'image/svg+xml' || mime === 'image/gif') {
    if (mime === 'image/gif') {
      try { const d = await getImageDimensions(file); original.width = d.width; original.height = d.height; } catch { /* non-fatal */ }
    }
    return original;
  }

  const bitmap = await decodeImage(file);
  if (!bitmap) {
    try { const d = await getImageDimensions(file); original.width = d.width; original.height = d.height; } catch { /* non-fatal */ }
    return original;
  }

  try {
    const result = { ...original, width: bitmap.width, height: bitmap.height };
    const longest = Math.max(bitmap.width, bitmap.height);

    // ── Main image ─────────────────────────────────────────────────────
    const tooBig = longest > MAX_IMAGE_DIMENSION || (file.size > 1_500_000 && mime !== 'image/png');
    if (RESIZABLE.has(mime) && tooBig) {
      const canvas = drawScaled(bitmap, MAX_IMAGE_DIMENSION, mime === 'image/jpeg');
      const blob = await toBlob(canvas, mime, mime === 'image/png' ? undefined : 0.85);
      if (blob && blob.type === mime && blob.size < file.size) {
        result.main = blob;
        result.width = canvas.width;
        result.height = canvas.height;
      }
    }

    // ── Thumbnail (WebP; JPEG where the browser cannot encode WebP) ────
    const thumbCanvas = drawScaled(bitmap, THUMB_DIMENSION, false);
    let thumb = await toBlob(thumbCanvas, 'image/webp', 0.78);
    if (!thumb || thumb.type !== 'image/webp') {
      thumb = await toBlob(drawScaled(bitmap, THUMB_DIMENSION, true), 'image/jpeg', 0.8);
    }
    if (thumb && thumb.size < result.main.size) {
      result.thumb = thumb;
      result.thumbType = thumb.type || 'image/jpeg';
    }
    return result;
  } catch {
    return original;
  } finally {
    bitmap.close();
  }
}

// ---------------------------------------------------------------------------
// Upload with progress + cancellation
// ---------------------------------------------------------------------------

/**
 * Upload one file to Storage. XMLHttpRequest is used because it reports upload
 * progress and can be aborted. The request is authorised as the signed-in user.
 */
async function uploadWithProgress(
  storagePath: string,
  file: Blob,
  contentType: string,
  onProgress?: UploadProgressFn,
  signal?: AbortSignal,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new MediaUploadError('You are not signed in. Sign in again, then upload.');
  if (signal?.aborted) throw new MediaUploadError('Upload cancelled.', { cancelled: true });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const done = () => signal?.removeEventListener('abort', onAbort);

    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(MEDIA_BUCKET)}/${encodedPath}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');                  // never overwrite an existing file
    xhr.setRequestHeader('cache-control', 'max-age=31536000');  // paths are unique → safe to cache

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new MediaUploadError(describeStorageError(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => { done(); reject(new MediaUploadError(describeStorageError(0, ''))); };
    xhr.onabort = () => { done(); reject(new MediaUploadError('Upload cancelled.', { cancelled: true })); };
    xhr.send(file);
  });
}

/** Remove uploaded objects (best effort) so failed uploads leave nothing behind. */
async function removeStorageObjects(paths: string[]): Promise<void> {
  try {
    const { error } = await supabaseStorage.media().remove(paths);
    if (error) console.warn(`[media] Could not remove ${paths.join(', ')}: ${error.message}`);
  } catch (e) {
    console.warn(`[media] Could not remove ${paths.join(', ')}:`, e);
  }
}

// ---------------------------------------------------------------------------
// Core upload function
// ---------------------------------------------------------------------------

/**
 * Validate, upload and register an image. Returns the created Media row.
 * On any failure after the file reached Storage, the file is removed again.
 */
export async function uploadMedia(opts: {
  file:        File;
  altText?:    string;
  caption?:    string;
  credit?:     string;
  folder?:     string;
  onProgress?: UploadProgressFn;
  signal?:     AbortSignal;
}): Promise<Media> {
  const { file, altText, caption, credit, folder = 'uploads', onProgress, signal } = opts;

  // ── Validate (type from content, size) ─────────────────────────────────
  const mime = await validateImageFile(file);

  // ── Resize large photos + build thumbnail (in the browser) ─────────────
  const prepared = await prepareImage(file, mime);

  // ── Unique storage path: <folder>/<yyyy>/<mm>/<timestamp>-<uuid>.<ext> ──
  const now = new Date();
  const storagePath = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/` +
    `${now.getTime()}-${crypto.randomUUID()}.${MIME_EXTENSIONS[prepared.mainType]}`;
  const thumbPath = prepared.thumb ? thumbPathFor(storagePath) : null;
  const uploaded: string[] = [];

  // ── Upload (image with progress, then its small thumbnail) ─────────────
  await uploadWithProgress(storagePath, prepared.main, prepared.mainType, onProgress, signal);
  uploaded.push(storagePath);

  // ── Register metadata ──────────────────────────────────────────────────
  try {
    if (thumbPath && prepared.thumb) {
      try {
        await uploadWithProgress(thumbPath, prepared.thumb, prepared.thumbType!, undefined, signal);
        uploaded.push(thumbPath);
      } catch (e) {
        if ((e as MediaUploadError).cancelled) throw e;
        console.warn('[media] Thumbnail upload failed; the original will be used in grids.', e);
      }
    }
    if (signal?.aborted) throw new MediaUploadError('Upload cancelled.', { cancelled: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new MediaUploadError('You were signed out during the upload. Sign in again and retry.');

    const insert: MediaInsert = {
      storage_path:      storagePath,
      original_filename: file.name,
      mime_type:         prepared.mainType,
      file_size_bytes:   prepared.main.size,
      width_px:          prepared.width,
      height_px:         prepared.height,
      alt_text:          altText?.trim() || null,
      caption:           caption?.trim() || null,
      credit:            credit?.trim()  || null,
      uploaded_by:       session.user.id,
    };

    const { data, error } = await supabase.from('media').insert(insert).select().single();
    if (error) {
      throw new MediaUploadError(error.code === '42501'
        ? `The image was uploaded but could not be registered: permission denied. Only active CMS admins can add media. (${error.message})`
        : `The image was uploaded but could not be registered in the media library: ${error.message}`);
    }
    invalidate('media:');
    return data as Media;
  } catch (e) {
    await removeStorageObjects(uploaded);   // failed upload cleanup (image + thumbnail)
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Metadata CRUD
// ---------------------------------------------------------------------------

/** Update mutable metadata fields on an existing media record. */
export async function updateMediaMetadata(id: string, payload: MediaUpdate): Promise<void> {
  const { data, error } = await supabase
    .from('media')
    .update(payload)
    .eq('id', id)
    .select('id');

  if (error) throw new Error(`Saving image details failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Saving image details failed: image not found or permission denied.');
  invalidate('media:');
}

/** Fetch a single media record by ID. */
export async function getMediaById(id: string): Promise<Media | null> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getMediaById: ${error.message}`);
  return data as Media | null;
}

/**
 * Delete a media record AND remove the file from Storage.
 * Admin-only (RLS on both the media table and storage.objects).
 * Use checkMediaReferences() first to warn the user if the image is in use.
 */
export async function deleteMedia(id: string): Promise<void> {
  // .select() makes the database confirm the row was really deleted; an
  // RLS-blocked delete otherwise "succeeds" with zero rows.
  const { data, error } = await supabase
    .from('media')
    .delete()
    .eq('id', id)
    .select('storage_path');

  if (error) throw new Error(`Delete failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Delete failed: the image was not found, or your account is not allowed to delete media (admins only).');
  }

  invalidate('media:');
  const thumb = thumbPathFor(data[0].storage_path);
  const { error: storageError } = await supabaseStorage.media().remove(thumb ? [data[0].storage_path, thumb] : [data[0].storage_path]);
  if (storageError) {
    console.warn(`[media] Storage object may be orphaned: ${data[0].storage_path} — ${storageError.message}`);
  }
}

// ---------------------------------------------------------------------------
// Library queries
// ---------------------------------------------------------------------------

/**
 * Fetch media records with search and date filtering.
 */
export async function getMediaLibrary(opts: {
  page?:       number;
  pageSize?:   number;
  search?:     string;
  dateFrom?:   string;  // ISO 8601 date (inclusive)
  dateTo?:     string;  // ISO 8601 date (inclusive)
} = {}): Promise<{ items: Media[]; total: number; totalPages: number }> {
  const { page = 1, pageSize = 30, search, dateFrom, dateTo } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('media')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('original_filename', `%${search}%`);
  }
  if (dateFrom) {
    query = query.gte('created_at', new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    // Add 1 day to make the filter inclusive of the entire end date
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('created_at', endDate.toISOString());
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getMediaLibrary: ${error.message}`);

  return {
    items:      (data ?? []) as Media[],
    total:      count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

// ---------------------------------------------------------------------------
// Reference checking
// ---------------------------------------------------------------------------

export interface MediaReference {
  article_id:    string;
  article_title:  string;
  article_status: string;
  reference_type: 'featured_image' | 'social_image' | 'inline_body';
}

/**
 * Check whether a media file is referenced by any articles.
 * Checks:
 *   - articles.featured_image_id
 *   - articles.social_image_id
 *   - article body HTML containing the media's storage_path
 *
 * Returns a list of references. If the list is non-empty, the admin should
 * be warned before deleting the media file.
 */
export async function checkMediaReferences(mediaId: string): Promise<MediaReference[]> {
  const refs: MediaReference[] = [];

  // Get the media record to find its storage_path
  const { data: media, error: mediaErr } = await supabase
    .from('media')
    .select('storage_path')
    .eq('id', mediaId)
    .single();

  if (mediaErr || !media) return refs;

  // Check featured_image_id references
  const { data: featured, error: featErr } = await supabase
    .from('articles')
    .select('id, title, status')
    .eq('featured_image_id', mediaId);

  if (!featErr && featured) {
    for (const a of featured) {
      refs.push({
        article_id: a.id, article_title: a.title, article_status: a.status,
        reference_type: 'featured_image',
      });
    }
  }

  // Check social_image_id references
  const { data: social, error: socErr } = await supabase
    .from('articles')
    .select('id, title, status')
    .eq('social_image_id', mediaId);

  if (!socErr && social) {
    for (const a of social) {
      refs.push({
        article_id: a.id, article_title: a.title, article_status: a.status,
        reference_type: 'social_image',
      });
    }
  }

  // Check inline body references (search for the storage_path in body HTML)
  const { data: inline, error: inlErr } = await supabase
    .from('articles')
    .select('id, title, status, body')
    .ilike('body', `%${media.storage_path}%`);

  if (!inlErr && inline) {
    for (const a of inline) {
      // Avoid duplicates already counted as featured/social
      const alreadyCounted = refs.some((r) => r.article_id === a.id);
      if (!alreadyCounted) {
        refs.push({
          article_id: a.id, article_title: a.title, article_status: a.status,
          reference_type: 'inline_body',
        });
      }
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Resolve a storage_path to its public URL (the bucket is public-read). */
export function getMediaUrl(storagePath: string): string {
  return supabaseStorage.getPublicUrl(storagePath);
}

/**
 * Supabase image transformations (/render/image/…) are a paid add-on, so they
 * are opt-in via VITE_SUPABASE_IMAGE_TRANSFORMS=true. Without them, width
 * parameters on the plain public URL are ignored, so the original URL is used.
 */
const IMAGE_TRANSFORMS = (import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMS as string | undefined) === 'true';
const isUntransformable = (p: string) => /\.(svgz?|gif)$/i.test(p);

/**
 * URL for a small preview (grids, picker, article cards): the 640 px
 * thumbnail stored next to the image. Images uploaded before thumbnails
 * existed have none — render them with <MediaThumb>, which falls back to the
 * original URL automatically.
 */
export function getMediaThumbUrl(storagePath: string): string {
  if (IMAGE_TRANSFORMS && !isUntransformable(storagePath)) return getResponsiveMediaUrl(storagePath, { width: 640, quality: 70 });
  const thumb = thumbPathFor(storagePath);
  return thumb ? supabaseStorage.getPublicUrl(thumb) : getMediaUrl(storagePath);
}

/** Public URL for an image, resized when transformations are enabled. */
export function getResponsiveMediaUrl(
  storagePath: string,
  opts: { width?: number; quality?: number } = {}
): string {
  const baseUrl = getMediaUrl(storagePath);
  if (!IMAGE_TRANSFORMS || isUntransformable(storagePath) || (!opts.width && !opts.quality)) return baseUrl;

  const params = new URLSearchParams();
  if (opts.width)   params.set('width',   String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  return `${baseUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?${params.toString()}`;
}

/** srcset at 400/800/1200/1600w, or undefined when transformations are off. */
export function getMediaSrcset(storagePath: string): string | undefined {
  if (!IMAGE_TRANSFORMS || isUntransformable(storagePath)) return undefined;
  return [400, 800, 1200, 1600]
    .map((w) => `${getResponsiveMediaUrl(storagePath, { width: w, quality: 80 })} ${w}w`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image dimensions')); };
    img.src = url;
  });
}

export { MEDIA_BUCKET, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, ACCEPTED_LABEL };
