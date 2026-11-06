/**
 * Taxonomy service — categories and tags.
 */

import { supabase } from '../supabase';
import type {
  Category, CategoryInsert, CategoryUpdate,
  Tag, TagInsert, TagUpdate,
} from '../../types/article';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw new Error(`getCategories: ${error.message}`);
  return sortCategories((data ?? []) as Category[]);
}

/**
 * Display order: sort_order (knowledge-platform migration) then name.
 * Before the migration sort_order is absent, so categories sort by name.
 */
export function sortCategories(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.name.localeCompare(b.name),
  );
}

/** Categories shown to visitors: active ones only (all, before the migration). */
export async function getPublicCategories(): Promise<Category[]> {
  return (await getCategories()).filter((c) => c.is_active !== false);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`getCategoryBySlug: ${error.message}`);
  return data as Category | null;
}

export async function createCategory(payload: CategoryInsert): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(`createCategory: ${error.message}`);
  return data.id as string;
}

export async function updateCategory(id: string, payload: CategoryUpdate) {
  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`updateCategory: ${error.message}`);
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  // article_categories rows are removed (ON DELETE CASCADE); the articles themselves are kept
  if (error) throw new Error(`deleteCategory: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) throw new Error(`getTags: ${error.message}`);
  return (data ?? []) as Tag[];
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`getTagBySlug: ${error.message}`);
  return data as Tag | null;
}

export async function createTag(payload: TagInsert): Promise<string> {
  const { data, error } = await supabase
    .from('tags')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(`createTag: ${error.message}`);
  return data.id as string;
}

export async function updateTag(id: string, payload: TagUpdate) {
  const { error } = await supabase.from('tags').update(payload).eq('id', id);
  if (error) throw new Error(`updateTag: ${error.message}`);
}

export async function deleteTag(id: string) {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  // article_tags rows with this tag are CASCADE deleted
  if (error) throw new Error(`deleteTag: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Article ↔ Category assignment
// ---------------------------------------------------------------------------

/** Replace all category assignments for an article. */
export async function setArticleCategories(
  articleId: string,
  assignments: Array<{ categoryId: string; isPrimary: boolean }>
) {
  // Delete existing assignments first
  const { error: delErr } = await supabase
    .from('article_categories')
    .delete()
    .eq('article_id', articleId);

  if (delErr) throw new Error(`setArticleCategories (delete): ${delErr.message}`);

  if (assignments.length === 0) return;

  const rows = assignments.map((a) => ({
    article_id:  articleId,
    category_id: a.categoryId,
    is_primary:  a.isPrimary,
  }));

  const { error: insErr } = await supabase
    .from('article_categories')
    .insert(rows);

  if (insErr) throw new Error(`setArticleCategories (insert): ${insErr.message}`);
}

// ---------------------------------------------------------------------------
// Article ↔ Tag assignment
// ---------------------------------------------------------------------------

/** Replace all tag assignments for an article. */
export async function setArticleTags(articleId: string, tagIds: string[]) {
  const { error: delErr } = await supabase
    .from('article_tags')
    .delete()
    .eq('article_id', articleId);

  if (delErr) throw new Error(`setArticleTags (delete): ${delErr.message}`);

  if (tagIds.length === 0) return;

  const rows = tagIds.map((tagId) => ({ article_id: articleId, tag_id: tagId }));

  const { error: insErr } = await supabase
    .from('article_tags')
    .insert(rows);

  if (insErr) throw new Error(`setArticleTags (insert): ${insErr.message}`);
}

// ---------------------------------------------------------------------------
// Usage counts and safe reassignment (admin)
// ---------------------------------------------------------------------------

export interface TaxonomyUsage {
  /** All linked articles, any status */
  total: number;
  /** Published articles */
  published: number;
}

/** Article counts per category id (admins can see every status). */
export async function getCategoryUsage(): Promise<Record<string, TaxonomyUsage>> {
  const { data, error } = await supabase.from('article_categories').select('category_id, articles ( status )');
  if (error) throw new Error(`getCategoryUsage: ${error.message}`);
  return countUsage((data ?? []) as unknown as Array<{ category_id: string; articles: { status: string } | null }>, 'category_id');
}

/** Article counts per tag id (admins can see every status). */
export async function getTagUsage(): Promise<Record<string, TaxonomyUsage>> {
  const { data, error } = await supabase.from('article_tags').select('tag_id, articles ( status )');
  if (error) throw new Error(`getTagUsage: ${error.message}`);
  return countUsage((data ?? []) as unknown as Array<{ tag_id: string; articles: { status: string } | null }>, 'tag_id');
}

function countUsage<K extends string>(rows: Array<Record<K, string> & { articles: { status: string } | null }>, key: K) {
  const out: Record<string, TaxonomyUsage> = {};
  for (const row of rows) {
    const id = row[key];
    const entry = (out[id] ??= { total: 0, published: 0 });
    entry.total += 1;
    if (row.articles?.status === 'published') entry.published += 1;
  }
  return out;
}

/**
 * Moves every article from one category to another, keeping each article's
 * "primary category" choice. Used before deleting a category so that no
 * article loses its subject. Returns the number of articles moved.
 *
 *  - Article not yet in the target  → its link is moved to the target.
 *  - Article already in the target  → the old link is removed; if the old
 *    category was primary, the target becomes primary (the database allows
 *    one primary category per article, so the old link is removed first).
 */
export async function reassignCategoryArticles(fromId: string, toId: string): Promise<number> {
  if (fromId === toId) throw new Error('Choose a different category to move the articles to.');
  const { data: fromRows, error: e1 } = await supabase
    .from('article_categories').select('article_id, is_primary').eq('category_id', fromId);
  if (e1) throw new Error(`reassignCategoryArticles: ${e1.message}`);
  const rows = (fromRows ?? []) as Array<{ article_id: string; is_primary: boolean }>;
  if (!rows.length) return 0;

  const { data: toRows, error: e2 } = await supabase
    .from('article_categories').select('article_id').eq('category_id', toId).in('article_id', rows.map((r) => r.article_id));
  if (e2) throw new Error(`reassignCategoryArticles: ${e2.message}`);
  const alreadyInTarget = new Set(((toRows ?? []) as Array<{ article_id: string }>).map((r) => r.article_id));

  for (const row of rows) {
    if (alreadyInTarget.has(row.article_id)) {
      const { error: del } = await supabase.from('article_categories').delete()
        .eq('article_id', row.article_id).eq('category_id', fromId);
      if (del) throw new Error(`reassignCategoryArticles: ${del.message}`);
      if (row.is_primary) {
        const { error: up } = await supabase.from('article_categories').update({ is_primary: true })
          .eq('article_id', row.article_id).eq('category_id', toId);
        if (up) throw new Error(`reassignCategoryArticles: ${up.message}`);
      }
    } else {
      const { error: mv } = await supabase.from('article_categories').update({ category_id: toId })
        .eq('article_id', row.article_id).eq('category_id', fromId);
      if (mv) throw new Error(`reassignCategoryArticles: ${mv.message}`);
    }
  }
  return rows.length;
}

/**
 * Deletes a category only when no article is linked to it.
 * Call reassignCategoryArticles() first for categories that contain articles.
 */
export async function deleteEmptyCategory(id: string): Promise<void> {
  const { count, error } = await supabase
    .from('article_categories').select('article_id', { count: 'exact', head: true }).eq('category_id', id);
  if (error) throw new Error(`deleteEmptyCategory: ${error.message}`);
  if ((count ?? 0) > 0) {
    throw new Error(`This category still contains ${count} article${count === 1 ? '' : 's'}. Move them to another category first.`);
  }
  await deleteCategory(id);
}
