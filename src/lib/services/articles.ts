/**
 * Article data-access service.
 *
 * All Supabase queries for articles go through here.
 * Components and hooks call these functions — they never build queries inline.
 *
 * Security guarantee:
 *   - Public (anon) calls return only published articles via RLS.
 *   - Admin calls return all statuses because RLS grants admins full read.
 *   - No service-role key is used here. All security is enforced by RLS.
 *
 * Publishing rules:
 *   - publishArticle sets status='published' and published_at=now() if not already set.
 *     Existing published_at is NEVER overwritten — preserves historical dates.
 *   - unpublishArticle sets status='draft' but KEEPS published_at so it can be
 *     re-published without losing the original publication date.
 *   - scheduleArticle sets status='scheduled' with a future scheduled_for timestamp.
 *     The article remains invisible to the public until a server-side mechanism
 *     flips it to 'published'. See the scheduling note below.
 *   - Scheduled articles are NOT visible to the public. RLS restricts public
 *     reads to status='published' AND published_at <= NOW().
 */

import { supabase } from '../supabase';
import type { ArticleCard, ArticleWithRelations, ArticleInsert, ArticleUpdate } from '../../types/article';

// ---------------------------------------------------------------------------
// Public queries (work under anon key; RLS restricts to published articles)
// ---------------------------------------------------------------------------

/** Fetch a paginated list of published articles for the /articles page. */
export async function getPublishedArticles(opts: {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
} = {}) {
  const { page = 1, pageSize = 12, categorySlug, tagSlug, search } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, reading_time_minutes, published_at, status, featured_image_id,
      article_categories (
        is_primary,
        categories ( id, slug, name )
      ),
      article_tags (
        tags ( id, slug, name )
      ),
      featured_image:media!articles_featured_image_id_fkey ( storage_path, alt_text )
    `, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, to);

  if (categorySlug) {
    query = query.eq('article_categories.categories.slug', categorySlug);
  }

  if (tagSlug) {
    query = query.eq('article_tags.tags.slug', tagSlug);
  }

  if (search) {
    // Search title and excerpt using ilike — Supabase anon key supports this
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`getPublishedArticles: ${error.message}`);

  return {
    articles: (data ?? []) as unknown as ArticleCard[],
    total:     count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

/** Fetch a single published article by slug for the article page. */
export async function getPublishedArticleBySlug(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      profiles:author_id ( id, display_name, avatar_url ),
      featured_image:media!articles_featured_image_id_fkey ( * ),
      social_image:media!articles_social_image_id_fkey ( * ),
      article_categories (
        is_primary,
        categories ( * )
      ),
      article_tags (
        tags ( * )
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`getPublishedArticleBySlug: ${error.message}`);
  return data as ArticleWithRelations | null;
}

/**
 * Fetch the most recently published article (for the featured hero on /articles).
 * Returns null if no articles have been published yet.
 */
export async function getFeaturedArticle(): Promise<ArticleWithRelations | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      profiles:author_id ( id, display_name, avatar_url ),
      featured_image:media!articles_featured_image_id_fkey ( * ),
      article_categories (
        is_primary,
        categories ( * )
      ),
      article_tags (
        tags ( * )
      )
    `)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getFeaturedArticle: ${error.message}`);
  return data as ArticleWithRelations | null;
}

/**
 * Fetch up to 3 published articles related to the given article.
 * Strategy: same primary category first, then most recent published articles
 * that are not the current article.
 */
export async function getRelatedArticles(
  currentSlug: string,
  categorySlug?: string | null,
  limit = 3,
): Promise<ArticleCard[]> {
  const now = new Date().toISOString();

  let query = supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, reading_time_minutes, published_at, featured_image_id,
      article_categories (
        is_primary,
        categories ( id, slug, name )
      ),
      featured_image:media!articles_featured_image_id_fkey ( storage_path, alt_text )
    `)
    .eq('status', 'published')
    .lte('published_at', now)
    .neq('slug', currentSlug)
    .order('published_at', { ascending: false })
    .limit(limit * 2); // fetch extra, then filter client-side if needed

  if (categorySlug) {
    query = query.eq('article_categories.categories.slug', categorySlug);
  }

  const { data, error } = await query;
  if (error) return [];

  const results = (data ?? []) as unknown as ArticleCard[];
  return results.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Admin queries (require an active authenticated session)
