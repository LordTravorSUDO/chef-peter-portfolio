/**
 * Author profiles — public biography and photo shown on article pages.
 *
 * Stored in public.author_profiles (proposed migration
 * supabase/proposed/20261107000000_author_profiles.sql). Before that table
 * exists, every function falls back to the approved default profile in
 * src/data/authorProfile.ts, so pages always show the correct biography.
 *
 * Security: author_profiles is publicly readable and admin-writable (RLS).
 * public.profiles stays private — visitors never read account data.
 */
import { supabase } from '../supabase';
import { getMediaUrl } from './media';
import { DEFAULT_AUTHOR, isChefPeterByline, type AuthorProfileView } from '../../data/authorProfile';

export interface AuthorProfileRow {
  profile_id: string;
  display_name: string;
  job_title: string | null;
  short_bio: string | null;
  long_bio: string | null;
  photo_media_id: string | null;
  profile_url: string | null;
  created_at?: string;
  updated_at?: string;
  photo?: { storage_path: string; alt_text: string | null } | null;
}

const SELECT = 'profile_id, display_name, job_title, short_bio, long_bio, photo_media_id, profile_url, updated_at, photo:media ( storage_path, alt_text )';

/** 42P01 = undefined_table; PGRST205 = table not in schema cache */
const MISSING_TABLE = /42P01|PGRST205|does not exist|could not find the table/i;

let tableCheck: Promise<boolean> | null = null;

/** Whether the author_profiles table exists (cached; retried after errors). */
export function hasAuthorProfilesTable(): Promise<boolean> {
  if (!tableCheck) {
    tableCheck = (async () => {
      const { error } = await supabase.from('author_profiles').select('profile_id').limit(0);
      if (!error) return true;
      if (MISSING_TABLE.test(`${error.code ?? ''} ${error.message ?? ''}`)) return false;
      throw new Error(error.message);
    })().catch(() => {
      tableCheck = null;
      return false;
    });
  }
  return tableCheck;
}

function toView(row: AuthorProfileRow): AuthorProfileView {
  return {
    name: row.display_name,
    jobTitle: row.job_title,
    shortBio: row.short_bio,
    longBio: row.long_bio,
    photoUrl: row.photo?.storage_path ? getMediaUrl(row.photo.storage_path) : null,
    photoAlt: row.photo?.alt_text || row.display_name,
    profileUrl: row.profile_url,
    source: 'cms',
  };
}

/**
 * The public profile for an article's author.
 * Order: saved CMS profile → approved default (for Chef Peter bylines) → name only.
 */
export async function getAuthorProfile(profileId: string | null | undefined, byline?: string | null): Promise<AuthorProfileView> {
  if (profileId && (await hasAuthorProfilesTable())) {
    const { data } = await supabase.from('author_profiles').select(SELECT).eq('profile_id', profileId).maybeSingle();
    if (data) return toView(data as unknown as AuthorProfileRow);
  }
  if (isChefPeterByline(byline)) return { ...DEFAULT_AUTHOR, name: byline || DEFAULT_AUTHOR.name };
  return {
    name: byline || 'Guest author',
    jobTitle: null,
    shortBio: null,
    longBio: null,
    photoUrl: null,
    photoAlt: byline || 'Author',
    profileUrl: null,
    source: 'generic',
  };
}

/** The main educator (first saved profile, else the approved default) — used by the library. */
export async function getPrimaryAuthorProfile(): Promise<AuthorProfileView> {
  if (await hasAuthorProfilesTable()) {
    const { data } = await supabase.from('author_profiles').select(SELECT).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (data) return toView(data as unknown as AuthorProfileRow);
  }
  return DEFAULT_AUTHOR;
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function getAuthorProfileRow(profileId: string): Promise<AuthorProfileRow | null> {
  const { data, error } = await supabase.from('author_profiles').select(SELECT).eq('profile_id', profileId).maybeSingle();
  if (error) throw new Error(`getAuthorProfileRow: ${error.message}`);
  return data as unknown as AuthorProfileRow | null;
}

export async function saveAuthorProfile(row: Omit<AuthorProfileRow, 'created_at' | 'updated_at' | 'photo'>): Promise<void> {
  const { error } = await supabase.from('author_profiles').upsert(row, { onConflict: 'profile_id' });
  if (error) throw new Error(`saveAuthorProfile: ${error.message}`);
}

/** Admin-visible profiles (RLS: admins can read all profiles) for the author selector. */
export async function listAuthors(): Promise<Array<{ id: string; display_name: string; is_active: boolean; role: string }>> {
  const { data, error } = await supabase.from('profiles').select('id, display_name, is_active, role').order('display_name');
  if (error) throw new Error(`listAuthors: ${error.message}`);
  return (data ?? []) as Array<{ id: string; display_name: string; is_active: boolean; role: string }>;
}
