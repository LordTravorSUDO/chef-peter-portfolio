/**
 * Supabase client singleton — browser-safe configuration.
 *
 * SECURITY NOTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are intentionally exposed
 *    to the browser. The anon key grants access only to what Supabase Row
 *    Level Security (RLS) explicitly permits. It cannot bypass RLS.
 *
 * 2. The Supabase SERVICE ROLE KEY must NEVER appear here or in any browser
 *    bundle. It grants full database access and bypasses RLS entirely.
 *    It must only be used in server-side code (e.g. Vercel serverless functions
 *    or Supabase Edge Functions). We have no server-side code at this stage.
 *
 * 3. Session persistence uses localStorage (standard for SPAs). Admin sessions
 *    are scoped to the browser. Tokens auto-refresh before expiry.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL      — https://YOUR_REF.supabase.co
 *   VITE_SUPABASE_ANON_KEY — long JWT starting with "eyJ..."
 *
 * Add both to .env (local) and Vercel → Project → Settings → Environment
 * Variables (production). See .env.example for the full variable list.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fail loudly in development if the variables are missing.
// The check is intentionally placed here (not in a lazy-loaded page) so a
// missing .env is caught immediately on first import, not buried in a 404.
if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT')) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL is not configured.\n' +
    'Copy .env.example to .env and fill in your Supabase project URL.\n' +
    'Find it in: Supabase Dashboard → Project → Settings → API → Project URL'
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE')) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_ANON_KEY is not configured.\n' +
    'Copy .env.example to .env and fill in your Supabase anon key.\n' +
    'Find it in: Supabase Dashboard → Project → Settings → API → Project API keys → anon/public'
  );
}

/** Project URL without a trailing slash (a trailing slash produced "//storage" URLs). */
export const SUPABASE_URL      = supabaseUrl.replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = supabaseAnonKey;

export const supabase = createClient<Database>(SUPABASE_URL, supabaseAnonKey, {
  auth: {
    persistSession:     true,   // store session in localStorage
    autoRefreshToken:   true,   // silently refresh before expiry
    detectSessionInUrl: true,   // handle PKCE OAuth redirects
    flowType:           'pkce', // PKCE is the secure default for SPAs
  },
  global: {
    headers: {
      // Tag all requests for easier filtering in Supabase logs
      'x-application-name': 'chef-peter-cms',
    },
  },
});

/**
 * Typed convenience re-export for Supabase Auth.
 * Use this in hooks and components rather than importing supabase directly.
 */
export const supabaseAuth = supabase.auth;

/**
 * Supabase Storage bucket for CMS images.
 * Defaults to "article-media" (created by the storage migration). Set
 * VITE_SUPABASE_MEDIA_BUCKET only if the project's existing image bucket has a
 * different name — do not create a second bucket for the same purpose.
 * The bucket is public-read: article images are shown on the public website.
 */
export const MEDIA_BUCKET: string =
  ((import.meta.env.VITE_SUPABASE_MEDIA_BUCKET as string | undefined) || 'article-media').trim();

export const supabaseStorage = {
  /** Returns the storage client for the article-media bucket */
  media: () => supabase.storage.from(MEDIA_BUCKET),
  /** Resolves a storage_path to a full public URL */
  getPublicUrl: (storagePath: string): string =>
    supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl,
};