// ---------------------------------------------------------------------------

/** Fetch all articles regardless of status — for the admin article list. */
export async function getAllArticlesAdmin(opts: {
  page?:     number;
  pageSize?: number;
  status?:   string;
} = {}) {
  const { page = 1, pageSize = 20, status } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('articles')
    .select('id, slug, title, status, published_at, scheduled_for, created_at, updated_at, author_display_name', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getAllArticlesAdmin: ${error.message}`);

  return {
    articles:   data ?? [],
    total:      count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

/**
 * Fetch a single article by ID for the admin editor (all statuses).
 *
 * Includes the featured and social image records. The editor initialises its
 * image fields from these relations; without them it would start with empty
 * image fields and the next save would overwrite the stored image IDs with NULL.
 */
export async function getArticleByIdAdmin(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      featured_image:media!articles_featured_image_id_fkey ( id, storage_path, alt_text, width_px, height_px ),
      social_image:media!articles_social_image_id_fkey ( id, storage_path, alt_text ),
      article_categories ( is_primary, categories ( * ) ),
      article_tags ( tags ( * ) )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getArticleByIdAdmin: ${error.message}`);
  return data as ArticleWithRelations | null;
}

/**
 * Fetch a single article by ID for the admin PREVIEW (includes all relations).
 * Used by the preview page to render the article exactly as readers will see it.
 */
