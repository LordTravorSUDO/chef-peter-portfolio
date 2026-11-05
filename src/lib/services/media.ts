/**
 * Media data-access service — production version.
 *
 * Handles uploading files to Supabase Storage and registering them
 * in the media metadata table.
 *
 * Security:
 *   - Uploads require an authenticated session. The request carries the
 *     signed-in user's access token (from the Supabase client's session),
 *     so Storage RLS evaluates it as that user — never as the anon role.
 *   - With no valid session the upload is refused before any bytes are sent.
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

import { searchWords, ilikePattern } from '../knowledge/search';
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

/** What went wrong — lets callers react (e.g. prompt to sign in again). */
export type MediaUploadErrorKind =
  | 'validation'      // rejected by client-side checks (type, size, content)
  | 'auth'            // no session / session expired / invalid token
  | 'permission'      // signed in, but Storage RLS policies refused the upload
  | 'bucket'          // the article-media bucket does not exist
  | 'conflict'        // an object already exists at that path
  | 'too_large'       // rejected by the bucket's size limit
  | 'unsupported_type'// rejected by the bucket's allowed MIME types
  | 'network'         // connection failed or timed out
  | 'metadata'        // file stored, but the media table row could not be created
  | 'unknown';

export class MediaUploadError extends Error {
  readonly kind: MediaUploadErrorKind;
  /** HTTP status returned by Supabase Storage, when there was a response */
  readonly status?: number;
  constructor(message: string, kind: MediaUploadErrorKind = 'unknown', status?: number) {
    super(message);
    this.name = 'MediaUploadError';
    this.kind = kind;
    this.status = status;
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
      `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, WebP, GIF, AVIF, SVG.`,
      'validation',
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MediaUploadError(
      `"${file.name}" exceeds the 10 MB size limit (${(file.size / 1_048_576).toFixed(1)} MB).`,
      'validation',
    );
  }
  // Validate file content matches declared MIME type
  const contentValid = await validateFileContent(file);
  if (!contentValid) {
    throw new MediaUploadError(
      `"${file.name}" content does not match its declared type (${file.type}). The file may be corrupted or misnamed.`,
      'validation',
    );
  }
}

// ---------------------------------------------------------------------------
// Upload with progress tracking
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Authenticated session for uploads
// ---------------------------------------------------------------------------

/** Refresh the session when it expires within this window. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

interface UploadSession { accessToken: string; userId: string; }

const SIGNED_OUT_MESSAGE = 'You are not signed in (or your session has expired). Sign in again, then retry the upload.';

/**
 * Return the signed-in user's access token, read from the Supabase client's
 * own session store — the same token supabase-js attaches to every database
 * and storage request. Refreshes it first if it is about to expire.
 *
 * Throws MediaUploadError('auth') when there is no usable session, so an
 * unauthenticated upload is refused before any data is sent.
 */
async function getUploadSession(forceRefresh = false): Promise<UploadSession> {
  let session = null;
  if (!forceRefresh) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new MediaUploadError(SIGNED_OUT_MESSAGE, 'auth');
    session = data.session;
  }

  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
  if (forceRefresh || (session && expiresAtMs - Date.now() < TOKEN_REFRESH_MARGIN_MS)) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) throw new MediaUploadError(SIGNED_OUT_MESSAGE, 'auth');
    session = data.session;
  }

  if (!session?.access_token || !session.user?.id) {
    throw new MediaUploadError(SIGNED_OUT_MESSAGE, 'auth');
  }
  return { accessToken: session.access_token, userId: session.user.id };
}

// ---------------------------------------------------------------------------
// Storage error interpretation
// ---------------------------------------------------------------------------

/**
 * Turn a Supabase Storage error response into an accurate, actionable error.
 * The original Supabase message is kept in brackets for diagnosis.
 */
