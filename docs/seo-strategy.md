# SEO strategy — Chef Peter the Teacher

This document explains how the website is organised for search engines, which
page answers which kind of search, and what still needs to be done. It
complements `docs/seo-system.md` (how the technical pieces work) and
`docs/CONTENT_REVIEW.md` (facts Chef Peter still needs to confirm).

**No ranking is promised.** Search engines decide rankings. The aim is that
each page clearly describes a real service or real knowledge, can be crawled
and indexed, and is easy to understand and share.

---

## 1. Principles

1. **One clear topic per page.** Each landing page targets one service or
   theme, so pages do not compete with each other.
2. **Natural language.** Keywords appear where a reader would expect them — in
   the title, the main heading and the opening paragraph — and nowhere else by
   force.
3. **Only verified facts.** Titles, descriptions and structured data repeat
   only what is already on the site. Unconfirmed claims (for example the total
   years of experience) are kept out of search snippets until Chef Peter
   confirms them (see `docs/CONTENT_REVIEW.md`).
4. **Education first.** The Culinary Library earns visits by teaching well;
   articles link to related training, consultancy and books only where the
   subject genuinely matches.

---

## 2. Keyword themes and target pages

| Theme | Typical searches (examples, not targets to repeat) | Main page | Supporting pages |
|---|---|---|---|
| Brand / name | "Chef Peter the Teacher", "Chef Peter Uganda" | `/` (homepage) | `/about-chef-peter` |
| Chef and culinary consultant in Uganda | "culinary consultant Uganda", "chef consultant Kampala" | `/culinary-consultant-uganda` | `/hospitality-consultancy`, `/about-chef-peter` |
| Culinary training in Uganda | "cooking classes Kampala", "culinary training Uganda" | `/cooking-classes-kampala` | `/baking-pastry-classes`, library techniques articles |
| Baking and pastry training | "baking classes Kampala", "pastry training Uganda" | `/baking-pastry-classes` | *Secrets of a Successful Baker* (`/culinary-books#secrets-of-a-successful-baker`), Pastry and Bakery category |
| Commercial bakery training | "commercial bakery training Uganda", "bakery staff training" | `/baking-pastry-classes` (commercial section) | `/culinary-consultant-uganda`, baker's book |
| Professional cooking techniques | "how to make stock", "knife skills", "laminating dough" | Culinary Library articles (`/articles/...`) | `/cooking-classes-kampala`, *In 1000 Ways and More I Cooked* |
| Culinary education | "culinary educator Uganda", "learn to cook professionally" | `/articles` (the library) | `/about-chef-peter`, `/cooking-classes-kampala` |
| International cuisine | "international recipes", named dishes | International Cuisines articles and recipes | *Inter-Continental Recipe Book*, `/private-chef-uganda` |
| Food safety and kitchen management | "food safety training Uganda", "kitchen SOPs" | `/hospitality-consultancy` | Food Safety and Professional Kitchen Skills articles, `/culinary-consultant-uganda` |
| Hospitality consultancy in Uganda | "hospitality consultant Uganda", "hotel kitchen consultancy" | `/hospitality-consultancy` | `/culinary-consultant-uganda`, `/about-chef-peter` |
| Private chef | "private chef Kampala", "private chef Entebbe" | `/private-chef-uganda` | `/about-chef-peter` |
| Books | "Chef Peter books", book titles | `/culinary-books` | Homepage books section |

### Page titles and descriptions

| Page | Title |
|---|---|
| `/` | Chef Peter the Teacher \| Chef & Culinary Educator in Uganda |
| `/about-chef-peter` | About Chef Peter the Teacher \| Chef & Culinary Educator |
| `/culinary-consultant-uganda` | Culinary Consultant in Uganda \| Chef Peter the Teacher |
| `/cooking-classes-kampala` | Cooking Classes & Culinary Training in Kampala \| Chef Peter |
| `/baking-pastry-classes` | Baking & Pastry Training in Uganda \| Chef Peter the Teacher |
| `/hospitality-consultancy` | Hospitality Consultancy in Uganda \| Chef Peter the Teacher |
| `/private-chef-uganda` | Private Chef in Uganda \| Chef Peter the Teacher |
| `/culinary-books` | Culinary Books by Chef Peter the Teacher |
| `/articles` | Culinary Library: Recipes, Techniques & Training \| Chef Peter |
| Article | *SEO title or article title* + " \| Chef Peter the Teacher" (or " \| Chef Peter") when it fits within about 65 characters |

All titles and descriptions are unique; the automated audit
(`tests/seo/seo-audit.cjs`) checks this.

### Coverage gaps (content opportunities)

These themes have a landing page but few or no supporting articles yet. Writing
genuine lessons on them would strengthen the site:

- Commercial bakery production: costing, yield, scaling formulas, bakery hygiene.
- Food safety: temperature control, cleaning schedules, safe storage in warm climates.
- Kitchen management: mise en place systems, prep lists, ordering and stock control.
- International cuisine adapted to Ugandan ingredients.
- Ugandan dishes explained for international readers (rolex, luwombo, matooke).

---

## 3. Article SEO (in the CMS)

Each article has, or automatically gets:

