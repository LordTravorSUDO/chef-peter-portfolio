# The Culinary Library: knowledge platform

The articles section (`/articles`) is now an educational library built into the existing site. This document covers:

- what works today;
- the **proposed database change**, which needs your approval;
- how to apply it safely, and how to roll it back;
- how editors use the new features.

---

## 1. What works today (no database change)

Everything below runs on the current Supabase schema:

| Feature | Where |
|---|---|
| Library home page: introduction, search, featured article, browse by subject, latest articles, topics (tags), the educator | `/articles` |
| Results view: search, category filter, "all articles", pagination | `/articles?q=…`, `?category=…`, `?view=all` |
| Search: every word must match the title, the introduction or a category/tag name | `getPublishedArticles` |
| Category pages with description, sibling subjects and pagination | `/category/<slug>` |
| Tag (topic) pages (`noindex`, as before) | `/tag/<slug>` |
| Article page: title, introduction, category, tags, author, published and updated dates, reading time, featured image with caption/credit, table of contents (3+ main headings), numbered steps, captioned inline images, chef's-tip callouts, share links, author biography, previous/next, related articles, back to library | `/articles/<slug>` |
| Social and SEO metadata: Open Graph, Twitter, canonical, BlogPosting and BreadcrumbList JSON-LD | Article and library pages |
| CMS: starter outline for each format, writing guide, image captions taken from the media library | Article editor |

### Bugs fixed while building the library
1. **Category filter returned every article.** Filtering on an embedded resource without `!inner` only trims the embedded rows. Category, tag and related-article queries now resolve article IDs first.
2. **Search broke on commas or brackets.** The visitor's text was placed unescaped inside a PostgREST `or()` filter. It is now sanitised (`src/lib/knowledge/search.ts`).
3. **Duplicate titles and canonicals.** Article URLs had two `<title>` tags and two canonical links, and the first canonical pointed every article at the homepage. The Edge middleware now replaces the homepage defaults (marked `data-default-seo` in `index.html`) instead of adding to them. The articles section removes leftover defaults on the client.
4. **Reading time counted HTML tags as words.** The public page now counts visible words only. The database column is unchanged.
5. **The admin Preview used the old dark theme.** It now renders exactly like the public page.

---

## 2. Proposed database changes (NOT applied)

There are two proposed migrations. Both are additive, kept in `supabase/proposed/`, and awaiting approval:

| File | Purpose | Tests |
|---|---|---|
| `20261106000000_knowledge_platform.sql` | Article formats, featured/editor's-pick flags, structured recipe data, category order and visibility, the 7 categories | `tests/knowledge_platform.sql` |
| `20261107000000_author_profiles.sql` | Public author biography and photo (CMS → Author profile) | `tests/author_profiles.sql` |

### Author profiles (second migration)
- **New table:** `public.author_profiles`, keyed by profile id. It holds the display name, professional title, short and long biography, a photo (a media library item) and a profile link.
- **Why a separate table:** `public.profiles` contains account data (role, active flag) and stays private to its owner and to admins. Article pages are read by anonymous visitors, so the public biography lives in its own table. That table is **readable by everyone and writable only by admins**. No existing policy changes.
- **Before the migration:** the site shows the approved profile kept in `src/data/authorProfile.ts`.
- **After applying it:** add the Vercel environment variable `VITE_AUTHOR_PROFILES=on` (all environments) and redeploy. Public pages only read the table when this is set, so visitors never request a table that does not exist yet. The CMS detects the table automatically.
- **Rollback:** remove `VITE_AUTHOR_PROFILES` and redeploy, then `DROP TABLE public.author_profiles;`

The rest of this section describes the first migration.

**File:** `supabase/proposed/20261106000000_knowledge_platform.sql`
**Tests:** `supabase/proposed/tests/knowledge_platform.sql`

The file is kept outside `supabase/migrations/` so that no tool applies it automatically.

### What it adds

| Table | Column | Default | Purpose |
|---|---|---|---|
| `categories` | `sort_order integer` | `100` | Admin-controlled display order |
| `categories` | `is_active boolean` | `true` | Hide a category from navigation **without deleting it or unlinking its articles** |
| `articles` | `article_type text` (check: 8 values) | `'educational'` | Article format |
| `articles` | `is_featured boolean` | `false` | Featured article on `/articles` |
| `articles` | `is_editors_pick boolean` | `false` | "Editor's selection" |
| `articles` | `recipe jsonb` (must be an object) | `NULL` | Optional structured recipe/tutorial data |

It also seeds the seven educational categories (sort order 1–7), using `ON CONFLICT (slug) DO NOTHING`:

1. Food History and Culinary Culture: `food-history-and-culinary-culture`
2. Ingredients and Food Science: `ingredients-and-food-science`
3. Professional Cooking Techniques: `professional-cooking-techniques`
4. International Cuisines: `international-cuisines`
5. Pastry and Bakery: `pastry-and-bakery`
6. Food Safety and Hygiene: `food-safety-and-hygiene`
7. Professional Kitchen Skills: `professional-kitchen-skills`

