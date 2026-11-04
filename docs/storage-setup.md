# Supabase Storage Setup (CMS images)

## How image storage works

| Item | Value |
|---|---|
| Provider | Supabase Storage (same project as the database) |
| Bucket | `article-media` (override with `VITE_SUPABASE_MEDIA_BUCKET`) |
| Access | Public read (images appear on the public website); upload/delete: active CMS admins only |
| Upload endpoint | `POST {VITE_SUPABASE_URL}/storage/v1/object/article-media/articles/YYYY/MM/<time>-<uuid>.<ext>` |
| Upload auth | `apikey: <anon key>` + `Authorization: Bearer <signed-in user's access token>` |
| Public URL | `{VITE_SUPABASE_URL}/storage/v1/object/public/article-media/<path>` |
| Limits | 10 MB; JPEG, PNG, WebP, GIF, AVIF, SVG (checked in the browser by file content and by the bucket on the server) |
| Metadata | `public.media` row per file (path, type, size, dimensions, alt text, caption, credit) |

## Setup

1. Run `supabase/migrations/20261104000000_storage_article_media.sql` in the
   Supabase SQL Editor (after the earlier migrations).
   - If it stops with *"bucket article-media does not exist, but this project
     already has: …"*, one of the listed buckets may already hold the images.
     Point the app at it instead of creating a new one: set `v_bucket` in the
     migration and `VITE_SUPABASE_MEDIA_BUCKET` in Vercel to that name, then re-run.
   - If it stops because the bucket is **private**: the website loads images
     from public URLs, so the bucket must be public-read. Set
     `v_confirm_make_public := TRUE` and re-run.
2. Run `supabase/tests/storage_policies.sql` — expect `ALL CHECKS PASSED`.

## Environment variables (Vercel → Settings → Environment Variables)

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Must be the project where the bucket and tables live (compare the project ref with Dashboard → Settings → API). |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key of the same project. |
| `VITE_SUPABASE_MEDIA_BUCKET` | no | Only if the image bucket is not called `article-media`. |
| `VITE_SUPABASE_IMAGE_TRANSFORMS` | no | `true` only if the Supabase image-transformation add-on is enabled; then resized images and `srcset` are used. |

The service-role key is never used for uploads and must never have a `VITE_` prefix.

## Diagnosing upload errors

The upload error message names the bucket, the Supabase host and the raw
server response, e.g. `(HTTP 404: Bucket not found)`. For a full read-only
report run `supabase/diagnostics/storage_diagnostics.sql`.

| Message | Cause | Fix |
|---|---|---|
| bucket … does not exist in this Supabase project | Bucket missing in the project `VITE_SUPABASE_URL` points to | Run the storage migration, or set `VITE_SUPABASE_MEDIA_BUCKET` |
| Permission denied by the storage policies | Account is not an active admin, or policies missing | Check `profiles.role`; run the storage migration |
| did not answer like Supabase Storage | `VITE_SUPABASE_URL` points somewhere else | Fix the variable in Vercel and redeploy |
| session has expired | Expired login | Sign out and in again |
