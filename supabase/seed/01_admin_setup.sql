-- =============================================================================
-- ADMIN SETUP — Run ONCE after migrations, in the Supabase SQL Editor
-- =============================================================================
--
-- PURPOSE:
--   Promote an existing Supabase Auth user to the 'admin' role.
--
-- PREREQUISITE:
--   1. All 8 migrations have been applied.
--   2. Chef Peter's user account already exists in Supabase Auth.
--      (Create it via Dashboard → Authentication → Users → "Add user"
--       or "Invite user". Use a strong, unique password.)
--   3. The trigger on_auth_user_created will have already created a
--      profiles row for that user with role = 'editor' (the default).
--
-- HOW TO USE:
--   Replace 'YOUR_ADMIN_USER_EMAIL_HERE' with the real email address,
--   then run this script in the Supabase SQL Editor.
--   DO NOT commit the real email address to version control.
--
-- SECURITY:
--   This script uses the SECURITY DEFINER privilege of the SQL Editor
--   (which runs as the postgres superuser). RLS does NOT apply here.
--   This is the ONLY safe way to promote a user to admin — it cannot
--   be done through the anon or authenticated API keys.
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_email   TEXT := 'YOUR_ADMIN_USER_EMAIL_HERE';  -- ← replace this
BEGIN
  -- Look up the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email: %. Create the user first.', v_email;
  END IF;

  -- Promote to admin
  UPDATE public.profiles
  SET role      = 'admin',
      is_active = TRUE,
      updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    -- Trigger may not have fired yet; insert manually
    INSERT INTO public.profiles (id, role, is_active)
    VALUES (v_user_id, 'admin', TRUE)
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin', is_active = TRUE, updated_at = NOW();
  END IF;

  RAISE NOTICE 'User % (%) promoted to admin.', v_email, v_user_id;
END;
$$;

-- Verify the result
SELECT id, display_name, role, is_active
FROM public.profiles
WHERE role = 'admin';
