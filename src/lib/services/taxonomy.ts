/**
 * Taxonomy service — categories and tags.
 */

import { supabase } from '../supabase';
import type {
  Category, CategoryInsert, CategoryUpdate,
  Tag, TagInsert,
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
  return (data ?? []) as Category[];
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

  // articles with this category will have category_id set to NULL (ON DELETE SET NULL)
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
