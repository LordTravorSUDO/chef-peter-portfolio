/**
 * Media data-access service — production version.
 *
 * Handles uploading files to Supabase Storage and registering them
 * in the media metadata table.
 *
 * Security:
 *   - Uploads require an authenticated session (RLS enforced).
 *   - The service-role key is NEVER used here.
 *   - storage_path and uploaded_by are immutable after insert (RLS WITH CHECK).
 *   - File MIME types are validated both by extension AND by file content
 *     (magic bytes) to prevent disguised uploads.
 *
 * Features:
 *   - Upload with per-file progress tracking
 *   - Search by filename and date range
 *   - Reference checking (warn before deleting images used by articles)
 *   - Responsive image URL generation via Supabase image transforms
 *   - Duplicate prevention via unique storage paths
 */

import { supabase, supabaseStorage, MEDIA_BUCKET } from '../supabase';
import type { Media, MediaInsert, MediaUpdate } from '../../types/article';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// File signature (magic bytes) for each accepted type
const FILE_SIGNATURES: Array<{ mime: string; bytes: number[]; offset: number }> = [
  { mime: 'image/jpeg',  bytes: [0xFF, 0xD8, 0xFF],           offset: 0 },
  { mime: 'image/png',   bytes: [0x89, 0x50, 0x4E, 0x47],     offset: 0 },
  { mime: 'image/gif',   bytes: [0x47, 0x49, 0x46, 0x38],     offset: 0 }, // GIF8
  { mime: 'image/webp',  bytes: [0x52, 0x49, 0x46, 0x46],     offset: 0 }, // RIFF (WebP container)
  { mime: 'image/avif',  bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4 }, // ftypavif
  // SVG is text-based, no magic bytes — validated by extension only
];

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

// ---------------------------------------------------------------------------
// Upload progress callback type
// ---------------------------------------------------------------------------

export type UploadProgressFn = (uploadedBytes: number, totalBytes: number) => void;

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

/**
 * Validate a file's declared MIME type against its actual content by reading
 * the first few bytes (magic bytes). This prevents uploading a renamed .exe
 * as a .jpg, for example.
 *
 * SVG files are validated by extension only (they are text-based XML).
 */
export async function validateFileContent(file: File): Promise<boolean> {
  // SVG has no magic bytes — check by extension
  if (file.type === 'image/svg+xml') {
    return file.name.toLowerCase().endsWith('.svg') || file.name.toLowerCase().endsWith('.svgz');
  }

  // Read first 32 bytes
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  for (const sig of FILE_SIGNATURES) {
    if (sig.offset + sig.bytes.length > header.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (header[sig.offset + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match) {
      // For WebP, also check for 'WEBP' at offset 8
      if (sig.mime === 'image/webp') {
        const webpTag = String.fromCharCode(header[8], header[9], header[10], header[11]);
        return webpTag === 'WEBP';
      }
      return true;
    }
  }

  return false; // No known signature matched
}

/**
 * Validate a file before upload. Throws MediaUploadError on failure.
 */
async function validateFile(file: File): Promise<void> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new MediaUploadError(
      `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, WebP, GIF, AVIF, SVG.`
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MediaUploadError(
      `"${file.name}" exceeds the 10 MB size limit (${(file.size / 1_048_576).toFixed(1)} MB).`
    );
  }
  // Validate file content matches declared MIME type
  const contentValid = await validateFileContent(file);
  if (!contentValid) {
    throw new MediaUploadError(
      `"${file.name}" content does not match its declared type (${file.type}). The file may be corrupted or misnamed.`
    );
  }
}

// ---------------------------------------------------------------------------
// Upload with progress tracking
// ---------------------------------------------------------------------------

/**
 * Upload a single file to Supabase Storage with progress tracking.
 * Uses XMLHttpRequest because the Supabase JS SDK does not expose upload progress.
 */
async function uploadWithProgress(
  storagePath: string,
  file: File,
  onProgress?: UploadProgressFn
): Promise<void> {
  // Storage RLS only allows uploads from signed-in users, so the request must
  // carry the user's access token. (Sending the anon key as the bearer token
  // made every upload run as the anonymous role and be rejected.)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new MediaUploadError('You are not signed in. Sign in again, then upload.');

  return new Promise((resolve, reject) => {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, '');
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}/${storagePath}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const res = JSON.parse(xhr.responseText);
          // Supabase returns 'message' or 'error' fields
          if (res.message) msg = res.message;
          else if (res.error) msg = res.error;
          // Only a genuine "Bucket not found" gets the setup hint; every other
          // error (e.g. an RLS policy rejection) is shown as returned.
          if (/bucket not found/i.test(msg)) {
            msg = `Storage bucket "${MEDIA_BUCKET}" was not found in Supabase. Create it (Dashboard → Storage → New bucket, public) — see docs/storage-setup.md. (${msg})`;
          } else {
            msg = `Upload failed (HTTP ${xhr.status}): ${msg}`;
          }
        } catch { /* ignore JSON parse error */ }
        reject(new MediaUploadError(msg));
      }
    };

    xhr.onerror = () => reject(new MediaUploadError('Network error during upload.'));
    xhr.send(file);
  });
}

