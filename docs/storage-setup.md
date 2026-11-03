# Supabase Storage Bucket Setup

## Problem

Image uploads fail with "container not found" or "Bucket not found" because the
`article-media` storage bucket has not yet been created in your Supabase project.

## Solution

Create the bucket in Supabase Dashboard. You only need to do this once.

---

## Step 1 — Create the bucket

1. Open **Supabase Dashboard** → **Storage** → **New bucket**
2. Set these values exactly:

   | Field | Value |
   |---|---|
   | **Name** | `article-media` |
   | **Public bucket** | ✅ YES (images must be publicly readable for the website) |
   | **File size limit** | `10485760` (10 MB) |
   | **Allowed MIME types** | `image/jpeg, image/png, image/webp, image/gif, image/avif, image/svg+xml` |

3. Click **Create bucket**

> ⚠️ The bucket name **must be exactly** `article-media` — the code references
> this name directly in `src/lib/supabase.ts` (`MEDIA_BUCKET = 'article-media'`).
> Do not use a different name.

---

## Step 2 — Set Storage policies

In **Storage → article-media → Policies**, create three policies:

### Policy 1: Public read (SELECT)
- Name: `Public read media`
- Operation: SELECT
- Roles: `anon`, `authenticated`
- Expression: `true`

### Policy 2: Authenticated upload (INSERT)
- Name: `Authenticated users upload`
- Operation: INSERT
- Roles: `authenticated`
- Expression: `true`

### Policy 3: Admin delete (DELETE)
- Name: `Admin delete media`
- Operation: DELETE
- Roles: `authenticated`
- Expression: `(auth.uid() IS NOT NULL)`

---

## Step 3 — Test

After creating the bucket:

1. Go to `/admin/media` in the CMS
2. Drag an image onto the upload zone or click "Upload"
3. The image should upload and appear in the grid

If it still fails, check:
- Is `VITE_SUPABASE_URL` pointing to the correct Supabase project?
- Is the bucket named exactly `article-media`?
- Is the bucket set to **public**?

---

## SQL alternative (run in Supabase SQL Editor)

If you prefer SQL over the dashboard UI:

```sql
-- This creates the bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-media',
  'article-media',
  TRUE,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read media" ON storage.objects
  FOR SELECT USING (bucket_id = 'article-media');

-- Authenticated upload policy
CREATE POLICY "Authenticated upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'article-media'
    AND auth.role() = 'authenticated'
  );

-- Admin delete policy
CREATE POLICY "Admin delete media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'article-media'
    AND auth.uid() IS NOT NULL
  );
```

> ⚠️ Run `ON CONFLICT (id) DO NOTHING` — this is safe to re-run if the bucket
> already exists. It will not overwrite it or lose existing files.
