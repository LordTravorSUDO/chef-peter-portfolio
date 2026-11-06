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
import type { ArticleType } from '../knowledge/articleTypes';
import type { ArticleStatus } from '../../types/database';
import { hasKnowledgeSchema } from './knowledgeSchema';
import { zonedInputToUtcIso } from '../datetime';
import { searchWords, ilikePattern } from '../knowledge/search';

// ---------------------------------------------------------------------------
// Public queries (work under anon key; RLS restricts to published articles)
// ---------------------------------------------------------------------------

/** Columns needed for article cards. Knowledge-platform columns are added when available. */
const CARD_SELECT = `
  id, slug, title, excerpt, reading_time_minutes, published_at, updated_at, status, featured_image_id,
  article_categories (
    is_primary,
    categories ( id, slug, name )
  ),
  article_tags (
    tags ( id, slug, name )
  ),
  featured_image:media!articles_featured_image_id_fkey ( storage_path, alt_text )
`;
const CARD_SELECT_V2 = `${CARD_SELECT}, article_type, is_featured, is_editors_pick`;

export async function cardSelect(): Promise<string> {
  return (await hasKnowledgeSchema()) ? CARD_SELECT_V2 : CARD_SELECT;
}

/** IDs of articles linked to a category (by slug). Unpublished IDs are harmless: RLS hides those articles. */
async function articleIdsForCategory(categorySlug: string): Promise<string[]> {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
  if (!cat) return [];
  const { data } = await supabase.from('article_categories').select('article_id').eq('category_id', cat.id);
  return (data ?? []).map((r) => r.article_id as string);
}

async function articleIdsForTag(tagSlug: string): Promise<string[]> {
  const { data: tag } = await supabase.from('tags').select('id').eq('slug', tagSlug).maybeSingle();
  if (!tag) return [];
  const { data } = await supabase.from('article_tags').select('article_id').eq('tag_id', tag.id);
  return (data ?? []).map((r) => r.article_id as string);
}

/** Articles whose category or tag NAME matches the search term ("subject" search). */
async function articleIdsForSubject(term: string): Promise<string[]> {
  const pattern = ilikePattern(term);
  const [{ data: cats }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('id').ilike('name', pattern),
    supabase.from('tags').select('id').ilike('name', pattern),
  ]);
  const catIds = (cats ?? []).map((c) => c.id as string);
  const tagIds = (tags ?? []).map((t) => t.id as string);
  const [byCat, byTag] = await Promise.all([
    catIds.length ? supabase.from('article_categories').select('article_id').in('category_id', catIds) : Promise.resolve({ data: [] as { article_id: string }[] }),
    tagIds.length ? supabase.from('article_tags').select('article_id').in('tag_id', tagIds) : Promise.resolve({ data: [] as { article_id: string }[] }),
  ]);
  return [...new Set([...(byCat.data ?? []), ...(byTag.data ?? [])].map((r) => r.article_id as string))];
}

const intersect = (a: string[] | null, b: string[]): string[] => (a === null ? b : a.filter((id) => b.includes(id)));

/**
 * Fetch a paginated list of published articles for the library.
 *
 * Filters combine (AND): category, tag, article type and search.
 * Search: every word must appear in the title, the introduction (excerpt) or
 * the name of one of the article's categories or tags.
 *
 * Category and tag filters resolve article IDs first. (Filtering on an
 * embedded resource without !inner only trims the embedded rows, so the
 * previous implementation returned every article for any category.)
 */
