# Production Deployment Checklist

## Status: NOT YET DEPLOYED
Vercel credentials and Supabase project are still being configured.
Complete every item below before marking this project as production-ready.

---

## PRE-DEPLOYMENT — complete locally first

### 1. Environment variables
- [ ] `VITE_SUPABASE_URL` is set in `.env` to your real Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` is set in `.env` to your real anon key
- [ ] `VITE_WEB3FORMS_ACCESS_KEY` is set in `.env` to your Web3Forms key
- [ ] `SUPABASE_URL` (server-only) is set in Vercel env vars
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only, **never in .env committed to git**) is set in Vercel env vars
- [ ] `CRON_SECRET` is set in Vercel env vars (`openssl rand -hex 32`)
- [ ] `.env` is listed in `.gitignore` (confirmed ✅ — `.env*` rule, with `!.env.example` exception)
- [ ] `.env.example` documents all required variables (confirmed ✅)

### 2. Database migrations
Run these in order in Supabase Dashboard → SQL Editor → New query:

| # | File | Status |
|---|---|---|
| 1 | `supabase/migrations/20260101000000_initial_extensions.sql` | ⬜ Applied |
| 2 | `supabase/migrations/20260101000001_enums.sql` | ⬜ Applied |
| 3 | `supabase/migrations/20260101000002_profiles.sql` | ⬜ Applied |
| 4 | `supabase/migrations/20260101000003_media.sql` | ⬜ Applied |
| 5 | `supabase/migrations/20260101000004_taxonomy.sql` | ⬜ Applied |
| 6 | `supabase/migrations/20260101000005_articles.sql` | ⬜ Applied |
| 7 | `supabase/migrations/20260101000006_article_revisions.sql` | ⬜ Applied |
| 8 | `supabase/migrations/20260101000007_redirects.sql` | ⬜ Applied |
| 9 | `supabase/migrations/20260201000000_scheduler.sql` | ⬜ Applied |

### 3. Administrator account
- [ ] Public sign-up disabled: Authentication → Settings → "Allow new users to sign up" = OFF
- [ ] Admin user created: Authentication → Users → Add user (strong password)
- [ ] Admin promoted: run `supabase/seed/01_admin_setup.sql` with real email substituted
- [ ] Verify in Table Editor: `profiles` table shows `role = 'admin'` for that user

### 4. Storage bucket
- [ ] `article-media` bucket created: Storage → New bucket
- [ ] Bucket is **public** (images must be publicly readable)
- [ ] 10 MB file size limit set
- [ ] Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml`
- [ ] Storage policies set (see `docs/supabase-setup.md` Step 8)

### 5. Security tests
- [ ] Run `supabase/tests/rls_access_control.sql` — all 8 tests PASS
- [ ] Run `supabase/tests/article_workflow.sql` — all 14 tests PASS
- [ ] Run `supabase/tests/media_workflow.sql` — all 11 tests PASS
- [ ] Run `supabase/tests/seo_workflow.sql` — all 12 tests PASS
- [ ] Run `supabase/tests/scheduler_workflow.sql` — all 10 tests PASS

### 6. Local build verification
```bash
npm run lint     # TypeScript — must be 0 errors
npm run build    # Vite build — must succeed
```
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] No secrets in dist/ bundles (verified by audit ✅)

---

## DEPLOYMENT TO VERCEL

### 7. Vercel project setup
- [ ] Project connected to the GitHub repository
- [ ] Framework preset: **Vite** (auto-detected)
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Install command: `npm install`

### 8. Vercel environment variables
Set these in Vercel Dashboard → Project → Settings → Environment Variables.
Use **Production** + **Preview** for server-only vars. All environments for VITE_ vars.

| Variable | Value source | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | All |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | All |
| `VITE_WEB3FORMS_ACCESS_KEY` | web3forms.com dashboard | All |
| `VITE_AUTHOR_PROFILES` | Set to `on` **only after** `supabase/proposed/20261107000000_author_profiles.sql` has been applied (leave unset until then) | All |
| `SUPABASE_URL` | Same as VITE_SUPABASE_URL | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | Production + Preview |
| `CRON_SECRET` | `openssl rand -hex 32` | Production + Preview |

- [ ] All 6 variables set in Vercel