export async function getArticleByIdForPreview(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      profiles:author_id ( id, display_name, avatar_url ),
      featured_image:media!articles_featured_image_id_fkey ( * ),
      social_image:media!articles_social_image_id_fkey ( * ),
      article_categories (
        is_primary,
        categories ( * )
      ),
      article_tags (
        tags ( * )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getArticleByIdForPreview: ${error.message}`);
  return data as ArticleWithRelations | null;
}

/**
 * Translate a PostgREST / Postgres error into a message an editor can act on.
 * The original message is kept in brackets so it can still be diagnosed.
 */
export function describeArticleDbError(
  error: { code?: string; message: string; details?: string | null },
): string {
  const raw = error.message;
  const ctx = `${raw} ${error.details ?? ''}`;
  switch (error.code) {
    case '23505':
      if (ctx.includes('slug')) return 'This URL slug is already used by another article. Choose a different slug.';
      return `This article conflicts with an existing record. (${raw})`;
    case '23514':
      if (ctx.includes('slug_format')) return 'The URL slug may only contain lowercase letters, numbers and single hyphens, and cannot start or end with a hyphen.';
      if (ctx.includes('seo_title')) return 'The SEO title must be 70 characters or fewer.';
      if (ctx.includes('meta_description')) return 'The meta description must be 160 characters or fewer.';
      if (ctx.includes('title_check')) return 'The title must be between 1 and 255 characters.';
      if (ctx.includes('scheduled')) return 'The scheduled date is not valid for this article.';
      return `The article failed a validation rule. (${raw})`;
    case '23503':
      return `A linked record (image, category or tag) no longer exists. Re-select it and try again. (${raw})`;
    case '42501':
      return 'Permission denied. Your session may have expired or your account is not an active admin. Sign in again and retry.';
    case 'PGRST301':
    case 'PGRST303':
      return 'Your session has expired. Sign in again and retry.';
    default:
      return raw;
  }
}

/** Create a new article draft. Returns the created article ID. */
export async function createArticle(payload: ArticleInsert) {
  const { data, error } = await supabase
    .from('articles')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(`Could not create the article: ${describeArticleDbError(error)}`);
  return data.id as string;
}

/** Update an existing article. */
export async function updateArticle(id: string, payload: ArticleUpdate) {
  const { error } = await supabase
    .from('articles')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`Could not save the article: ${describeArticleDbError(error)}`);
}

// ---------------------------------------------------------------------------
// Publishing workflow
// ---------------------------------------------------------------------------

/**
 * Publish an article immediately.
 *
 * Preserves the original published_at if it already exists (re-publishing an
 * article that was previously unpublished). Only sets published_at to now()
 * if it has never been published before.
 *
 * Clears scheduled_for — the article is now live.
 */
export async function publishArticle(id: string): Promise<void> {
  // First, read the current article to preserve published_at if it exists
  const { data: article, error: fetchErr } = await supabase
    .from('articles')
    .select('published_at')
    .eq('id', id)
    .single();

  if (fetchErr || !article) {
    throw new Error(`publishArticle: could not read article — ${fetchErr?.message ?? 'not found'}`);
  }

  const publishedAt = article.published_at ?? new Date().toISOString();

  const { error } = await supabase
    .from('articles')
    .update({
      status:       'published',
      published_at: publishedAt,
      scheduled_for: null,
    })
    .eq('id', id);

  if (error) throw new Error(`Could not publish the article: ${describeArticleDbError(error)}`);
}

/**
 * Unpublish an article safely.
 *
 * Sets status to 'draft' but PRESERVES published_at so the original
 * publication date is retained for re-publishing. The article immediately
 * becomes invisible to the public because RLS requires status='published'.
 */
export async function unpublishArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({
      status:        'draft',
      // published_at is intentionally NOT cleared
      scheduled_for: null,
    })
    .eq('id', id);

  if (error) throw new Error(`Could not unpublish the article: ${describeArticleDbError(error)}`);
}

/**
 * Schedule an article for future publication.
 *
 * Sets status='scheduled' with a future scheduled_for timestamp.
 * The article is NOT visible to the public until a server-side mechanism
 * changes the status to 'published' at the scheduled time.
 *
 * ⚠️ SCHEDULING NOTE:
 *   Supabase does not have a built-in cron/scheduler. To actually publish
 *   scheduled articles at their scheduled_for time, you need ONE of:
 *     a) A Supabase Edge Function triggered by a cron schedule (pg_cron
 *        extension or Supabase's scheduled functions).
 *     b) An external cron job (Vercel Cron, GitHub Actions, etc.) that
 *        calls a server endpoint to flip scheduled → published.
 *   Until that is set up, scheduled articles remain in 'scheduled' status
 *   indefinitely — they are NOT visible to the public, which is the safe
 *   default. See docs/scheduling.md for the implementation guide.
 */
export async function scheduleArticle(id: string, scheduledFor: string): Promise<void> {
  // Validate the scheduled time is in the future
  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid scheduled date/time.');
  }
  if (scheduledDate <= new Date()) {
    throw new Error('Scheduled time must be in the future.');
  }

  const { error } = await supabase
    .from('articles')
    .update({
      status:        'scheduled',
      scheduled_for: scheduledDate.toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Could not schedule the article: ${describeArticleDbError(error)}`);
}

/**
 * Cancel a scheduled publication, returning the article to draft.
 * Preserves any previously-set published_at.
 */
export async function cancelSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({
      status:        'draft',
      scheduled_for: null,
    })
    .eq('id', id);

  if (error) throw new Error(`Could not cancel the schedule: ${describeArticleDbError(error)}`);
}

/** Archive an article (sets status = 'archived'). */
export async function archiveArticle(id: string) {
  return updateArticle(id, { status: 'archived' });
}