- **SEO title and meta description** — optional overrides; otherwise the title
  and excerpt are used. The editor warns when they are missing, too short or too long.
- **Descriptive slug** — the editor suggests one from the title. Changing the
  slug of a published article creates a **301 redirect** automatically.
- **Canonical URL** — the article's own address unless a canonical is set.
- **Social image** — the social image, else the featured image, else the default
  portrait; width and height are given when known.
- **Heading hierarchy** — the article title is the only `<h1>`; any `<h1>` in
  the body is shown as `<h2>`. `<h2>`/`<h3>` headings get anchors and form the
  table of contents.
- **Breadcrumbs** — Home › Culinary Library › Category › Article, visible and as
  BreadcrumbList structured data.
- **Article structured data** (BlogPosting) — headline, dates, author, publisher
  (both linked to the single site-wide Person entity), image, section, keywords.
- **Recipe structured data** — only for articles of type *Recipe* with real
  ingredients and method steps. Times and yield only when entered.
- **HowTo structured data** — *not used*. Google retired HowTo rich results;
  tutorials are described by Article markup and clear headings instead.
- **Internal links** — related articles, previous/next, category and tags, plus
  a "Learn more with Chef Peter" box linking to the matching class, consultancy
  service or book, the About page and the enquiry form.

**Admin → SEO health** lists problems across all published and scheduled
articles (duplicate titles or descriptions, missing descriptions or alt text,
very long slugs, noindex articles) and manages redirects.

---

## 4. Technical SEO summary

| Area | Status |
|---|---|
| Crawlable HTML | Homepage and all landing pages are prerendered at build time and served as HTML by the Edge middleware. Article, category and tag pages get their title, description, canonical, Open Graph and noindex tags injected at the edge. |
| Canonicals | One canonical per page, absolute URLs on `https://www.chefpetertheteacher.com`. |
| Sitemap | `/sitemap.xml` → `/api/sitemap`; homepage, library, landing pages, indexable articles and non-empty categories. |
| robots.txt | Allows everything except `/admin/` and `/api/`, with an explicit allow for `/api/sitemap`. |
| Redirects | Real 301/302 responses from the Edge middleware for moved articles, categories and tags; automatic on slug change. |
| Not found | `noindex` header and meta tag; a helpful page for visitors. |
| Duplicate content | Tag pages and search/filter URLs are `noindex` and not in the sitemap. |
| Structured data | One graph with stable `@id`s: WebSite, Person (Chef Peter), Organization (De’Chosen Events Consultants), Books, Service per landing page, ProfilePage (About), CollectionPage (Books, Library, categories), FAQPage, BreadcrumbList, BlogPosting, Recipe (qualifying recipes only). |
| Images | WebP copies of the book covers and larger gallery photos (`scripts/optimise-images.py`); originals kept as fallback and for social sharing. Width and height set to avoid layout shift. Favicon reduced from 370 KB to 8 KB; Apple touch icon added. |
| Mobile | Responsive layouts; tested at phone width in earlier phases. |

### Automated checks

- `node tests/seo/seo-audit.cjs dist` — builds on a mock-data build (see the
  file header) and checks titles, descriptions, canonicals, headings, alt text,
  Open Graph, structured data validity and duplicates, and internal links.
  Result before Phase 5: 1 error, 30 warnings. After: 0 errors, 0 warnings.
- `npm run test:unit` — sitemap, robots, redirects, middleware, title helper,
  structured data identities and internal links.
- `npm run test:e2e` — CMS editor and management flows.

These tools check that the pages are *eligible* and well-formed. They do not
show whether Google has indexed a page — only Search Console can show that.

---

## 5. Remaining opportunities (need the owner's action or approval)

1. **Google Search Console** — after deployment, and only with the owner's
   approval: submit `https://www.chefpetertheteacher.com/sitemap.xml`, inspect
   the homepage and landing pages, and watch the Pages report. No Search Console
   changes have been made.
2. **Google Business Profile** — a free profile for Kampala (with the same
   name, phone and services as the website) is likely to matter more for local
   searches than any on-page change.
3. **Confirm facts** in `docs/CONTENT_REVIEW.md`, in particular years of
   experience, MUBS certificates, media appearances and awards. Once confirmed
   they can be used in descriptions and structured data.
4. **De’Chosen Events Consultants website** — if `dechosenevents.com` is
   confirmed as the company's site, add it as the organisation's `url` and to
   Chef Peter's `sameAs` in `src/lib/seo/schema.ts`.
5. **Other verified profiles** (Facebook, Instagram, YouTube) can be added to
   `sameAs` once confirmed as Chef Peter's own.
6. **Database migrations** in `supabase/proposed/` (knowledge platform, author
   profiles) are not applied. Until they are, category visibility (`is_active`)
   and recipe fields are unavailable in production; the site falls back safely.
7. **Write the articles** listed under "Coverage gaps" above.
8. **Reviews / testimonials** — only genuine, attributable testimonials should
   be added; review structured data should not be self-published.
9. **Unused file** — `public/images/kitchen-banner.jpg` (1.5 MB) is not a valid
   image and is not used; it can be deleted once confirmed.
10. **Performance monitoring** — after deployment, check Core Web Vitals in
    Search Console or PageSpeed Insights (free).
