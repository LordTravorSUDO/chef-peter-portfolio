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

The sitemap at `/sitemap.xml` is now served by `/api/sitemap` (via a Vercel redirect).

It includes:
- Homepage (`/`)
- Articles index (`/articles`)
- All published, non-noindex article URLs

It excludes:
- Drafts
- Scheduled articles
- noindex articles
- Admin pages
- API pages

The sitemap updates automatically — no manual action is needed after publishing
or unpublishing an article. The sitemap is cached at the Vercel edge for 30 minutes.

---

## Platform Limitation — HTTP Status Codes

Vercel SPA rewrites (`"source": "/(.*)", "destination": "/index.html"`) always
return HTTP 200 for every URL, including missing article slugs. The middleware
cannot override this to return a true HTTP 404.

**What is implemented instead:**
- Missing articles: `X-Robots-Tag: noindex, follow` header prevents Google from
  indexing the 404 page
- The React app renders a clear 404 UI for users
- The `useRedirect` hook checks the `redirects` table and navigates to the new
  URL if a redirect rule exists

**If true 404 HTTP responses are required:** Remove the catch-all rewrite from
`vercel.json` and add individual Vercel Function routes for each public path.
This would require more infrastructure but is possible without Next.js.

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

When an article slug changes after publication:

1. Go to Admin → (article edit page or manage via Supabase)
2. Add a row to the `redirects` table:
   ```sql
   INSERT INTO public.redirects (from_path, to_path, status_code)
   VALUES ('/articles/old-slug', '/articles/new-slug', 301);
   ```
3. For immediate server-side 3xx redirects, also add to `vercel.json`:
   ```json
   { "source": "/articles/old-slug", "destination": "/articles/new-slug", "permanent": true }
   ```

The `useRedirect` hook handles client-side resolution for rules in the database
but not yet in `vercel.json`.

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

1. Submit the sitemap: Search Console → Sitemaps → `https://www.chefpetertheteacher.com/sitemap.xml`
2. Request indexing for the articles index: URL Inspection → `/articles` → Request indexing
3. Monitor Coverage report for any crawl errors after first publish
4. If changing the domain or canonical URLs, add a Change of Address in Search Console

---

## Structured Data: Recipe Schema

The task mentioned Recipe structured data. This has NOT been implemented because:

- There are currently no articles in the database with confirmed recipe content
- Google's Recipe schema requires: `name`, `recipeIngredient`, `recipeInstructions`, and `totalTime`
- Inventing these fields (preparation times, ingredient lists) would be dishonest
  and could result in Google manual action for misleading structured data

When Chef Peter publishes a genuine recipe article:
1. Add a `recipe_data` JSONB column to the articles table (optional metadata)
2. The admin editor would show a "Recipe details" panel to fill in ingredients,
   instructions, and times
3. The middleware would detect `recipe_data` and inject a `Recipe` schema block

This is tracked as a future enhancement once recipe content exists.
