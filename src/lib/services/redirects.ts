/**
 * Redirects service.
 *
 * The SPA uses this to handle 404s — if the path matches a redirect rule,
 * the router navigates to the destination automatically.
 */

import { supabase } from '../supabase';
import type { Redirect, RedirectInsert, RedirectUpdate } from '../../types/article';

/** Look up a redirect for a given path. Returns null if none found. */
export async function findRedirect(fromPath: string): Promise<Redirect | null> {
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .eq('from_path', fromPath)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`findRedirect: ${error.message}`);
  return data as Redirect | null;
}

/** Create a redirect rule (admin only). */
export async function createRedirect(payload: RedirectInsert): Promise<string> {
  const { data, error } = await supabase
    .from('redirects')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(`createRedirect: ${error.message}`);
  return data.id as string;
}

/** Update a redirect rule (admin only). */
export async function updateRedirect(id: string, payload: RedirectUpdate) {
  const { error } = await supabase
    .from('redirects')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`updateRedirect: ${error.message}`);
}

/** Deactivate a redirect without deleting the record. */
export async function deactivateRedirect(id: string) {
  return updateRedirect(id, { is_active: false });
}

/** Delete a redirect rule (admin only). */
export async function deleteRedirect(id: string) {
  const { error } = await supabase
    .from('redirects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`deleteRedirect: ${error.message}`);
}

/** Get all redirects for the admin panel. */
export async function getAllRedirects(): Promise<Redirect[]> {
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getAllRedirects: ${error.message}`);
  return (data ?? []) as Redirect[];
}

/**
 * Keeps old article URLs working after a published article's slug changes.
 *
 *   1. /articles/<old> → /articles/<new> (301), created or re-activated
 *   2. existing redirects that pointed to the old URL now point to the new one
 *      (no redirect chains)
 *   3. any active redirect *from* the new URL is deactivated (no loops)
 *
 * Admin only (RLS). The Edge middleware answers these with real HTTP 301s.
 */
export async function recordSlugChange(articleId: string, oldSlug: string, newSlug: string): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  const from = `/articles/${oldSlug}`;
  const to = `/articles/${newSlug}`;

  const { error: e1 } = await supabase.from('redirects').update({ to_path: to }).eq('to_path', from);
  if (e1) throw new Error(`recordSlugChange: ${e1.message}`);

  const { error: e2 } = await supabase.from('redirects').update({ is_active: false }).eq('from_path', to);
  if (e2) throw new Error(`recordSlugChange: ${e2.message}`);

  const { data: existing, error: e3 } = await supabase.from('redirects').select('id').eq('from_path', from).maybeSingle();
  if (e3) throw new Error(`recordSlugChange: ${e3.message}`);
  if (existing) {
    await updateRedirect(existing.id as string, { to_path: to, is_active: true, status_code: 301, article_id: articleId });
  } else {
    await createRedirect({ from_path: from, to_path: to, status_code: 301, article_id: articleId, is_active: true });
  }
}
