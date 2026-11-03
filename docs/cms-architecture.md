# Chef Peter Portfolio — CMS Architecture

> Status: Milestone 1 complete (foundation). Milestones 2 and 3 pending.

---

## 1. Stack Overview

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 19.0.1 | Existing; untouched |
| Build tool | Vite 6.x | Existing; no changes to vite.config.ts |
| Styling | Tailwind CSS v4 | Existing; via @tailwindcss/vite plugin |
| Client-side routing | react-router-dom 6.30.6 | Added in Milestone 1 |
| Database + Auth | Supabase (hosted PostgreSQL) | Added in Milestone 1 |
| File storage | Supabase Storage | Milestone 3 |
| Rich text editor | TipTap (planned) | Milestone 3 |
| Document metadata | React 19 native hoisting | No library needed |
| Deployment | Vercel | Existing; vercel.json added |
| Contact forms | Web3Forms | Existing; preserved unchanged |

---

## 2. Architecture Diagram

```
Browser
  │
  ├── / ────────────────── PortfolioPage (existing, unchanged)
  ├── /articles ──────────  BlogIndexPage
  ├── /articles/:slug ────  ArticlePage        } lazy-loaded chunk
  ├── /category/:slug ────  CategoryPage       }
  ├── /tag/:slug ─────────  TagPage            }
  │
  ├── /admin/login ───────  AdminLoginPage     } lazy-loaded admin chunk
  └── /admin/* ───────────  ProtectedRoute
        ├── /admin              AdminDashboard
        ├── /admin/articles     AdminArticlesPage
        ├── /admin/articles/new AdminNewArticle
        ├── /admin/articles/:id/edit  AdminEditArticle
        ├── /admin/media        AdminMediaPage
        ├── /admin/categories   AdminCategoriesPage
        ├── /admin/tags         AdminTagsPage
        ├── /admin/seo          AdminSeoPage
        └── /admin/settings     AdminSettingsPage

Supabase (hosted)
  ├── Auth          — email + password, single admin account
  ├── Database      — articles, categories, tags, article_tags
  │     RLS: public reads published articles only
  │          authenticated user has full write access
  └── Storage       — article-media bucket (Milestone 3)
```

---

## 3. Component Boundary Map

```
src/
├── App.tsx                     Root router — public + admin routes
├── main.tsx                    BrowserRouter wrapper entry point
│
├── components/
│   ├── [all existing files]    PUBLIC PORTFOLIO — untouched
│   ├── blog/                   PUBLIC BLOG components (Milestone 2)
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleBody.tsx
│   │   ├── CategoryBadge.tsx
│   │   └── TagList.tsx
│   ├── admin/                  ADMIN-ONLY components (Milestone 3)
│   │   ├── ProtectedRoute.tsx  ← created in Milestone 1
│   │   ├── AdminLayout.tsx
│   │   ├── RichTextEditor.tsx
│   │   └── MediaPicker.tsx
│   └── shared/                 SHARED between public + admin
│       ├── PageLoader.tsx
│       └── ErrorBoundary.tsx
│
├── pages/
│   ├── blog/                   PUBLIC CMS pages
│   │   ├── BlogIndexPage.tsx
│   │   ├── ArticlePage.tsx
│   │   ├── CategoryPage.tsx
│   │   └── TagPage.tsx
│   └── admin/                  ADMIN pages (behind ProtectedRoute)
│       ├── AdminLoginPage.tsx
│       ├── AdminDashboard.tsx
│       ├── AdminArticlesPage.tsx
│       ├── AdminNewArticle.tsx
│       ├── AdminEditArticle.tsx
│       ├── AdminMediaPage.tsx
│       ├── AdminCategoriesPage.tsx
│       ├── AdminTagsPage.tsx
│       ├── AdminSeoPage.tsx
│       └── AdminSettingsPage.tsx
│
├── hooks/                      Data-access hooks (Milestone 2/3)
│   ├── useArticles.ts
│   ├── useArticle.ts
│   ├── useCategories.ts
│   ├── useTags.ts
│   └── useAuth.ts
│
├── lib/
│   └── supabase.ts             Supabase client singleton
│
├── types/
│   ├── database.ts             Supabase schema types
│   └── article.ts              UI-level re-exports
│
└── data/                       Existing static data (untouched)
    ├── chefProfile.ts
    ├── galleryData.ts
    └── booksData.ts
```

---

## 4. Routing Structure

| Route | Component | Auth required | Indexed |
|---|---|---|---|
| `/` | PortfolioPage | No | Yes |
| `/articles` | BlogIndexPage | No | Yes |
| `/articles/:slug` | ArticlePage | No | Yes |
| `/category/:slug` | CategoryPage | No | Yes |
| `/tag/:slug` | TagPage | No | Yes |
| `/admin/login` | AdminLoginPage | No | No |
| `/admin` | AdminDashboard | Yes | No |
| `/admin/articles` | AdminArticlesPage | Yes | No |
| `/admin/articles/new` | AdminNewArticle | Yes | No |
| `/admin/articles/:id/edit` | AdminEditArticle | Yes | No |
| `/admin/media` | AdminMediaPage | Yes | No |
| `/admin/categories` | AdminCategoriesPage | Yes | No |
| `/admin/tags` | AdminTagsPage | Yes | No |
| `/admin/seo` | AdminSeoPage | Yes | No |
| `/admin/settings` | AdminSettingsPage | Yes | No |

