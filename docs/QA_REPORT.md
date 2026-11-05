# Final quality assurance report — Chef Peter the Teacher

**Date:** 5 November 2026 · **Branch:** `claude/intelligent-franklin-4yq7xv`
**Compared with:** the original project at commit `755860e` (the last commit before the redesign)

**Status:** ready for a **preview** deployment and owner approval. Nothing has been deployed. No production data, SQL or database policies have been touched, and no test articles were created in production.

---

## 1. Summary

| Area | Result |
|---|---|
| `npm ci` | ✅ Clean install. Dependencies are identical to the original (no packages added, removed or upgraded) |
| TypeScript (app, `tsconfig.json`) | ✅ No errors |
| TypeScript (API and middleware, `tsconfig.api.json`) | ✅ No errors |
| Unit tests (`npm run test:unit`) | ✅ 82 / 82 |
| CMS editor end-to-end tests | ✅ 29 / 29 (run twice) |
| CMS management end-to-end tests | ✅ 14 / 14 (run twice) |
| SEO audit (`tests/seo/seo-audit.cjs`) | ✅ 0 errors, 0 warnings (the original site had 1 error and 30 warnings) |
| Browser sweep: 27 pages × 3 screen sizes, current and future database | ✅ Public pages: no console errors, failed requests, broken images, missing alt text, layout overflow, duplicate metadata or accessibility (axe) violations |
| Public functional checks | ✅ 40 / 40 |
| Production build | ✅ |

---

## 2. What changed (phases 2–6)

1. **Public website redesign** in a "Modern Culinary Editorial" style: a new design system, homepage sections, service pages, books, gallery, and responsive layouts.
2. **The Culinary Library:**
   - library homepage, seven categories and eight article formats;
   - search, category and tag pages;
   - article pages with table of contents, callouts, recipe cards, author box, related articles and breadcrumbs.
3. **Editorial CMS:**
   - dashboard, article management with filters, and an improved editor (autosave, live preview, structured recipe and tutorial fields);
   - safe category and tag management, an improved media library, and an author profile;
   - revisions, scheduling and an editorial calendar.
4. **SEO:**
   - one structured-data identity for Chef Peter, his organisation and his books; unique titles and descriptions;
   - homepage prerendering; real 301 redirects, including automatic ones when a slug changes;
   - corrected sitemap and robots.txt, internal links between pages, WebP images, and an SEO health page in the CMS.
5. **Content strategy:** editorial guidelines, a 28-article calendar, four full drafts, and a CMS rule that blocks publishing while editorial notes remain.

### Fixed during this final QA

| Problem found | Fix |
|---|---|
| A redirect target containing a backslash (`/\host`) could send visitors to another website (React Router advisory GHSA-wrjc-x8rr-h8h6) | The client-side redirect check now uses the same strict same-site rule as the server; unit tested |
| After **Insert box…** in the editor, the cursor could land outside the box, so the text went into the next paragraph (the cause of an intermittent test failure) | The cursor now goes inside the new box, after its label; 5 consecutive clean runs |
| Article, library and category pages jumped while loading on phones. Article CLS was 0.30 ("poor") | Font fallbacks tuned to the web fonts' measurements, and space reserved for content that loads later. Every page is now ≤ 0.04 ("good") |
| Public library and article pages made a failing request (400/404) on every visit until the proposed database changes are applied | The library columns are now detected from a sample row, which never errors. Author profiles are read only once `VITE_AUTHOR_PROFILES=on` is set. Visitors now see **zero** failed requests |
| Public dates followed each visitor's own time zone (an early-morning Kampala post could show the previous day) | All public dates are shown in Kampala time; unit tested |
| The schedule date field had no label; two editor pages had an empty page title | Label added; the empty title removed (it was rendered from mixed children) |
| Text contrast below the WCAG AA standard (library tile numbers, the 404 heading, admin grey text, status badges, warnings) | Darker shades applied. Public pages and admin pages now pass axe colour-contrast checks |
| Landmark problems: nested `aside` elements, the floating WhatsApp button outside any landmark, no `main` on the admin login page | Corrected |
| Admin Categories and Author pages scrolled sideways on phones | Fixed |
| The homepage said "Uganda and six other countries", counting Puntland (an autonomous region of Somalia) as a country | Now reads "Uganda, elsewhere in Africa and the Gulf" |
| Admin revision previews showed stored HTML without the sanitiser | Now sanitised, the same as public pages (defence in depth) |
| Two claims from the original site had been dropped without a record: "hundreds of students" and "De'Chosen Academy" | Recorded in `docs/CONTENT_REVIEW.md` (6.4 and 6.5) for Chef Peter to confirm. The text is kept in `chefProfile.ts` |

---

## 3. What was preserved