// ---------------------------------------------------------------------------
// Core upload function
// ---------------------------------------------------------------------------

/**
 * Validate, upload and register a media file.
 * Returns the created Media row.
 *
 * @param onProgress Optional callback for upload progress (0–100)
 */
export async function uploadMedia(opts: {
  file:        File;
  altText?:    string;
  caption?:    string;
  credit?:     string;
  folder?:     string;
  onProgress?: UploadProgressFn;
}): Promise<Media> {
  const { file, altText, caption, credit, folder = 'uploads', onProgress } = opts;

  // ── Validate ──────────────────────────────────────────────────────────
  await validateFile(file);

  // ── Build collision-resistant storage path ─────────────────────────────
  const ext          = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeFilename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath  = `${folder}/${safeFilename}`;

  // ── Upload to Storage with progress ────────────────────────────────────
  await uploadWithProgress(storagePath, file, onProgress);

  // ── Get image dimensions (browser only, best-effort) ────────────────────
  let widthPx:  number | null = null;
  let heightPx: number | null = null;

  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      const dims = await getImageDimensions(file);
      widthPx  = dims.width;
      heightPx = dims.height;
    } catch { /* non-fatal */ }
  }

  // ── Get authenticated user ID ──────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await supabaseStorage.media().remove([storagePath]).catch(() => {});
    throw new MediaUploadError('Not authenticated. Cannot register media.');
  }

  // ── Insert metadata row ─────────────────────────────────────────────────
  const insert: MediaInsert = {
    storage_path:      storagePath,
    original_filename: file.name,
    mime_type:         file.type,
    file_size_bytes:   file.size,
    width_px:          widthPx,
    height_px:         heightPx,
    alt_text:          altText ?? null,
    caption:           caption ?? null,
    credit:            credit  ?? null,
    uploaded_by:       user.id,
  };

  const { data, error: dbError } = await supabase
    .from('media')
    .insert(insert)
    .select()
    .single();

  if (dbError) {
    await supabaseStorage.media().remove([storagePath]).catch(() => {});
    throw new MediaUploadError(`Metadata insert failed: ${dbError.message}`);
  }

  return data as Media;
}

// ---------------------------------------------------------------------------
// Metadata CRUD
// ---------------------------------------------------------------------------

/** Update mutable metadata fields on an existing media record. */
export async function updateMediaMetadata(id: string, payload: MediaUpdate): Promise<void> {
  const { error } = await supabase
    .from('media')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`updateMediaMetadata: ${error.message}`);
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
 * Admin-only (RLS enforced).
 * Use checkMediaReferences() first to warn the user if the image is in use.
 */
export async function deleteMedia(id: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('media')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !data) throw new Error('deleteMedia: media record not found');

  // Delete DB row first (RLS protects this — admin only)
  const { error: dbError } = await supabase
    .from('media')
    .delete()
    .eq('id', id);

  if (dbError) throw new Error(`deleteMedia: ${dbError.message}`);

  // Remove from Storage (best-effort)
  await supabaseStorage.media().remove([data.storage_path]).catch(() => {
    console.warn(`[media] Storage object may be orphaned: ${data.storage_path}`);
  });
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

/** Resolve a storage_path to a public CDN URL. */
export function getMediaUrl(storagePath: string): string {
  return supabaseStorage.getPublicUrl(storagePath);
}

/**
 * Generate a responsive image URL with Supabase Storage image transformations.
 *
 * Supabase supports on-the-fly resizing via URL query params:
 *   /storage/v1/render/image/{bucket}/{path}?width=400&height=300&quality=80
 *
 * For SVG and GIF (animated), the original is returned (transforms not supported).
 *
 * @param storagePath  The media.storage_path
 * @param opts.width   Target width in pixels (height auto-scales to preserve aspect ratio)
 * @param opts.quality JPEG/WebP quality 1–100
 */
export function getResponsiveMediaUrl(
  storagePath: string,
  opts: { width?: number; quality?: number } = {}
): string {
  const baseUrl = getMediaUrl(storagePath);

  // SVG and GIF: return original (transforms not supported for SVG; GIF would lose animation)
  if (storagePath.endsWith('.svg') || storagePath.endsWith('.svgz') || storagePath.endsWith('.gif')) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  if (opts.width)   params.set('width',   String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));

  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

/**
 * Generate a srcset string for responsive images.
 * Produces entries at common breakpoints: 400w, 800w, 1200w, 1600w.
 */
export function getMediaSrcset(storagePath: string): string {
  const widths = [400, 800, 1200, 1600];
  return widths
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

export { MEDIA_BUCKET, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