### What it does **not** change
- No RLS policy, grant, function, trigger, auth or storage change. The existing policies already cover the new columns: visitors can read published articles and all categories, and only admins can write.
- Article IDs, slugs, publication dates, authors, images and SEO fields are untouched.
- Existing articles are **not** moved into the new categories. That is an editorial decision, made in the CMS.
- Existing categories stay active, ordered after the seven new ones (sort order 100).

### Risk assessment
- `ADD COLUMN … DEFAULT <constant>` is a metadata-only change in PostgreSQL 11+. There is no table rewrite and no long lock.
- The code detects the new columns at runtime (`src/lib/services/knowledgeSchema.ts`). It works **before and after** the migration, so deploying code and migrating the database can happen in either order.
- Before the migration, the CMS shows these fields as unavailable and **never sends** the new columns (covered by an end-to-end test).

### How to apply it (after approval)
1. Create a Supabase **branch** (or use the local stack) and apply the file there.
2. Run `supabase/proposed/tests/knowledge_platform.sql` in that branch's SQL editor. All nine checks should print `PASS`.
3. Point a Vercel **preview** deployment at the branch and check `/articles`, a category page, an article, and the article editor (format, flags, recipe fields).
4. Move the file to `supabase/migrations/` (keeping the timestamp, or renaming it to the time it is recorded), commit, and apply it to production.
5. Regenerate the types if you use generated types. The fields are already declared as optional in `src/types/database.ts`.

### Rollback
The SQL file ends with a commented rollback script. Dropping the columns removes any formats, flags and recipe data entered after the migration, so take a backup first. Seeded categories are not removed automatically, because articles may be linked to them.

### Without the migration
The seven categories can be created by hand today in **CMS → Categories** (same names and slugs as above). They will appear in alphabetical order until the migration adds ordering.

---

## 3. What switches on after the migration

| Feature | Visitor | Editor |
|---|---|---|
| Article formats | Format label on cards and articles; "Format" filter on the library and category pages | "Article format" selector |
| Featured article | Most recently published featured article tops `/articles` (otherwise the latest article) | "Featured article" checkbox |
| Editor's selection | Section on `/articles` | "Editor's selection" checkbox |
| Recipe / tutorial card | Card with times, servings/yield, level, grouped ingredients with quantities and units, equipment, numbered preparation and method, chef's notes, storage and allergens | Fields shown only for formats that use them |
| Recipe rich results | `Recipe` JSON-LD **only** for the Recipe format with at least one ingredient and one step | — |
| Category order and visibility | Navigation follows the admin order; hidden categories disappear from navigation, but their pages and articles keep working (`noindex`) | Up/down and show/hide controls in CMS → Categories |

### Structured fields per format

| Format | Fields offered |
|---|---|
| Educational article | none |
| Food history feature | none |
| Cooking tutorial | times, servings/yield, ingredients, equipment, preparation, method, chef's notes, storage, allergens |
| Recipe | all of the above, plus level |
| Baking and pastry tutorial | all of the above, plus level |
| Ingredient guide | storage, allergens, chef's notes |
| Professional kitchen guide | equipment, chef's notes |
| Food safety guide | equipment, chef's notes |

Structured data is kept if an editor changes the format. Only the fields allowed for the new format are displayed.

---

## 4. Editorial standards (shown in the editor's writing guide)

- Open with the purpose: the introduction (excerpt) says what the reader will learn and why it matters.
- Explain technical terms in plain language the first time they appear.
- Use examples from Ugandan, African and international kitchens. Explain how a technique works with locally available ingredients and equipment.
- **Never fabricate.** State origins, dates, temperatures and food-safety rules only when you can support them. Cite the authority (for example Codex Alimentarius, WHO or UNBS) for safety guidance.
- Use Heading 2 for main sections (three or more create a table of contents), numbered lists for steps, and short paragraphs.
- Images: add alt text and a caption in the Media library. The caption is shown under the image.
- Highlighted boxes: use the Quote button and begin with `Chef's tip:`, `Chef's note:`, `Safety note:` or `In the Ugandan kitchen:`.

Starter outlines contain only headings and bracketed prompts. Every `[prompt]` must be replaced before publishing.

---

## 5. URLs

| Page | URL | Indexed |
|---|---|---|
| Library | `/articles` | yes |
| Search / filtered results | `/articles?q=…&category=…&type=…&view=all` | no (`noindex`) |
| Subject | `/category/<slug>` (page 2+ and hidden categories are `noindex`) | yes |
| Topic | `/tag/<slug>` | no (unchanged decision) |
| Article | `/articles/<slug>` (existing URLs unchanged) | yes, unless the article is set to `noindex` |

---

## 6. Remaining recommendations
- Add the landing pages and category pages to `api/sitemap.ts` (still only `/`, `/articles` and articles).
- `view_count` is never incremented, so "popular" articles cannot be measured yet. Editor's selection is used instead.
- Supabase image transformations are a paid feature. Resizing images before upload would reduce page weight.