- **Routes:** every original route still exists, and none was removed. Two admin routes were added (Author profile, Editorial calendar).
- **SEO landing pages:** the same seven paths, all still prerendered, each with the same canonical URL and `index, follow`. Each now has one `<title>` instead of three.
- **Public files:** every file in `public/` is still present (WebP copies were added; originals kept as fallbacks).
- **`vercel.json`:** unchanged. The free Hobby plan's daily cron and the rewrites are as before.
- **API functions:** the same files. Only `api/sitemap.ts` changed (corrected content).
- **Authentication and authorisation:** `useAuth`, `AuthProvider`, `ProtectedRoute` and the Supabase client are unchanged; the login page has only visual and accessibility changes. Admin-only access is unchanged.
- **Database:** applied migrations, RLS and storage policies are unchanged. The two proposed migrations are in `supabase/proposed/` and **not applied**.
- **Secrets:** the browser bundle contains only the Supabase URL, the public (anon) key and the Web3Forms key. A scan of the build output found no service-role key or `CRON_SECRET`.
- **Enquiry form:** uses the same Web3Forms mechanism as the original.
- **Portfolio content:**
  - **Data files:** the gallery (45 items), books and `chefProfile.ts` data files are unchanged.
  - **Key facts:** a browser comparison of 48 key facts (names, employers, countries, books, services, qualifications) found all of them on the new site, except three claims held back for confirmation (see `CONTENT_REVIEW.md` 2.6, 6.4 and 6.5).
  - **Wording:** much text was rewritten during the redesign. Unconfirmed claims such as "50+ chefs trained" and "zero-tolerance" were removed from display, and developer instructions that were visible to the public were removed.

---

## 4. Tests performed and results

### 4.1 Automated suites

| Suite | What it covers | Result |
|---|---|---|
| Unit (82) | Article HTML processing, callouts, recipe schema eligibility, sitemap and robots, redirects and their safety rules, Edge middleware (served pages, injection, 301s), structured data identities, internal links, editorial calendar and drafts, publishing guard, schema detection, Kampala dates | ✅ 82 / 82 |
| CMS editor e2e (29) | Saving after token refresh and tab refocus, images kept or removed correctly, autosave failure and recovery, serialised saves, Save & publish, Publish now, slug conflicts, sign-out, author byline, reading time, archiving, uploads (session token, bucket, unauthenticated, expired session, refresh-and-retry, RLS denial, missing bucket), media picker, media metadata and delete, recipe fields, before-migration saving | ✅ 29 / 29 ×2 |
| CMS management e2e (14) | Dashboard, article filters and pagination, statuses and dates, scheduling, preview, safe category and tag deletion, editor callouts, tags, captions, author change, author profile reused publicly, slug-change redirect, SEO health page, editorial calendar → draft (publishing refused while notes remain) | ✅ 14 / 14 ×2 |
| Same suites against the **current (pre-migration) database** | Confirms the CMS works on today's database | ✅ All pass except the 3 tests of migration-only features (featured badge, recipe fields), as expected |
| SEO audit | Titles, descriptions, canonicals, H1, heading order, Open Graph and Twitter tags, alt text, JSON-LD validity and required properties, duplicate entities, internal links (34 crawled) | ✅ 0 errors, 0 warnings |

### 4.2 Browser sweep (phone 390 px, tablet 820 px, desktop 1366 px)

**Pages covered:**
- **Public (14):** the homepage, the seven landing pages, `/articles`, a search, a category page, a tag page, an article and a not-found article.
- **Admin (13):** login, dashboard, articles, new article, edit, preview, media, categories, tags, author, SEO, editorial calendar and settings.
- **Database modes:** each page was checked against both the current database and the database after the proposed migrations.

| Check | Public | Admin |
|---|---|---|
| Console errors | 0 | Only the expected author-profiles 404 on the Author and Preview pages before that migration |
| Failed API requests | 0 | As above |
| Broken images | 0 | 0 |
| Missing alt attributes | 0 | 0 |
| Fonts (Playfair Display, Source Sans 3) loaded | ✅ all pages | ✅ |
| Horizontal overflow | 0 | 0 |
| Duplicate `<title>`, description or canonical tags | 0 | — |
| Exactly one H1 | ✅ | — |
| axe (WCAG 2.1 A/AA + best practice) | **0 violations** | 0 after fixes (see the background run note in §6) |

### 4.3 Public functional checks (40 / 40)

