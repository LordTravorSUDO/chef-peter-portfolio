-- =============================================================================
-- Migration 003: profiles table
-- =============================================================================
-- Run order: 3 of 8
--
-- One row per Supabase Auth user.
-- Created automatically by a trigger on auth.users INSERT.
-- The role column is the single source of truth for CMS permissions.
-- It is protected from self-elevation by RLS — see policies below.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT         NOT NULL DEFAULT '',
  avatar_url    TEXT,
  role          public.user_role NOT NULL DEFAULT 'editor',
  -- An editor whose account is suspended cannot log in but data is preserved
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'One row per Supabase Auth user. role determines CMS access level.';
COMMENT ON COLUMN public.profiles.role IS
  'admin = full access; editor = write but no publish/delete. Set via Supabase dashboard only.';

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new Auth user is created
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as the function owner (postgres), not the caller
SET search_path = public  -- prevent search_path injection
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Keep updated_at current
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: returns true if the calling user has the 'admin' role
-- Used in RLS policies throughout all migrations.
-- SECURITY DEFINER so it can read profiles regardless of calling context.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = TRUE
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns TRUE if the current authenticated user is an active admin. Used in RLS policies.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile — but NOT the role or is_active column
-- The WITH CHECK prevents any UPDATE that would change the role
CREATE POLICY "Users can update own non-sensitive profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role must remain unchanged; only admins may change roles (separate policy)
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
  );

-- Only admins can update role or is_active
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- No INSERT from client — the trigger handles it
-- No DELETE from client — account deletion is handled via auth.users cascade