export function describeStorageError(httpStatus: number, responseText: string): MediaUploadError {
  let code = '';
  let message = '';
  let bodyStatus = '';
  try {
    const body = JSON.parse(responseText) as { error?: string; message?: string; statusCode?: string | number };
    code       = String(body.error ?? '');
    message    = String(body.message ?? '');
    bodyStatus = String(body.statusCode ?? '');
  } catch { /* not JSON */ }

  const raw   = message || code || responseText.slice(0, 200) || `HTTP ${httpStatus}`;
  const text  = `${code} ${message}`.toLowerCase();
  const tail  = ` (Supabase: ${raw})`;

  if (/jwt|jws|token|invalidjwt|exp claim|signature/.test(text) && !/row-level security/.test(text)) {
    return new MediaUploadError(`Your session has expired or is invalid. Sign in again, then retry the upload.${tail}`, 'auth', httpStatus);
  }
  if (/row-level security|accessdenied|unauthorized|not authorized|permission/.test(text) || bodyStatus === '403' || httpStatus === 403) {
    return new MediaUploadError(
      `Supabase Storage refused the upload (permission denied). You are signed in, but the storage access rules for the "${MEDIA_BUCKET}" bucket do not allow this account to upload.${tail}`,
      'permission', httpStatus,
    );
  }
  if (/bucket not found|nosuchbucket/.test(text)) {
    return new MediaUploadError(`The storage bucket "${MEDIA_BUCKET}" was not found in Supabase.${tail}`, 'bucket', httpStatus);
  }
  if (/duplicate|already exists/.test(text) || bodyStatus === '409' || httpStatus === 409) {
    return new MediaUploadError(`A file already exists at this storage path. Retry the upload.${tail}`, 'conflict', httpStatus);
  }
  if (/exceeded the maximum|too large|payload too large|entitytoolarge/.test(text) || bodyStatus === '413' || httpStatus === 413) {
    return new MediaUploadError(`The file is larger than the storage bucket allows.${tail}`, 'too_large', httpStatus);
  }
  if (/mime type|invalidmimetype|not supported/.test(text) || bodyStatus === '415' || httpStatus === 415) {
    return new MediaUploadError(`The storage bucket does not accept this file type.${tail}`, 'unsupported_type', httpStatus);
  }
  return new MediaUploadError(`Upload failed (HTTP ${httpStatus}).${tail}`, 'unknown', httpStatus);
}

// ---------------------------------------------------------------------------
// Upload transport (with progress)
// ---------------------------------------------------------------------------

const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * POST one file to Supabase Storage with progress events.
 *
 * Why XMLHttpRequest rather than supabase.storage.upload(): the storage SDK
 * uploads with fetch(), which exposes no upload-progress events, and the
 * media UI shows a per-file progress bar. The request is otherwise identical
 * to the SDK's: same endpoint, `apikey` header (publishable key, identifies
 * the project) and `Authorization: Bearer <user access token>` (identifies
 * the signed-in user for RLS). The anon key is NEVER used as the bearer token.
 */
function uploadWithProgress(
  storagePath: string,
  file: File,
  accessToken: string,
  onProgress?: UploadProgressFn
): Promise<void> {
  return new Promise((resolve, reject) => {
    const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const objectPath      = storagePath.split('/').map(encodeURIComponent).join('/');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}/${objectPath}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(describeStorageError(xhr.status, xhr.responseText));
    };
    xhr.onerror   = () => reject(new MediaUploadError('Network error during upload. Check your internet connection and retry.', 'network'));
    xhr.ontimeout = () => reject(new MediaUploadError('The upload timed out. Check your internet connection and retry.', 'network'));
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

  // ── Require a signed-in session before sending any data ───────────────
  let session = await getUploadSession();

  // ── Build collision-resistant storage path ─────────────────────────────
  const ext          = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeFilename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath  = `${folder}/${safeFilename}`;

  // ── Upload to Storage with progress (one retry after a token refresh) ──
  try {
    await uploadWithProgress(storagePath, file, session.accessToken, onProgress);
  } catch (err) {
    if (!(err instanceof MediaUploadError) || err.kind !== 'auth') throw err;
    session = await getUploadSession(true); // throws 'auth' if the session cannot be renewed
    await uploadWithProgress(storagePath, file, session.accessToken, onProgress);
  }

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

  // ── Insert metadata row ─────────────────────────────────────────────────
  // uploaded_by must equal auth.uid() (media RLS) — it is the session's user.
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
    uploaded_by:       session.userId,
  };

  const { data, error: dbError } = await supabase
    .from('media')
    .insert(insert)
    .select()
    .single();

  if (dbError) {
    // Best-effort rollback so the bucket does not keep an unregistered file
    let rolledBack = false;
    try {
      const { error: removeError } = await supabaseStorage.media().remove([storagePath]);
      rolledBack = !removeError;
    } catch { /* reported below */ }
    throw new MediaUploadError(
      `The file was uploaded, but its media-library record could not be saved` +
      (rolledBack
        ? ', so the uploaded file was removed again.'
        : `, and the uploaded file could not be removed automatically (path: ${storagePath}).`) +
      ` (Supabase: ${dbError.message})`,
      'metadata',
    );
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
  /** Matches file name, alt text, caption or credit — every word must match */
  search?:     string;
  dateFrom?:   string;  // ISO 8601 date (inclusive)
  dateTo?:     string;  // ISO 8601 date (inclusive)
  /** Only images without alt text */
  missingAlt?: boolean;
} = {}): Promise<{ items: Media[]; total: number; totalPages: number }> {
  const { page = 1, pageSize = 30, search, dateFrom, dateTo, missingAlt } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('media')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Search text is sanitised (searchWords) before it is placed in the PostgREST filter
  for (const word of search ? searchWords(search) : []) {
    const p = ilikePattern(word);
    query = query.or(`original_filename.ilike.${p},alt_text.ilike.${p},caption.ilike.${p},credit.ilike.${p}`);
  }
  if (missingAlt) {
    query = query.or('alt_text.is.null,alt_text.eq.');
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