- **Homepage navigation:** all in-page links reach their sections.
- **Gallery:** filtering works; the viewer opens, the arrow keys move between items, Escape closes it, and focus returns to the item that opened it.
- **Enquiry form:** submitting it empty shows errors and moves focus to the first problem. Without the Web3Forms key it shows a friendly message suggesting WhatsApp, phone or email instead.
- **Search:** finds the right articles and excludes unrelated ones; a search with no matches shows a helpful message.
- **Category and tag pages:** a category page shows exactly its own published articles. Tag pages are `noindex`.
- **Article page:**
  - **Date:** the publication date matches `published_at` ("20 October 2026").
  - **Structure:** one H1 and a "Learn more with Chef Peter" box.
  - **Hidden statuses:** draft, scheduled and archived articles, 23 in all, are not visible publicly.
- **Hydration:** the prerendered homepage hydrates with no React errors and stays interactive.

### 4.4 Server functions

- **Sitemap function**, run with a simulated database:
  - lists the homepage, the library, the seven landing pages, published indexable articles and active categories;
  - leaves out hidden categories;
  - returns XML with a 30-minute cache;
  - still lists the 9 main pages when Supabase is unavailable;
  - rejects POST requests.
- **robots.txt:** allows `/api/sitemap` and disallows `/admin/` and `/api/`.

### 4.5 Performance (lab measurements, local server, phone size)

| Measure | Original | Now |
|---|---|---|
| Homepage total download (fully scrolled) | 3,717 KB (3,226 KB of images) | **1,454 KB** (899 KB of images), 61% less |
| Main JavaScript bundle (gzip) | 113 KB | 114 KB |
| CSS (gzip) | 12 KB | 13 KB |
| Homepage HTML | Empty shell (content after JavaScript) | Prerendered, with content and an H1 in the HTML |
| Largest Contentful Paint (local) | — | 0.14–0.5 s |
| Cumulative Layout Shift | — | 0–0.04 on every page (article page was 0.30 before this QA) |

These are lab figures from a fast local server. Real-world figures depend on the visitor's network; check them in PageSpeed Insights (free) after deployment.

---

## 5. Remaining issues and recommendations

**Requires the owner's approval or action**
1. **Proposed database migrations** (`supabase/proposed/`) are not applied. Until they are:
   - article formats, recipe fields, featured and editor's-pick flags, and category ordering and hiding are unavailable;
   - drafts created from the editorial calendar are not filed under a category;
   - the site works safely without them.

   After applying the author-profile migration, set `VITE_AUTHOR_PROFILES=on` in Vercel and redeploy.
2. **Facts awaiting Chef Peter's confirmation:** see `docs/CONTENT_REVIEW.md` (years of experience, MUBS certificates, awards, media appearances, numbers trained, "De'Chosen Academy").
3. **Google Search Console:** submit the sitemap and monitor indexing, only with approval. Consider a free Google Business Profile.

**Technical, not blocking**
4. **`npm audit`** reports 37 advisories (4 high). All were present in the original project; none come from dependencies added during this work.
   - The high ones come from `@vercel/node`, a development and type dependency.
   - The one relevant React Router advisory has been mitigated in code.
   - Recommend a separate, tested dependency-upgrade task (React Router 7 is a major upgrade).
5. **Article bodies are client-rendered.**
   - Titles, descriptions, canonicals, Open Graph tags and `noindex` are injected at the edge, so search engines and social previews get them without JavaScript.
   - Google renders the body; some other crawlers will not.
   - Server-side or prerendered articles are a possible future improvement.
6. **The admin Author and Preview pages log one expected 404** until the author-profile migration is applied (the Author page explains this).
7. **`public/images/kitchen-banner.jpg`** (1.5 MB) is not a valid image and is unused; it can be deleted once confirmed.
8. **Not testable here:** live Supabase RLS and storage, the Vercel Edge middleware, the daily cron, and Web3Forms delivery. These were tested against faithful simulations only, which is why a preview deployment is recommended before production (below).

---

## 6. Deployment readiness

**Verdict: ready for a preview deployment.** All critical tests pass and no blocking defect is known.

**Before deploying to production (with approval):**
1. Confirm the Vercel environment variables:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_WEB3FORMS_ACCESS_KEY` for all environments;
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` for Production and Preview.

   Do **not** set `VITE_AUTHOR_PROFILES` yet.
2. Deploy to a **Vercel Preview** URL (free on Hobby; no paid plan needed).
3. Smoke-test the preview using real accounts, without publishing test content:
   1. Open the homepage, a landing page, `/articles` and an existing article; view the page source and confirm the title, canonical and JSON-LD.
   2. Open `/sitemap.xml` and `/robots.txt`.
   3. Sign in to `/admin`; open the dashboard, the articles list, an existing article in the editor, Preview, the media library and the SEO page.
   4. In **Editorial calendar**, create one draft if you wish (it stays a draft), confirm that publishing is blocked, then delete it.
   5. Send one test enquiry to confirm Web3Forms delivery.
4. If everything passes, promote the preview to production.
5. **Rollback:** Vercel's "Instant Rollback" restores the previous deployment; no database change is involved.
