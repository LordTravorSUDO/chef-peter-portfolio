# Chef Peter CMS — Handover Document

> **Website:** https://www.chefpetertheteacher.com
> **Repository:** https://github.com/LordTravorSUDO/chef-peter-portfolio
> **Deployed on:** Vercel
> **Database:** Supabase (PostgreSQL)
> **Slogan:** "Chosen for excellence, trained to excel."

---

## 1. Architecture and Repository Structure

### Technology stack
- **Frontend:** React 19 + Vite 6 + TypeScript
- **Styling:** Tailwind CSS v4
- **Rich text editor:** Tiptap 2
- **Routing:** React Router 6
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **SEO:** Vercel Edge Middleware (metadata injection) + React 19 native metadata
- **Scheduling:** Vercel Cron → Supabase RPC function
- **Deployment:** Vercel (auto-deploy from `main` branch)

### Repository structure
```
chef-peter-portfolio/
├── api/                        # Vercel serverless functions
│   ├── cron/publish-scheduled.ts  # Scheduled article publisher
│   ├── sitemap.ts              # Dynamic XML sitemap
│   └── redirects.ts            # Redirect rules API
├── middleware.ts               # Vercel Edge Middleware (SEO injection)
├── docs/                       # All documentation
│   ├── HANDOVER.md             # This document
│   ├── production-checklist.md # 15-step deployment checklist
│   ├── scheduling.md           # Scheduler setup guide
│   ├── seo-system.md           # SEO architecture
│   ├── security-notes.md       # RLS and security rationale
│   └── supabase-setup.md       # Supabase project setup guide
├── public/                     # Static assets (images, favicon, robots.txt)
├── src/
│   ├── components/
│   │   ├── admin/              # CMS admin components
│   │   │   ├── ArticleForm.tsx # Article editor with autosave, publishing
│   │   │   ├── RichTextEditor.tsx # Tiptap editor
│   │   │   ├── MediaPickerModal.tsx # Image selection modal
│   │   │   ├── RevisionHistory.tsx # Revision + event timeline
│   │   │   ├── AdminLayout.tsx  # Sidebar + mobile drawer
│   │   │   ├── ProtectedRoute.tsx # Auth guard
│   │   │   ├── DragDropZone.tsx # File upload zone
│   │   │   ├── MediaMetadataEditor.tsx # Alt text, caption, credit editor
│   │   │   └── seo/SeoQualityPanel.tsx # Editorial SEO checks
│   │   ├── blog/               # Public blog components
│   │   │   ├── ArticleCard.tsx  # Article card for listings
│   │   │   ├── ArticleGrid.tsx  # Shared grid + skeleton
│   │   │   ├── BlogLayout.tsx   # Blog page header/footer
│   │   │   ├── Breadcrumb.tsx   # Breadcrumb + JSON-LD
│   │   │   ├── FeaturedArticleHero.tsx # Hero banner
│   │   │   └── ResponsiveImage.tsx # Responsive image + srcset helper
│   │   └── [existing portfolio components]  # Navbar, HeroSection, etc.
│   ├── hooks/                  # React hooks
│   │   ├── useAuth.ts          # Supabase auth context
│   │   ├── useAutosave.ts      # Debounced autosave
│   │   ├── useUnsavedChanges.ts # beforeunload guard
│   │   ├── useDashboardStats.ts # Dashboard statistics
│   │   └── useRedirect.ts      # Old slug redirect resolution
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client (anon key, browser-safe)
│   │   ├── services/
│   │   │   ├── articles.ts     # Article CRUD + publishing + revisions
│   │   │   ├── auth.ts         # Sign in/out, session, profile
│   │   │   ├── media.ts        # Upload, metadata, responsive URLs
│   │   │   ├── taxonomy.ts      # Categories, tags, assignments
│   │   │   ├── redirects.ts    # Redirect rules
│   │   │   └── scheduler.ts    # Scheduler run history
│   │   └── seo/                # SEO utilities
│   │       ├── constants.ts    # Site URL, limits
│   │       ├── metadata.ts     # Head tag builders
│   │       └── quality.ts      # Editorial quality checks
│   ├── pages/
│   │   ├── admin/              # Admin CMS pages
│   │   │   ├── AdminLoginPage.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminArticlesPage.tsx
│   │   │   ├── AdminNewArticle.tsx
│   │   │   ├── AdminEditArticle.tsx
│   │   │   ├── ArticlePreviewPage.tsx
│   │   │   ├── AdminMediaPage.tsx
│   │   │   ├── AdminCategoriesPage.tsx
│   │   │   ├── AdminTagsPage.tsx
│   │   │   ├── AdminSeoPage.tsx
│   │   │   └── AdminSettingsPage.tsx
│   │   └── blog/               # Public blog pages
│   │       ├── BlogIndexPage.tsx
│   │       ├── ArticlePage.tsx
│   │       ├── CategoryPage.tsx
│   │       └── TagPage.tsx
│   ├── types/
│   │   ├── database.ts         # TypeScript types mirroring DB schema
│   │   └── article.ts          # Type re-exports
│   ├── data/                   # Static portfolio data (unchanged)
│   ├── App.tsx                 # Route tree
│   ├── main.tsx                # Entry point with BrowserRouter
│   └── index.css              # Tailwind + custom styles
├── supabase/
│   ├── migrations/             # 9 SQL migration files (run in order)
│   ├── seed/                   # Admin setup script
│   ├── tests/                  # 5 SQL test suites (112 assertions)
│   └── config.toml             # Supabase CLI config
├── index.html                  # SPA shell with SEO metadata
├── vercel.json                 # Vercel config (rewrites, crons, headers)
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config (excludes api/middleware)
├── tsconfig.api.json           # Separate config for api/ (Node.js)
└── package.json                # Dependencies (React, Vite, Tiptap, Supabase)
```

