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
