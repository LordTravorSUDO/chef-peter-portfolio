-- =============================================================================
-- STORAGE DIAGNOSTICS — read-only. Changes nothing.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor for the project that the website's
-- VITE_SUPABASE_URL points to (Vercel → Settings → Environment Variables;
-- compare the project ref in that URL with Dashboard → Settings → API).
-- Each query returns one result set; run them all and compare with the notes.
-- =============================================================================

-- 1. Buckets. Expected: a row "article-media" with public = true.
--    No row → the bucket does not exist in THIS project (uploads fail with
--    "Bucket not found"). A different name → the app is pointed at the wrong
--    bucket (set VITE_SUPABASE_MEDIA_BUCKET instead of creating a new one).
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY created_at;

-- 2. Policies on storage.objects. Expected after the storage migration:
--    cms_media_public_read (SELECT), cms_media_admin_insert (INSERT),
--    cms_media_admin_delete (DELETE). Policies with qual/with_check = true and
--    no bucket_id condition apply to every bucket and should be reviewed.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- 3. Policies on public.media.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'media'
ORDER BY cmd, policyname;

-- 4. Objects already stored, per bucket (nothing is deleted).
SELECT bucket_id, count(*) AS objects, pg_size_pretty(sum(coalesce((metadata->>'size')::bigint, 0))) AS total_size
FROM storage.objects
GROUP BY bucket_id;

-- 5. Media rows vs stored files: rows whose file is missing would show broken images.
SELECT m.id, m.storage_path, m.created_at
FROM public.media m
LEFT JOIN storage.objects o ON o.name = m.storage_path
WHERE o.id IS NULL
ORDER BY m.created_at DESC
LIMIT 50;

-- 6. CMS admins. Expected: your account with role = admin and is_active = true.
SELECT u.email, p.role, p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;
