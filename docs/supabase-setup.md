# Supabase Setup — Step-by-Step Manual Guide

This document is the single reference for creating and configuring the
Supabase project for Chef Peter's CMS. Follow every step in order.

---

## Prerequisites

- A Supabase account at https://supabase.com (free tier is sufficient)
- Access to the project's `.env` file
- Access to Vercel environment variable settings

---

## Step 1 — Create the Supabase Project

1. Log in to https://supabase.com/dashboard
2. Click **New project**
3. Settings:
   - **Name:** `chef-peter-cms` (or any name you prefer)
   - **Database password:** Generate a strong random password — save it in a
     password manager. You will never need it in code, but you need it to
     connect via a database client if ever required.
   - **Region:** Choose the region closest to Uganda (e.g. `eu-west-1` or
     `ap-southeast-1`; Supabase does not have an East Africa region yet)
   - **Plan:** Free
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Copy the API credentials

1. In your project dashboard go to **Settings → API**
2. Copy:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon / public key** — a long JWT starting with `eyJ`

   > ⚠️ Do NOT copy the `service_role` key. It bypasses all RLS policies
   > and must never appear in browser code or be committed to git.

3. Add both values to your local `.env` file:
   ```
   VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Also add both to **Vercel → Project → Settings → Environment Variables**
   (for all environments: Production, Preview, Development).

---

## Step 3 — Disable Public Sign-Up

1. Go to **Authentication → Settings**
2. Under **User Signups**, toggle **"Allow new users to sign up"** to **OFF**
3. Click **Save**

This prevents anyone from creating an account via the public API.
Admin accounts are created only by you, from the dashboard.

---

## Step 4 — Apply the Database Migrations

Copy and run each migration file **in order** in
**SQL Editor → New query → Paste → Run**:

| Order | File |
|-------|------|
| 1 | `supabase/migrations/20260101000000_initial_extensions.sql` |
| 2 | `supabase/migrations/20260101000001_enums.sql` |
| 3 | `supabase/migrations/20260101000002_profiles.sql` |
| 4 | `supabase/migrations/20260101000003_media.sql` |
| 5 | `supabase/migrations/20260101000004_taxonomy.sql` |
| 6 | `supabase/migrations/20260101000005_articles.sql` |
| 7 | `supabase/migrations/20260101000006_article_revisions.sql` |
| 8 | `supabase/migrations/20260101000007_redirects.sql` |

Each migration is idempotent — safe to re-run if needed.

After running all migrations, verify the tables exist:
**Table Editor** should list: `profiles`, `media`, `categories`, `tags`,
`articles`, `article_categories`, `article_tags`, `article_revisions`,
`redirects`.

---

## Step 5 — Create the Admin User Account

1. Go to **Authentication → Users → Add user** (or "Invite user")
2. Enter Chef Peter's real email address and a strong password
   - The password should be at least 16 characters
   - Do NOT use a password you use anywhere else
3. Click **Create user**
4. The `on_auth_user_created` trigger will automatically create a `profiles`
   row with `role = 'editor'`

---

## Step 6 — Promote the User to Admin

1. Open **SQL Editor → New query**
2. Paste the contents of `supabase/seed/01_admin_setup.sql`
3. Replace `YOUR_ADMIN_USER_EMAIL_HERE` with the real email address

   > ⚠️ Do NOT commit the real email address to git. Replace it back with
   > the placeholder before saving if you edit the file.

4. Click **Run**
5. Confirm the output shows:
   ```
   NOTICE: User chef@example.com (uuid) promoted to admin.
   ```
6. Verify in **Table Editor → profiles** that `role = 'admin'`

---

## Step 7 — Create the Storage Bucket

1. Go to **Storage → New bucket**
2. Settings:
   - **Name:** `article-media`  ← must match exactly (used in code)
   - **Public bucket:** ✅ **Yes** — images must be publicly readable for the website
   - **File size limit:** `10485760` (10 MB)
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/gif, image/avif, image/svg+xml`
3. Click **Create bucket**

---

## Step 8 — Set Storage Bucket Policies

In **Storage → article-media → Policies**, create these policies:

### Policy 1: Public read (SELECT)
- **Policy name:** `Public read media`
- **Allowed operation:** SELECT
- **Target roles:** `anon`, `authenticated`
- **Policy definition:** `true`

### Policy 2: Authenticated upload (INSERT)
- **Policy name:** `Authenticated users upload`
- **Allowed operation:** INSERT
- **Target roles:** `authenticated`
- **Policy definition:** `true`

### Policy 3: Owner or admin delete (DELETE)
- **Policy name:** `Owner or admin delete`
- **Allowed operation:** DELETE
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  auth.uid()::text = (storage.foldername(name))[1]
  OR public.is_admin()
  ```

> Note: Storage policies use the SQL Editor-style syntax in the Supabase
> dashboard. If the UI policy builder doesn't support the above, switch to
> "custom" policy and paste the SQL directly.

---

## Step 9 — Run the RLS Access Control Tests

1. Open **SQL Editor → New query**
2. Paste the entire contents of `supabase/tests/rls_access_control.sql`
3. Click **Run**
4. Read the output — every line should say `TEST N PASS`
5. If any line says `FAIL`, review the corresponding migration and RLS policy

---

## Step 10 — Verify Environment Variables

Confirm these variables are set:

| Variable | Where | Value source |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` + Vercel | Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` + Vercel | Dashboard → Settings → API → anon key |
| `VITE_WEB3FORMS_ACCESS_KEY` | `.env` + Vercel | Already configured |

---

## Using the Supabase CLI (optional, for migration management)

If you want to manage migrations via CLI instead of the dashboard:

```bash
# Install globally
npm install -g supabase

# Log in
supabase login

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Push all local migrations to the remote database
supabase db push

# Regenerate TypeScript types from the live schema
npx supabase gen types typescript --project-id YOUR_PROJECT_REF \
  --schema public > src/types/database.ts
```

The `YOUR_PROJECT_REF` is the part of your Supabase URL before `.supabase.co`
(e.g. if URL is `https://abcdefghijkl.supabase.co`, the ref is `abcdefghijkl`).

---

## Summary of Credentials Required

| Credential | Who holds it | Used where |
|---|---|---|
| Supabase Project URL | Developer + Vercel env | `.env` + Vercel settings |
| Supabase anon key | Developer + Vercel env | `.env` + Vercel settings |
| Supabase service role key | **Never used** | **Do not paste anywhere** |
| Database password | Developer only | Password manager only |
| Admin email + password | Chef Peter | Supabase Auth login |
