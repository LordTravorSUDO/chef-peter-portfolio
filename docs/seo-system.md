# SEO System — Chef Peter CMS

## Architecture Overview

This is a **Vite SPA with Vercel Edge Middleware** for server-side metadata injection.

### Why Edge Middleware, not full SSR

The application must stay on React/Vite (no Next.js migration). The correct
approach for a Vite SPA that needs real metadata in the initial HTML is:

1. **Vercel Edge Middleware** (`middleware.ts`) — intercepts HTTP requests for
   article, category, and tag pages before the CDN serves `index.html`.
   Reads the article from Supabase using the service-role key, builds the
   correct `<title>`, `<meta>`, and JSON-LD, and injects them into the HTML
   response. The React app then hydrates normally in the browser.

2. **React 19 native metadata hoisting** — browser-side metadata updates
   using `<title>`, `<meta>`, etc. directly in JSX. Handles navigation between
   articles without full page reloads.

Both layers work together. The middleware ensures crawlers and social sharing
previews receive real metadata. React 19 hoisting ensures the browser tab title
and meta tags update correctly when navigating client-side.

---

## Components

| File | Purpose |
|---|---|
| `middleware.ts` | Vercel Edge Middleware — injects metadata into HTML before serving |
| `api/sitemap.ts` | Serverless function — dynamic XML sitemap from Supabase |
| `api/redirects.ts` | Serverless function — returns active redirect rules as JSON |
| `src/lib/seo/constants.ts` | Shared constants (site URL, limits, etc.) |
| `src/lib/seo/metadata.ts` | Metadata derivation and HTML-building utilities |
| `src/lib/seo/quality.ts` | Editorial SEO quality checks for the admin editor |
| `src/components/admin/seo/SeoQualityPanel.tsx` | Quality check panel in article editor |
| `src/hooks/useRedirect.ts` | Client-side redirect resolution for old article slugs |
| `supabase/tests/seo_workflow.sql` | SQL tests for sitemap query, redirects, constraints |

---

## Environment Variables

| Variable | Where to set | Purpose |
|---|---|---|
| `SUPABASE_URL` | Vercel env vars (server-only, no VITE_ prefix) | Supabase project URL for Edge Middleware and API routes |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars (server-only, **never browser**) | Full Supabase access for server-side article reads |
| `VITE_SUPABASE_URL` | Vercel env vars (browser-safe) | Supabase URL for client-side queries |
| `VITE_SUPABASE_ANON_KEY` | Vercel env vars (browser-safe) | Supabase anon key for client-side queries |

**Critical:** `SUPABASE_SERVICE_ROLE_KEY` must NEVER have the `VITE_` prefix.
It would be bundled into the client-side JavaScript and expose full database access.

---

## How Metadata Injection Works

1. A crawler or social bot requests `https://www.chefpetertheteacher.com/articles/sourdough-guide`
2. Vercel routes the request to the Edge Middleware
3. The middleware matches the `/articles/:slug` pattern
4. It fetches the article from Supabase using the service-role key
5. It builds the correct `<title>`, `<meta>`, and JSON-LD for that article
6. It injects the metadata into `index.html` via the `<!-- __SEO_INJECTION__ -->` placeholder
7. The modified HTML is returned to the crawler with correct metadata in the initial response
8. When a human browser loads the page, React hydrates and takes over

---

## Dynamic Sitemap

`/sitemap.xml` redirects to `/api/sitemap`, which builds the XML with
`src/lib/seo/sitemap.ts` (unit-tested in `tests/unit/seo-sitemap.test.ts`).

It includes:
- Homepage (`/`) and the library (`/articles`)
- Every prerendered landing page (`SEO_PAGES` in `src/data/seoPages.ts`)
- Published, indexable articles (`published_at` in the past, `noindex = false`)
- Category pages that contain at least one such article and are not hidden

It excludes drafts, scheduled, archived and noindex articles, tag pages
(noindex), search/filter URLs, admin and API routes.

`lastmod` is only given where a real date is known (the article's last update,
or the newest article in a category) — never "now".

`robots.txt` disallows `/api/` but explicitly allows `/api/sitemap`, so crawlers
can follow the `/sitemap.xml` redirect. **A sitemap helps discovery; it does not
guarantee that a page is indexed.** Check indexing in Google Search Console.