---

## 2. Administrator Access and Password Recovery

### Signing in
1. Go to https://www.chefpetertheteacher.com/admin/login
2. Enter the admin email and password
3. You will be redirected to the dashboard at /admin

### Creating the first admin (one-time setup)
1. In Supabase Dashboard → Authentication → Users → Add user
   - Enter Chef Peter's real email
   - Set a strong password (min 16 characters)
   - Do NOT enable "Auto Confirm" — the user must confirm via email
2. The `on_auth_user_created` trigger automatically creates a `profiles` row with `role = 'editor'`
3. Promote to admin: run `supabase/seed/01_admin_setup.sql` in the SQL Editor
   - Replace `YOUR_ADMIN_USER_EMAIL_HERE` with the real email
   - Run it
   - Verify output: "User ... promoted to admin"

### Password recovery
- **Forgot password:** Go to /admin/login → click "Forgot password?" → enter email → check inbox for reset link
- **Reset via Supabase:** Dashboard → Authentication → Users → click the user → "Send recovery email"
- **Change password (signed in):** /admin/settings → "Change password" section

### Disabling public sign-up (critical security setting)
Supabase Dashboard → Authentication → Settings → "Allow new users to sign up" → **OFF**

This prevents anyone from creating an account via the API. Only you can create users from the dashboard.

---

## 3. Writing, Editing, Previewing and Publishing Articles

### Creating a new article
1. Go to /admin → click "New article" (or the + button on the articles list)
2. Enter the title — a URL slug is auto-generated from the title
3. Write the excerpt (short summary for cards and search results)
4. Write the article body using the rich text editor
   - Toolbar: H2, H3, H4, bold, italic, underline, bullet/numbered lists, quotes, links, horizontal rules, images
   - Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline), Ctrl+Z (undo), Ctrl+Y (redo)
5. Select one or more categories and mark one as "Primary"
6. Select tags by clicking the tag chips
7. Select a featured image (click "Select featured image" → choose from media library or upload)
8. Click "Create draft" to save

### Editing an existing article
1. Go to /admin/articles → click the pencil icon on any article
2. The editor loads with all fields pre-filled
3. Changes are **auto-saved** every 4 seconds (the status indicator shows "Saving…", "Saved", or "Save failed")
4. You can also click "Save changes" manually
5. If you try to leave the page with unsaved changes, the browser will warn you

### Previewing
1. Click the "Preview" button in the right sidebar
2. A new browser tab opens showing the article exactly as readers will see it
3. This works for drafts too — no need to publish to preview

### Publishing
1. Click "Publish now" in the right sidebar
2. A confirmation dialog appears: "This will make the article immediately visible to the public"
3. Click "Publish" — the article is now live at /articles/your-slug
4. The article appears in /articles listing and the sitemap within minutes

### Unpublishing
1. On a published article, the "Publish now" button changes to "Unpublish (revert to draft)"
2. Click it → confirm → the article reverts to draft status
3. It is immediately invisible to the public (RLS enforces this at the database level)
4. The original publication date is preserved for re-publishing

