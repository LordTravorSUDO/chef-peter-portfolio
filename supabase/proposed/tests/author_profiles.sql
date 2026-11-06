-- =============================================================================
-- AUTHOR PROFILES MIGRATION — DATABASE-LEVEL TESTS (PROPOSED)
-- =============================================================================
-- Run on a Supabase BRANCH or LOCAL stack after applying
-- supabase/proposed/20261107000000_author_profiles.sql.
-- Prints PASS/FAIL notices; everything is rolled back.
--
--   1. Admin can create a profile
--   2. Anonymous visitors can read it
--   3. Anonymous visitors cannot modify it
--   4. Anonymous visitors still cannot read public.profiles (account data)
--   5. Invalid profile_url is rejected
-- =============================================================================
BEGIN;

DO $$
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-0000000000c1', 'ap-test-admin@chefpeter.test', crypt('test', gen_salt('bf')), NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, role, is_active, display_name)
  VALUES ('00000000-0000-0000-0000-0000000000c1', 'admin', TRUE, 'AP Test Admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = TRUE;
END $$;

-- 1 — as the admin
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
DO $$
BEGIN
  INSERT INTO public.author_profiles (profile_id, display_name, short_bio, profile_url)
  VALUES ('00000000-0000-0000-0000-0000000000c1', 'Chef Peter the Teacher', 'Bio', '/about-chef-peter');
  RAISE NOTICE '1. admin creates profile: PASS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '1. admin creates profile: FAIL (%)', SQLERRM;
END $$;
RESET ROLE;

-- 2–4 — as an anonymous visitor
SET LOCAL ROLE anon;
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM public.author_profiles WHERE profile_id = '00000000-0000-0000-0000-0000000000c1';
  RAISE NOTICE '2. anon reads author profile: %', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL' END;

  UPDATE public.author_profiles SET short_bio = 'hacked' WHERE profile_id = '00000000-0000-0000-0000-0000000000c1';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '3. anon cannot modify: %', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE '3. anon cannot modify: PASS (permission denied)';
END $$;
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM public.profiles;
  RAISE NOTICE '4. anon cannot read account profiles: %', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE '4. anon cannot read account profiles: PASS (permission denied)';
END $$;
RESET ROLE;

-- 5
DO $$
BEGIN
  BEGIN
    UPDATE public.author_profiles SET profile_url = 'javascript:alert(1)' WHERE profile_id = '00000000-0000-0000-0000-0000000000c1';
    RAISE NOTICE '5. invalid profile_url rejected: FAIL';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '5. invalid profile_url rejected: PASS';
  END;
END $$;

ROLLBACK;