### 9. Deploy
```bash
git add -A
git commit -m "Production build — Chef Peter CMS"
git push origin main
```
- [ ] Deployment triggered and succeeded in Vercel Dashboard
- [ ] No build errors in Vercel build logs

---

## POST-DEPLOYMENT VERIFICATION

### 10. Core pages
- [ ] `https://www.chefpetertheteacher.com/` — portfolio homepage loads
- [ ] `https://www.chefpetertheteacher.com/articles` — article listing loads (may be empty)
- [ ] `https://www.chefpetertheteacher.com/admin/login` — login page loads

### 11. SEO verification
```bash
curl -s https://www.chefpetertheteacher.com/ | grep -E "<title>|canonical"
# Expected: "Chef Peter the Teacher | Private Chef & Culinary Consultant Uganda"

curl -s https://www.chefpetertheteacher.com/sitemap.xml
# Expected: XML with homepage + /articles, no draft/scheduled URLs

curl -s https://www.chefpetertheteacher.com/robots.txt
# Expected: Disallow: /admin/ and Disallow: /api/
```
- [ ] Homepage SEO title correct
- [ ] Sitemap XML valid
- [ ] robots.txt correct

### 12. Admin access
- [ ] Sign in at `/admin/login` with the created admin account
- [ ] Dashboard loads and shows real article counts (0 on fresh install)
- [ ] Can create a test draft article and save it
- [ ] Draft is NOT visible at the public URL
- [ ] Can publish the article
- [ ] Published article appears at `/articles`

### 13. Scheduler
- [ ] Vercel Cron is visible in Dashboard → Project → Cron Jobs
- [ ] Create a scheduled article 2 minutes in the future
- [ ] Wait 3 minutes; article should be auto-published
- [ ] `scheduler_runs` table in Supabase has at least one successful run

  ⚠️ **Note:** Vercel Hobby plan supports crons once per day only.
  For minute-level scheduling, use Vercel Pro ($20/month) or Supabase pg_cron (free).
  See `docs/scheduling.md` for pg_cron setup.

### 14. Edge middleware
After publishing one article, verify metadata injection:
```bash
curl -s https://www.chefpetertheteacher.com/articles/YOUR_SLUG | grep "<title>"
# Expected: article-specific title (not the homepage title)
```
- [ ] Article page returns correct `<title>` in raw HTML
- [ ] Social sharing preview correct (test at https://www.opengraph.xyz/)

### 15. Google Search Console
- [ ] Add property for `https://www.chefpetertheteacher.com`
- [ ] Submit sitemap: `https://www.chefpetertheteacher.com/sitemap.xml`
- [ ] Request indexing for `/articles` after first article is published

---

## ROLLBACK PROCEDURE

If a deployment introduces a regression:

### Immediate rollback (< 2 minutes)
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click the three-dot menu → **Promote to Production**
4. The previous deployment is instantly live

### Database rollback
The database is NOT automatically rolled back with a deployment rollback.
If a migration caused a problem:

1. Do NOT run `DROP TABLE` or `DELETE` unless you are certain
2. For additive migrations (new table/column), rollback is usually safe:
   ```sql
   DROP TABLE IF EXISTS public.table_name;
   ```
3. For destructive migrations, restore from Supabase backup:
   Supabase Dashboard → Project → Database → Backups → Point-in-time restore
   (Available on Supabase Pro plan)

### Environment variable rollback
If a bad env var was deployed:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Update the variable
3. Redeploy (or promote a previous deployment)

---

## BACKUP AND RECOVERY

### Supabase automated backups
- Free plan: daily backups retained for 7 days (point-in-time restore NOT available)
- Pro plan: daily backups + point-in-time restore to any second in the last 7 days

### Manual export
```bash
# Export all article data
# In Supabase Dashboard → SQL Editor:
COPY (SELECT * FROM public.articles) TO '/tmp/articles_backup.csv' CSV HEADER;
# Or use the Supabase CLI:
supabase db dump --file backup.sql
```

### Media files
Media is stored in Supabase Storage (`article-media` bucket). Storage objects are
NOT included in the standard database backup. To back up media:
- Supabase Dashboard → Storage → article-media → Download (manual)
- Or use the Supabase Management API to list and download objects programmatically

### Recommended backup schedule
- Database: rely on Supabase daily automated backups
- Media: export monthly or after significant uploads
- Code: version-controlled in Git — rollback is instant via Vercel