All `/admin/*` routes return `X-Robots-Tag: noindex, nofollow` via vercel.json headers.

---

## 5. Rendering Strategy & SEO for Dynamic Articles

### Why not SSR / Next.js?
Requirement: keep the existing Vite SPA. Next.js migration is explicitly out of scope.

### The approach: React 19 native metadata + client-side rendering

React 19 introduced **native document metadata hoisting**. `<title>`, `<meta>`, `<link rel="canonical">` and `<link rel="alternate">` declared inside any React component tree are automatically moved into `<head>` at render time. No third-party library (react-helmet, react-helmet-async) is needed or desirable.

```tsx
// Inside ArticlePage.tsx — these get hoisted to <head> automatically
<title>{article.meta_title ?? article.title} | Chef Peter the Teacher</title>
<meta name="description" content={article.meta_description ?? article.excerpt} />
<meta property="og:title" content={article.title} />
<meta property="og:image" content={article.og_image_url ?? article.cover_image_url} />
<link rel="canonical" href={`https://www.chefpetertheteacher.com/articles/${article.slug}`} />
```

### How Google indexes client-rendered articles
Google's crawler executes JavaScript and indexes client-rendered React apps. Since November 2024 Google has confirmed JavaScript rendering in Googlebot as equivalent to server-rendered for standard content. For a content site with moderate publishing frequency this is completely acceptable.

### Optional future enhancement: Vercel Edge prerendering
If search performance becomes a concern after launch, Vercel supports `@vercel/og` for social cards and its prerender infrastructure can be configured per-route without migrating to Next.js. This is deferred to Milestone 4.

---

## 6. Authentication & Server-side Security Boundaries

### What requires authenticated server-side execution?

| Operation | Auth mechanism | Where enforced |
|---|---|---|
| Creating/updating/deleting articles | Supabase Auth session | Supabase RLS policy on articles table |
| Uploading media | Supabase Auth session | Supabase Storage RLS policy |
| Managing categories and tags | Supabase Auth session | Supabase RLS policy |
| Reading published articles | No auth | RLS: `status = 'published' AND published_at <= NOW()` |
| Reading /admin/* routes | ProtectedRoute component | Redirects to /admin/login if no session |

There is **no custom backend server**. Supabase's Row Level Security acts as the server-side enforcement layer. The anon key exposed in environment variables only grants what RLS explicitly permits — unauthenticated users can only read published content.

### Admin account setup
A single admin account is created manually in the Supabase dashboard (Authentication → Users → Invite user). No public user registration is implemented.

---

## 7. Environment Variables

| Variable | Required in | Purpose |
|---|---|---|
| `VITE_WEB3FORMS_ACCESS_KEY` | Browser (existing) | Contact form email delivery |
| `VITE_SUPABASE_URL` | Browser | Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase public key (RLS enforced) |
| `GEMINI_API_KEY` | Server only (template remnant) | Not used |
| `APP_URL` | Server only (template remnant) | Not used |

---

## 8. Development, Build and Deployment Commands

```bash
# Install dependencies
npm install

# Local development (port 3000)
npm run dev

# Type-check only (no emit)
npm run lint

# Production build → dist/
npm run build

# Serve the built dist/ locally
npm run preview

# Remove dist/ and any server.js
npm run clean
```

### Vercel deployment
- Framework preset: **Vite** (auto-detected)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- `vercel.json` rewrites all requests to `index.html` for SPA routing

### Environment variables on Vercel
Add `VITE_WEB3FORMS_ACCESS_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in:
Vercel Dashboard → Project → Settings → Environment Variables

---

## 9. Remaining Blockers Before Milestone 2

1. **Supabase project not yet created.** Chef Peter (or you) must:
   - Create a free Supabase project at https://supabase.com
   - Run `docs/supabase-schema.sql` in the Supabase SQL Editor
   - Create the admin user: Authentication → Users → Add user
   - Create the `article-media` Storage bucket (public, image/* allowed)
   - Copy the project URL and anon key into `.env`

2. **No Supabase env vars in `.env` yet.** `src/lib/supabase.ts` will throw at
   runtime until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
   This does not affect the existing portfolio page — the Supabase client is
   only imported by the CMS pages (lazy-loaded chunks).

3. **react-router v6 moderate CVEs** — Two moderate-severity CVEs exist in
   react-router 6.30.6 (open redirect via backslash, SSR hydration injection).
   The SSR CVE is not applicable to this SPA. The open redirect affects `<Link>`
   with attacker-controlled `to` props, which is not a pattern used here.
   The safe fix is upgrading to react-router v7, which is a breaking API change
   deferred to Milestone 3 or later. See docs/security-notes.md.

4. **express / qs moderate CVEs** — in the `express` template remnant package.
   `server.js` does not exist; express never runs. Risk is zero. The package
   should be removed in a separate cleanup task.
