-- =============================================================================
-- PROPOSED MIGRATION — PUBLIC AUTHOR PROFILES  (NOT YET APPLIED)
-- =============================================================================
-- Status: awaiting the site owner's approval. Kept in supabase/proposed/ so it
-- is never applied automatically. Apply after (or together with)
-- 20261106000000_knowledge_platform.sql, following docs/knowledge-platform.md.
--
-- Why a separate table rather than new columns on public.profiles:
--   public.profiles holds account data (role, is_active) and is readable only
--   by its owner and by admins. Article pages are read by anonymous visitors,
--   who must be able to see the author's public biography but NOT account
--   data. A separate table with its own policies keeps profiles private and
--   leaves every existing policy unchanged.
--
-- One row per author (keyed by the profile id). The CMS "Author profile" page
-- edits it. Until a row exists, the site shows the approved profile text that
-- is kept in src/data/authorProfile.ts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.author_profiles (
  profile_id      UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name    TEXT         NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  job_title       TEXT         CHECK (char_length(job_title) <= 160),
  short_bio       TEXT         CHECK (char_length(short_bio) <= 600),
  long_bio        TEXT         CHECK (char_length(long_bio) <= 4000),
  photo_media_id  UUID         REFERENCES public.media(id) ON DELETE SET NULL,
  profile_url     TEXT         CHECK (profile_url IS NULL OR profile_url ~ '^(/|https://)'),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.author_profiles IS
  'Public author biography shown on article pages. Readable by everyone; written only by admins.';

DROP TRIGGER IF EXISTS author_profiles_updated_at ON public.author_profiles;
CREATE TRIGGER author_profiles_updated_at
  BEFORE UPDATE ON public.author_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_author_profiles_photo ON public.author_profiles (photo_media_id);

ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads author profiles" ON public.author_profiles;
CREATE POLICY "Public reads author profiles"
  ON public.author_profiles FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins manage author profiles" ON public.author_profiles;
CREATE POLICY "Admins manage author profiles"
  ON public.author_profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Explicit grants (Supabase grants table privileges to anon/authenticated by
-- default; RLS above decides which rows and operations are allowed).
GRANT SELECT ON public.author_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.author_profiles TO authenticated;

-- =============================================================================
-- ROLLBACK (manual)
--   DROP TABLE IF EXISTS public.author_profiles;
-- =============================================================================