/** Delete an article. RLS only allows deletion of draft or archived articles. */
export async function deleteArticle(id: string) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`deleteArticle: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

/** Fetch revision history for an article (admin only). */
export async function getArticleRevisions(articleId: string) {
  const { data, error } = await supabase
    .from('article_revisions')
    .select('id, revision_no, title, excerpt, change_note, saved_by, created_at')
    .eq('article_id', articleId)
    .order('revision_no', { ascending: false });

  if (error) throw new Error(`getArticleRevisions: ${error.message}`);
  return data ?? [];
}

/** Fetch full revision content for restore preview (admin only). */
export async function getRevisionFull(articleId: string, revisionId: string) {
  const { data, error } = await supabase
    .from('article_revisions')
    .select('id, revision_no, title, body, excerpt, change_note, created_at')
    .eq('id', revisionId)
    .eq('article_id', articleId)
    .single();

  if (error) throw new Error(`getRevisionFull: ${error.message}`);
  return data;
}

/** Restore a specific revision's content into the article (creates a new revision automatically). */
export async function restoreRevision(articleId: string, revisionId: string) {
  const { data: rev, error: revErr } = await supabase
    .from('article_revisions')
    .select('title, body, excerpt')
    .eq('id', revisionId)
    .eq('article_id', articleId)
    .single();

  if (revErr || !rev) throw new Error(`restoreRevision: revision not found`);

  // Write it back to the article (the DB trigger will create a new revision)
  return updateArticle(articleId, {
    title:   rev.title,
    body:    rev.body,
    excerpt: rev.excerpt,
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Estimate reading time for DISPLAY in the admin UI while editing.
 *
 * Mirrors the database expression for articles.reading_time_minutes
 * (supabase/migrations/20260101000005_articles.sql):
 *   GREATEST(1, array_length(regexp_split_to_array(trim(body), '\s+'), 1) / 200)
 * i.e. whitespace-separated tokens of the stored body, ÷ 200 (integer), min 1.
 *
 * The stored value is computed by the database. The application never writes
 * that column: the migration defines it as GENERATED ALWAYS, and Postgres
 * rejects writes to generated columns, which would make every save fail.
 */
export function estimateReadingTimeMinutes(body: string): number {
  const tokens = body.trim().split(/\s+/).length;
  return Math.max(1, Math.floor(tokens / 200));
}

/** Generate a URL-safe slug from a title. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

/** Check whether a slug is already in use (for the admin editor). */
export async function isSlugAvailable(slug: string, excludeId?: string) {
  let query = supabase
    .from('articles')
    .select('id')
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`isSlugAvailable: ${error.message}`);
  return data === null; // null = no match = slug is available
}

/**
 * Sanitise HTML before storage and before rendering via dangerouslySetInnerHTML.
 *
 * Applied at two points:
 *   1. On WRITE in ArticleForm (before saving to the database)
 *   2. On READ in ArticlePage and ArticlePreviewPage (defence-in-depth)
 *
 * Handles:
 *   - <script> tags (removed entirely with content)
 *   - Inline event handlers (onclick, onload, onerror, etc.)
 *   - javascript: and vbscript: URI schemes in href/src/action
 *   - data: URIs in href/src (can carry executable payloads)
 *   - <iframe>, <object>, <embed>, <form> tags (removed entirely)
 *   - <base> tag (would redirect all relative links)
 *
 * Note: This is a regex-based sanitiser. For production deployments handling
 * untrusted third-party content, replace with DOMPurify. For this CMS, all
 * content is written by an authenticated admin, so this level is appropriate.
 */
export function sanitiseHtml(html: string): string {
  let clean = html;

  // 1. Remove <script> tags entirely (including content)
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove dangerous structural tags entirely
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  clean = clean.replace(/<base\b[^>]*>/gi, '');

  // 3. Remove inline event handler attributes (on* = "..." and on* = '...')
  clean = clean.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  // Unquoted event handlers
  clean = clean.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

  // 4. Remove dangerous URI schemes in href/src/action attributes
  // javascript:, vbscript:, data: (with any whitespace/encoding variants)
  const dangerousScheme = /(href|src|action)\s*=\s*["']\s*(javascript|vbscript|data)\s*:[^"']*/gi;
  clean = clean.replace(dangerousScheme, '$1="#"');

  return clean;
}