### Scheduling
1. In the right sidebar, set a date/time in the "Schedule for" field
2. The editor shows both your local time and UTC for clarity
3. Click "Schedule publication"
4. The article stays private until the Vercel Cron job publishes it at the scheduled time
5. To cancel: click "Cancel schedule"

⚠️ **Scheduling requires the Vercel Cron to be configured.** See section 9 below.

### Archiving
1. Click "Archive" in the right sidebar → confirm
2. Archived articles are hidden from public listings but preserved in the database
3. They can be deleted from the articles list (Archive → Delete)

---

## 4. Uploading and Managing Photographs

### Uploading images
1. Go to /admin/media → drag and drop images onto the upload zone, or click to browse
2. Upload progress bars show per-file status (uploading → done/failed)
3. Accepted formats: JPEG, PNG, WebP, GIF, AVIF, SVG — max 10 MB per file
4. Files are validated by both extension AND content (magic bytes) to prevent disguised uploads

### Managing images
1. Click any image in the grid to open the detail panel
2. Edit alt text (required for editorial images), caption, and credit
3. Click "Save metadata" to persist changes
4. Copy the public URL using the "Copy" button
5. Delete: click the red "Delete" button — you'll be warned if the image is used by articles

### Reusing images
1. In the article editor, click "Select featured image" or "Select social image"
2. The MediaPickerModal opens — browse or search the library
3. Click an image to select it, then "Confirm"
4. You can also upload new images directly from the picker

### Inserting images into article body
1. In the rich text editor toolbar, click the image icon
2. The MediaPickerModal opens
3. Select an image (or upload one) — it is inserted at the cursor position
4. Alt text from the media library is preserved

### Alt text indicators
- **Green dot** on a thumbnail: alt text is set
- **Amber dot**: alt text is missing — add it for accessibility and SEO

---

## 5. Managing Categories and Tags

### Categories
- Go to /admin/categories
- Click "Add category" → enter name, slug (auto-generated), and optional description
- Edit: click the pencil icon → modify fields → "Save"
- Delete: click the trash icon → confirm. Articles in this category become uncategorised.

### Tags
- Go to /admin/tags
- Click "Add tag" → enter name, slug (auto-generated)
- Delete: click the X on the tag chip. The tag is removed from all articles.

### Assigning to articles
- In the article editor, check category boxes and click "Primary" on one
- Click tag chips to toggle selection

---

## 6. Using SEO Fields

### In the article editor, expand "SEO settings":
- **SEO title:** Overrides the page `<title>`. Max 70 characters. Falls back to article title.
- **Meta description:** Short text for search results. Max 160 characters. Falls back to excerpt.
- **Canonical URL:** Set only if the article is syndicated from another site. Leave empty for default.
- **Social sharing image:** Separate from featured image. Used for og:image and Twitter Card. Falls back to featured image.
- **noindex:** Check to exclude this article from search engines and the sitemap.

### SEO quality panel
- Appears below the editor, showing a summary badge
- Click to expand: see all checks sorted by severity (errors → warnings → info)
- Checks: title length, meta description length, featured image + alt text, body word count, H1 conflicts, broken admin links, noindex status
- **These are suggestions, not guarantees of search ranking**

### Sitemap
- Automatically generated at /sitemap.xml (served by /api/sitemap)
- Includes only published, non-noindex articles
- Updates automatically when you publish or unpublish

---

## 7. Scheduling and Revisions

### How scheduling works
1. You set a future date/time and click "Schedule publication"
2. The article is saved with `status = 'scheduled'` — invisible to the public
3. Vercel Cron calls /api/cron/publish-scheduled every minute
4. The cron endpoint calls the `publish_scheduled_articles()` Postgres function
5. This function finds articles where `scheduled_for <= NOW()` and flips them to published
6. The process is **idempotent** — running it multiple times has no adverse effect
7. Every run is logged in the `scheduler_runs` table

### Scheduler setup
**Option A — Vercel Cron (requires Vercel Pro $20/month):**
Already configured in `vercel.json`. Just set `CRON_SECRET` in Vercel env vars.