The sitemap is cached at the Vercel edge for 30 minutes. If Supabase is
unavailable, the static pages are still listed.

---

## Platform Limitation — HTTP Status Codes

Vercel SPA rewrites return HTTP 200 for unknown URLs, so a missing article
cannot return a true 404 without a server-rendered route.

**What is implemented instead:**
- Missing articles, categories and tags: `X-Robots-Tag: noindex, follow` and a
  `noindex` meta tag, so the "not found" page is never indexed
- **Moved** articles, categories and tags: the Edge middleware looks up the
  `redirects` table and returns a real **301/302** with a `Location` header
- The React app also follows redirects client-side (`useRedirect`) and renders
  a clear "not found" page for visitors

---

## SEO Quality Checks (Admin Editor)

The article editor runs automated checks on the current form data and displays
suggestions in a collapsible panel. These check for:

- Missing or too-long/short SEO title and meta description
- Missing featured image and alt text
- Empty or very short article body
- H1 headings in the body (the article title is already the H1)
- Missing section headings (H2) in long articles
- Admin links in article body
- noindex flag status

**These are editorial suggestions, not ranking guarantees.**

---

## Redirects

- **Automatic:** when the slug of an article that has been published is
  changed in the editor, a 301 redirect from the old address to the new one is
  created (`recordSlugChange` in `src/lib/services/redirects.ts`). Older
  redirects that pointed at the old address are repointed, so there are no
  redirect chains.
- **Manual:** Admin → SEO health → Redirects lets an administrator add, switch
  off or delete redirects. Only same-site paths are accepted; loops and
  duplicates are rejected.
- **Served by the Edge middleware** as real HTTP 301/302 responses for
  `/articles/*`, `/category/*` and `/tag/*` when the page no longer exists.
  Redirect targets must be root-relative paths (no external redirects).

`vercel.json` no longer needs to be edited for article redirects.

---

## Testing Checklist

After deploying to Vercel with all environment variables set:

### 1. Verify metadata in raw HTTP response
```bash
curl -s https://www.chefpetertheteacher.com/articles/YOUR_SLUG | grep -E "<title>|<meta name=\"description\"|og:title|canonical"
```
Expected: article-specific title, description, and canonical URL in the HTML.

### 2. Verify draft privacy
```bash
curl -s https://www.chefpetertheteacher.com/articles/YOUR_DRAFT_SLUG | grep -E "<title>|X-Robots-Tag"
```
Expected: "Article Not Found" title, noindex header.

### 3. Verify sitemap
```bash
curl -s https://www.chefpetertheteacher.com/sitemap.xml
```
Expected: XML with article URLs. Drafts and noindex articles must NOT appear.

### 4. Verify robots.txt
```bash
curl -s https://www.chefpetertheteacher.com/robots.txt
```
Expected: `Disallow: /admin/` and `Disallow: /api/` present. `/articles/` must NOT be disallowed.

### 5. Structured data validation
Paste an article URL into https://search.google.com/test/rich-results
Expected: BlogPosting schema detected, no errors.

### 6. Run SQL tests
In Supabase SQL Editor, run `supabase/tests/seo_workflow.sql`.
Expected: All 12 tests print PASS.

### 7. Social sharing preview
Paste an article URL into https://www.opengraph.xyz/
Expected: Correct article title, description, and featured image.

---

## Google Search Console Actions (Manual)

After deployment:

1. **With the owner's approval**, submit the sitemap: Search Console → Sitemaps → `https://www.chefpetertheteacher.com/sitemap.xml`
2. Request indexing for the articles index: URL Inspection → `/articles` → Request indexing
3. Monitor Coverage report for any crawl errors after first publish
4. If changing the domain or canonical URLs, add a Change of Address in Search Console

---

## Structured Data: Recipe Schema

Recipe structured data is emitted only for genuine recipes: articles whose type
is "Recipe" and whose recipe details include ingredients and method steps
(`qualifiesForRecipeSchema` in `src/lib/knowledge/recipe.ts`). Times, yield and
other fields are included only when the author has entered them — nothing is
invented.

HowTo structured data is **not** used: Google retired HowTo rich results, and
step-by-step tutorials are already described by the Article markup and their
headings.

The full structured-data graph (WebSite, Person, Organization, Books, Service,
FAQ, Breadcrumbs) is described in `docs/seo-strategy.md`.