export async function getPublishedArticles(opts: {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  articleType?: ArticleType;
  excludeIds?: string[];
} = {}) {
  const { page = 1, pageSize = 12, categorySlug, tagSlug, search, articleType, excludeIds } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;
  const empty = { articles: [] as ArticleCard[], total: 0, page, pageSize, totalPages: 0 };

  let ids: string[] | null = null;
  if (categorySlug) ids = intersect(ids, await articleIdsForCategory(categorySlug));
  if (tagSlug)      ids = intersect(ids, await articleIdsForTag(tagSlug));
  if (ids !== null && ids.length === 0) return empty;

  // Every word must match (title, introduction or a category/tag name).
  const words = search ? searchWords(search) : [];
  const subjectIdsPerWord = await Promise.all(words.map((w) => articleIdsForSubject(w)));

  const v2 = await hasKnowledgeSchema();
  let query = supabase
    .from('articles')
    .select(v2 ? CARD_SELECT_V2 : CARD_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, to);

  if (ids !== null) query = query.in('id', ids);
  if (excludeIds?.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  if (articleType && v2) query = query.eq('article_type', articleType);
  words.forEach((word, i) => {
    const p = ilikePattern(word);
    const clauses = [`title.ilike.${p}`, `excerpt.ilike.${p}`];
    if (subjectIdsPerWord[i].length) clauses.push(`id.in.(${subjectIdsPerWord[i].join(',')})`);
    query = query.or(clauses.join(',')); // successive .or() filters are combined with AND
  });

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
 * The featured article for /articles: the most recent article marked
 * "featured" (knowledge-platform migration), otherwise the latest article.
 */
export async function getFeaturedArticle(): Promise<ArticleWithRelations | null> {
  const v2 = await hasKnowledgeSchema();
  const base = () => supabase
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
    .limit(1);

  if (v2) {
    const { data, error } = await base().eq('is_featured', true).maybeSingle();
    if (!error && data) return data as unknown as ArticleWithRelations;
  }
  const { data, error } = await base().maybeSingle();
  if (error) throw new Error(`getFeaturedArticle: ${error.message}`);
  return data as unknown as ArticleWithRelations | null;
}

/** Editor's selection (knowledge-platform migration). Empty before the migration. */
export async function getEditorsPicks(limit = 4): Promise<ArticleCard[]> {
  if (!(await hasKnowledgeSchema())) return [];
  const { data, error } = await supabase
    .from('articles')
    .select(CARD_SELECT_V2)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .eq('is_editors_pick', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleCard[];
}

/**
 * Related articles: same primary category first, then shared tags, then the
 * most recent articles. Never includes the current article.
 */
export async function getRelatedArticles(
  current: { id: string; categoryIds: string[]; tagIds: string[] },
  limit = 3,
): Promise<ArticleCard[]> {
  const select = await cardSelect();
  const now = new Date().toISOString();
  const picked: ArticleCard[] = [];
  const seen = new Set<string>([current.id]);

  const take = async (ids: string[] | null) => {
    if (picked.length >= limit) return;
    if (ids !== null) {
      ids = ids.filter((id) => !seen.has(id));
      if (!ids.length) return;
    }
    let q = supabase
      .from('articles')
      .select(select)
      .eq('status', 'published')
      .lte('published_at', now)
      .not('id', 'in', `(${[...seen].join(',')})`)
      .order('published_at', { ascending: false })
      .limit(limit - picked.length);
    if (ids !== null) q = q.in('id', ids);
    const { data } = await q;
    for (const row of (data ?? []) as unknown as ArticleCard[]) {
      if (!seen.has(row.id)) { seen.add(row.id); picked.push(row); }
    }
  };

  try {
    if (current.categoryIds.length) {
      const { data } = await supabase.from('article_categories').select('article_id').in('category_id', current.categoryIds);
      await take((data ?? []).map((r) => r.article_id as string));
    }
    if (current.tagIds.length) {
      const { data } = await supabase.from('article_tags').select('article_id').in('tag_id', current.tagIds);
      await take((data ?? []).map((r) => r.article_id as string));
    }
    await take(null);
  } catch {
    /* related articles are optional */
  }
  return picked;
}

/** Previous (older) and next (newer) published articles, by publication date. */
export async function getAdjacentArticles(publishedAt: string | null, currentId: string) {
  if (!publishedAt) return { previous: null, next: null };
  const now = new Date().toISOString();
  const cols = 'id, slug, title';
  const [older, newer] = await Promise.all([
    supabase.from('articles').select(cols).eq('status', 'published').lt('published_at', publishedAt)
      .neq('id', currentId).order('published_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('articles').select(cols).eq('status', 'published').gt('published_at', publishedAt)
      .lte('published_at', now).neq('id', currentId).order('published_at', { ascending: true }).limit(1).maybeSingle(),
  ]);
  type Link = { id: string; slug: string; title: string };
  return {
    previous: (older.data as Link | null) ?? null,
    next: (newer.data as Link | null) ?? null,
  };
}

/** Number of published articles in each category (by category id). RLS limits counts to published articles. */
export async function getCategoryArticleCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('article_categories')
    .select('category_id, articles!inner ( id )');
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ category_id: string }>) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

/** Tags used by at least one published article, most used first. */
export async function getTagsInUse(limit = 40): Promise<Array<{ id: string; slug: string; name: string; count: number }>> {
  const { data, error } = await supabase
    .from('article_tags')
    .select('tag_id, tags ( id, slug, name ), articles!inner ( id )');
  if (error) return [];
  const map = new Map<string, { id: string; slug: string; name: string; count: number }>();
  for (const row of (data ?? []) as unknown as Array<{ tags: { id: string; slug: string; name: string } | null }>) {
    if (!row.tags) continue;
    const entry = map.get(row.tags.id) ?? { ...row.tags, count: 0 };
    entry.count += 1;
    map.set(row.tags.id, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Admin queries (require an active authenticated session)
// ---------------------------------------------------------------------------

/** Fetch all articles regardless of status — for the admin article list. */
export type AdminDateField = 'updated_at' | 'published_at' | 'created_at';

export interface AdminArticleRow {
  id: string; slug: string; title: string; status: ArticleStatus;
  published_at: string | null; scheduled_for: string | null; created_at: string; updated_at: string;
  author_display_name: string; featured_image_id: string | null; excerpt: string;
  article_type?: ArticleType; is_featured?: boolean; is_editors_pick?: boolean;
  article_categories: Array<{ is_primary: boolean; categories: { id: string; name: string; slug: string } | null }>;
}

/**
 * Admin article list (all statuses — RLS allows admins to read everything).
 *
 * Filters combine: status, search (title or slug, every word), category,
 * format (after the knowledge-platform migration) and a date range on the
 * chosen date column. Dates are inclusive Kampala calendar days (YYYY-MM-DD).
 */
export async function getAllArticlesAdmin(opts: {
  page?:      number;
  pageSize?:  number;
  status?:    string;
  search?:    string;
  categoryId?: string;
  articleType?: ArticleType;
  dateField?: AdminDateField;
  dateFrom?:  string;
  dateTo?:    string;
} = {}) {
  const { page = 1, pageSize = 20, status, search, categoryId, articleType, dateField = 'updated_at', dateFrom, dateTo } = opts;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;
  const empty = { articles: [] as AdminArticleRow[], total: 0, totalPages: 0 };

  let ids: string[] | null = null;
  if (categoryId) {
    const { data, error } = await supabase.from('article_categories').select('article_id').eq('category_id', categoryId);
    if (error) throw new Error(`getAllArticlesAdmin: ${error.message}`);
    ids = (data ?? []).map((r) => r.article_id as string);
    if (!ids.length) return empty;
  }

  const v2 = await hasKnowledgeSchema();
  const cols = 'id, slug, title, excerpt, status, published_at, scheduled_for, created_at, updated_at, author_display_name, featured_image_id, article_categories ( is_primary, categories ( id, name, slug ) )';
  let query = supabase
    .from('articles')
    .select(v2 ? `${cols}, article_type, is_featured, is_editors_pick` : cols, { count: 'exact' })
    .order(dateField, { ascending: false, nullsFirst: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (ids) query = query.in('id', ids);
  if (articleType && v2) query = query.eq('article_type', articleType);
  for (const word of search ? searchWords(search) : []) {
    const p = ilikePattern(word);
    query = query.or(`title.ilike.${p},slug.ilike.${p}`);
  }
  // Calendar days are Kampala days (the CMS time zone), whatever the computer's zone
  if (dateFrom) query = query.gte(dateField, zonedInputToUtcIso(`${dateFrom}T00:00`));
  if (dateTo)   query = query.lt(dateField, new Date(new Date(zonedInputToUtcIso(`${dateTo}T00:00`)).getTime() + 86_400_000).toISOString());

  const { data, error, count } = await query;
  if (error) throw new Error(`getAllArticlesAdmin: ${error.message}`);

  return {
    articles:   (data ?? []) as unknown as AdminArticleRow[],
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
      featured_image:media!articles_featured_image_id_fkey ( id, storage_path, alt_text, caption, width_px, height_px ),
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
/** Restore an archived article to draft (same rules as unpublish: published_at kept). */
export async function restoreArticle(id: string): Promise<void> {
  const { error } = await supabase.from('articles').update({ status: 'draft', scheduled_for: null }).eq('id', id);
  if (error) throw new Error(`Could not restore the article: ${describeArticleDbError(error)}`);
}

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