**Option B — Supabase pg_cron (free):**
In Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'publish-scheduled-articles',
  '* * * * *',
  $$ SELECT public.publish_scheduled_articles('pg_cron') $$
);
```

### How revisions work
- A revision is created **automatically** by a database trigger whenever the title, body, or excerpt changes
- Revisions capture the **previous** state (before the change)
- Status-only changes (publish, unpublish, archive) do NOT create revisions
- The revision history panel (in the editor, below SEO settings) shows a merged timeline of content revisions and publication events

### Restoring a revision
1. Expand "Revision history & events" in the editor
2. Click the eye icon to preview any revision's content
3. Click the restore icon (circular arrow) → confirm
4. The revision's content is written back to the article, creating a new revision
5. The published version is preserved until the restore save completes

---

## 8. Environment Variables and Integrations

### Required environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | .env + Vercel (all envs) | Supabase project URL (browser-visible) |
| `VITE_SUPABASE_ANON_KEY` | .env + Vercel (all envs) | Supabase anon key (browser-visible, RLS-enforced) |
| `VITE_WEB3FORMS_ACCESS_KEY` | .env + Vercel (all envs) | Web3Forms contact form delivery |
| `SUPABASE_URL` | Vercel (Prod + Preview only) | Server-side Supabase URL (for API routes + middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Prod + Preview only) | Service-role key — bypasses RLS. NEVER in browser. |
| `CRON_SECRET` | Vercel (Prod + Preview only) | Authenticates Vercel Cron calls |

⚠️ **Never add `VITE_` prefix to `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET`.** That would bundle them into the browser JavaScript.

### Integrations
- **Supabase:** PostgreSQL database, Auth, Storage — all in one project
- **Web3Forms:** Contact form email delivery (free tier)
- **Vercel:** Hosting, Edge Middleware, Cron jobs, serverless functions
- **Google Fonts:** Playfair Display, Plus Jakarta Sans, Cormorant Garamond

---

## 9. Backups, Troubleshooting and Recovery

### Backups
- **Database:** Supabase automated daily backups (7-day retention on free plan, 30-day on Pro)
- **Media:** Storage objects are NOT in database backups. Manually export via Supabase Dashboard → Storage
- **Code:** Version-controlled in Git. Every deployment is a Git commit.

### Recovery
- **Bad deployment:** Vercel Dashboard → Deployments → find last good → "Promote to Production"
- **Bad migration:** Supabase Dashboard → Database → Backups → Point-in-time restore (Pro plan)
- **Lost admin access:** Supabase Dashboard → SQL Editor → run `supabase/seed/01_admin_setup.sql` with the admin email

### Troubleshooting
| Problem | Check |
|---|---|
| /admin/login shows error | Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel env vars |
| Articles don't load | Run `supabase/tests/rls_access_control.sql` to verify RLS |
| Scheduled articles not publishing | Check Vercel Dashboard → Cron Jobs; check `scheduler_runs` table in Supabase |
| Sitemap empty | Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel; check /api/sitemap logs |
| Images not loading | Verify `article-media` Storage bucket is public; check policies |
| SEO metadata missing in raw HTML | Verify middleware.ts is deployed; check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY |
| Build fails | Run `npm run lint` locally — fix TypeScript errors before pushing |

---

## 10. How to Update and Redeploy the Website

### Making code changes
```bash
git pull origin main
# Make your changes
npm run lint      # Verify TypeScript passes
npm run build     # Verify build passes
git add -A
git commit -m "Description of changes"
git push origin main
```

Vercel auto-deploys from the `main` branch. The deployment appears in Vercel Dashboard within seconds.

### Running database migrations
When a new migration file is added to `supabase/migrations/`:
1. Read the migration file to understand what it changes
2. In Supabase Dashboard → SQL Editor → paste the migration → Run
3. Run the relevant test file from `supabase/tests/` to verify

### Adding new environment variables
1. Add to `.env` locally (for development)
2. Add to `.env.example` (for documentation)
3. Add to Vercel Dashboard → Project → Settings → Environment Variables
4. Redeploy (push a commit or trigger a redeploy in Vercel)

### Rollback
1. Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Three-dot menu → "Promote to Production"
4. The previous version is instantly live

---

## Appendix: Database Migrations (run in order)

| # | File | Creates |
|---|---|---|
| 1 | 20260101000000_initial_extensions.sql | pgcrypto, pg_trgm, citext extensions |
| 2 | 20260101000001_enums.sql | article_status, user_role enums |
| 3 | 20260101000002_profiles.sql | profiles table, is_admin() function |
| 4 | 20260101000003_media.sql | media table |
| 5 | 20260101000004_taxonomy.sql | categories, tags tables |
| 6 | 20260101000005_articles.sql | articles table, join tables, RLS |
| 7 | 20260101000006_article_revisions.sql | article_revisions table, revision trigger |
| 8 | 20260101000007_redirects.sql | redirects table |
| 9 | 20260201000000_scheduler.sql | scheduler_runs, article_events, publish_scheduled_articles() |
