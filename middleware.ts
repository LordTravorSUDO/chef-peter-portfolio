/**
 * Vercel Edge Middleware — server-side SEO metadata injection.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RUNTIME: Vercel Edge (V8-based, Web API subset)
 * This file must use ONLY standard Web APIs. No Node.js built-ins (fs, path,
 * crypto, etc.). No Next.js imports. No @vercel/edge import is required —
 * Request, Response, URL, and fetch are available as globals.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS DOES:
 *   Intercepts HTTP requests for public article/category/tag pages, fetches
 *   the relevant data from Supabase, builds the correct <head> metadata, and
 *   injects it into the index.html shell before delivering it to the requester.
 *
 *   This ensures that search engine crawlers and social media bots (which do
 *   not execute JavaScript) receive real metadata in the initial HTML response,
 *   rather than the homepage's static <title> and <meta> tags.
 *
 * WHAT IT DOES NOT DO:
 *   - Does not replace client-side rendering (React hydrates normally)
 *   - Does not expose the service-role key to the browser
 *   - Does not affect admin routes (they pass through immediately)
 *
 * ENVIRONMENT VARIABLES (server-side only — no VITE_ prefix):
 *   SUPABASE_URL              — same host as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API → service_role
 *
 * PLATFORM LIMITATION — HTTP 404:
 *   Vercel SPA rewrites always return HTTP 200. This middleware cannot change
 *   the HTTP status code for missing articles. Mitigation: inject
 *   X-Robots-Tag: noindex on missing slugs to prevent accidental indexing.
 *
 * VERCEL CONFIGURATION:
 *   Vercel automatically picks up middleware.ts at the project root.
 *   The `config.matcher` array below controls which paths are intercepted.
 *   Paths NOT in the matcher are served directly from the CDN without this
 *   middleware running, keeping latency low for admin pages and static assets.
 */

export const config = {
  matcher: [
    // Prerendered pages (served from their build-time HTML files)
    '/',
    '/private-chef-uganda',
    '/culinary-consultant-uganda',
    '/cooking-classes-kampala',
    '/baking-pastry-classes',
    '/hospitality-consultancy',
    '/about-chef-peter',
    '/culinary-books',
    // CMS pages (metadata injection + server-side redirects)
    '/articles',
    '/articles/:slug*',
    '/category/:slug*',
    '/tag/:slug*',
  ],
};

/**
 * Paths with prerendered HTML written by scripts/prerender.mjs.
 * Keep in sync with config.matcher (checked by tests/unit/middleware-inject.test.ts).
 */
export const PRERENDERED_FILES: Record<string, string> = {
  '/': '/home.html',
  '/private-chef-uganda': '/private-chef-uganda.html',
  '/culinary-consultant-uganda': '/culinary-consultant-uganda.html',
  '/cooking-classes-kampala': '/cooking-classes-kampala.html',
  '/baking-pastry-classes': '/baking-pastry-classes.html',
  '/hospitality-consultancy': '/hospitality-consultancy.html',
  '/about-chef-peter': '/about-chef-peter.html',
  '/culinary-books': '/culinary-books.html',
};

/**
 * Validates a redirect destination from the database: only same-site,
 * root-relative paths are allowed (never another domain or a protocol URL).
 */
export function safeRedirectTarget(to: string | null | undefined): string | null {
  if (!to) return null;
  const t = to.trim();
  if (!t.startsWith('/') || t.startsWith('//') || /[\\\s]/.test(t)) return null;
  return t;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SITE_URL        = 'https://www.chefpetertheteacher.com';
const SITE_NAME       = 'Chef Peter the Teacher';
const AUTHOR_NAME     = 'Chef Peter the Teacher';
const DEFAULT_OG_IMG  = `${SITE_URL}/images/chef-peter.jpg`;
const HEAD_PLACEHOLDER = '<!-- __SEO_INJECTION__ -->';

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escLd(s: string): string {
  return s.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (raw fetch only — no supabase-js in edge runtime)
// ---------------------------------------------------------------------------
interface ArticleRow {
  slug: string; title: string; excerpt: string;
  author_display_name: string;
  seo_title: string | null; meta_description: string | null;
  canonical_url: string | null; noindex: boolean;
  published_at: string | null; updated_at: string;
  article_categories: Array<{ is_primary: boolean; categories: { name: string; slug: string } | null }>;
  article_tags: Array<{ tags: { name: string } | null }>;
  featured_image: { storage_path: string; alt_text: string | null; width_px: number | null; height_px: number | null } | null;
  social_image: { storage_path: string; alt_text: string | null } | null;
}

async function fetchArticle(slug: string, url: string, key: string): Promise<ArticleRow | null> {
  const endpoint = new URL(`${url}/rest/v1/articles`);
  endpoint.searchParams.set('slug',         `eq.${slug}`);
  endpoint.searchParams.set('status',       'eq.published');
  endpoint.searchParams.set('published_at', `lte.${new Date().toISOString()}`);
  endpoint.searchParams.set('noindex',      'eq.false');
  endpoint.searchParams.set('select', [
    'slug,title,excerpt,author_display_name',
    'seo_title,meta_description,canonical_url,noindex,published_at,updated_at',
    'article_categories(is_primary,categories(name,slug))',
    'article_tags(tags(name))',
    'featured_image:media!articles_featured_image_id_fkey(storage_path,alt_text,width_px,height_px)',
    'social_image:media!articles_social_image_id_fkey(storage_path,alt_text)',
  ].join(','));
  endpoint.searchParams.set('limit', '1');

  const res = await fetch(endpoint.toString(), {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json() as ArticleRow[];
  return rows[0] ?? null;
}

async function fetchCategory(slug: string, url: string, key: string): Promise<{ name: string; description: string | null } | null> {
  const endpoint = new URL(`${url}/rest/v1/categories`);
  endpoint.searchParams.set('slug', `eq.${slug}`);
  endpoint.searchParams.set('select', 'name,description');
  endpoint.searchParams.set('limit', '1');
  const res = await fetch(endpoint.toString(), {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{ name: string; description: string | null }>;
  return rows[0] ?? null;
}

async function fetchTag(slug: string, url: string, key: string): Promise<{ name: string } | null> {
  const endpoint = new URL(`${url}/rest/v1/tags`);
  endpoint.searchParams.set('slug', `eq.${slug}`);
  endpoint.searchParams.set('select', 'name');
  endpoint.searchParams.set('limit', '1');
  const res = await fetch(endpoint.toString(), {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{ name: string }>;
  return rows[0] ?? null;
}

/** Active redirect rule for a path (redirects table, managed in the CMS). */
async function fetchRedirect(fromPath: string, url: string, key: string): Promise<{ to_path: string; status_code: number } | null> {
  const endpoint = new URL(`${url}/rest/v1/redirects`);
  endpoint.searchParams.set('from_path', `eq.${fromPath}`);
  endpoint.searchParams.set('is_active', 'eq.true');
  endpoint.searchParams.set('select', 'to_path,status_code');
  endpoint.searchParams.set('limit', '1');
  const res = await fetch(endpoint.toString(), {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<{ to_path: string; status_code: number }>;
  return rows[0] ?? null;
}

/** A real HTTP redirect (301/302) when a moved page has a redirect rule. */
async function redirectIfMoved(request: Request, pathname: string, supabaseUrl: string, key: string): Promise<Response | null> {
  try {
    const rule = await fetchRedirect(pathname, supabaseUrl, key);
    const target = safeRedirectTarget(rule?.to_path);
    if (!rule || !target || target === pathname) return null;
    const status = rule.status_code === 302 ? 302 : 301;
    return new Response(null, {
      status,
      headers: { Location: new URL(target, request.url).toString(), 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image URL builder (mirrors getResponsiveMediaUrl from src/lib/services/media)
// ---------------------------------------------------------------------------
function imgUrl(storagePath: string, supabaseUrl: string, width?: number): string {
  const base = `${supabaseUrl}/storage/v1/object/public/article-media/${storagePath}`;
  if (!storagePath.endsWith('.svg') && !storagePath.endsWith('.gif') && width) {
    return `${base}?width=${width}&quality=80`;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Head tag builders
// ---------------------------------------------------------------------------
function articleHead(a: ArticleRow, supabaseUrl: string): string {
  const title   = (a.seo_title ?? a.title ?? '').trim();
  const pt      = title ? articleDocumentTitle(title) : SITE_NAME;
  const desc    = (a.meta_description ?? a.excerpt ?? '').trim().slice(0, 160);
  const canon   = a.canonical_url?.trim() || `${SITE_URL}/articles/${a.slug}`;
  const robots  = a.noindex ? 'noindex, follow' : 'index, follow';
  const imgRec  = a.social_image ?? a.featured_image;
  const ogImg   = imgRec ? imgUrl(imgRec.storage_path, supabaseUrl, 1200) : DEFAULT_OG_IMG;
  const ogAlt   = imgRec?.alt_text ?? title;
  const primCat = a.article_categories?.find(ac => ac.is_primary)?.categories
               ?? a.article_categories?.[0]?.categories ?? null;
  const tags    = a.article_tags?.map(t => t.tags?.name).filter(Boolean) ?? [];

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.title, description: desc, url: canon,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canon },
    datePublished: a.published_at ?? undefined, dateModified: a.updated_at,
    author: { '@type': 'Person', name: a.author_display_name ?? AUTHOR_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMG } },
    ...(imgRec ? { image: { '@type': 'ImageObject', url: ogImg, caption: imgRec.alt_text ?? '' } } : {}),
    ...(primCat ? { articleSection: primCat.name } : {}),
    ...(tags.length ? { keywords: tags.join(', ') } : {}),
  };

  return [
    `<title>${esc(pt)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${esc(canon)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(pt)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(canon)}" />`,
    `<meta property="og:image" content="${esc(ogImg)}" />`,
    `<meta property="og:image:alt" content="${esc(ogAlt)}" />`,
    ...(!a.social_image && a.featured_image?.width_px && a.featured_image?.height_px
      ? [`<meta property="og:image:width" content="${a.featured_image.width_px}" />`, `<meta property="og:image:height" content="${a.featured_image.height_px}" />`]
      : []),
    `<meta property="article:published_time" content="${a.published_at ?? ''}" />`,
    `<meta property="article:modified_time" content="${a.updated_at}" />`,
    ...(primCat ? [`<meta property="article:section" content="${esc(primCat.name)}" />`] : []),
    ...tags.map(t => `<meta property="article:tag" content="${esc(String(t))}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(pt)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(ogImg)}" />`,
    `<script type="application/ld+json">${escLd(JSON.stringify(ld))}</script>`,
  ].join('\n    ');
}

function blogIndexHead(): string {
  const t   = `Articles | ${SITE_NAME}`;
  const d   = 'Culinary articles, recipes, food history and hospitality insights from Chef Peter the Teacher — executive chef based in Kampala, Uganda.';
  const c   = `${SITE_URL}/articles`;
  const ld  = escLd(JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Blog', name: t, url: c,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }));
  return [
    `<title>${esc(t)}</title>`,
    `<meta name="description" content="${esc(d)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${esc(c)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(t)}" />`,
    `<meta property="og:description" content="${esc(d)}" />`,
    `<meta property="og:url" content="${esc(c)}" />`,
    `<meta property="og:image" content="${esc(DEFAULT_OG_IMG)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(t)}" />`,
    `<meta name="twitter:description" content="${esc(d)}" />`,
    `<meta name="twitter:image" content="${esc(DEFAULT_OG_IMG)}" />`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n    ');
}

function categoryHead(name: string, slug: string, desc?: string | null): string {
  const t  = `${name} Articles | ${SITE_NAME}`;
  const d  = desc || `Browse ${name} articles from ${SITE_NAME}.`;
  const c  = `${SITE_URL}/category/${slug}`;
  return [
    `<title>${esc(t)}</title>`,
    `<meta name="description" content="${esc(d)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${esc(c)}" />`,
    `<meta property="og:title" content="${esc(t)}" />`,
    `<meta property="og:description" content="${esc(d)}" />`,
    `<meta property="og:url" content="${esc(c)}" />`,
    `<meta property="og:image" content="${esc(DEFAULT_OG_IMG)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(t)}" />`,
  ].join('\n    ');
}

function tagHead(name: string, slug: string): string {
  const t  = `#${name} Articles | ${SITE_NAME}`;
  const d  = `Browse articles tagged "${name}" from ${SITE_NAME}.`;
  const c  = `${SITE_URL}/tag/${slug}`;
  return [
    `<title>${esc(t)}</title>`,
    `<meta name="description" content="${esc(d)}" />`,
    `<meta name="robots" content="noindex, follow" />`,
    `<link rel="canonical" href="${esc(c)}" />`,
    `<meta property="og:title" content="${esc(t)}" />`,
    `<meta property="og:url" content="${esc(c)}" />`,
  ].join('\n    ');
}

function notFoundHead(): string {
  return [
    `<title>Article Not Found | ${SITE_NAME}</title>`,
    `<meta name="robots" content="noindex, follow" />`,
  ].join('\n    ');
}

/** Mirrors articleDocumentTitle() in src/lib/seo/schema.ts (kept self-contained for the Edge runtime). */
export function articleDocumentTitle(title: string): string {
  const t = title.trim();
  for (const suffix of [` | ${SITE_NAME}`, ' | Chef Peter']) if ((t + suffix).length <= 65) return t + suffix;
  return t;
}

// ---------------------------------------------------------------------------
// HTML injection
// ---------------------------------------------------------------------------
/**
 * Replaces the homepage's default SEO tags (marked data-default-seo in
 * index.html) with the page-specific tags. Without this, crawlers received two
 * <title>s and two canonical links — the first pointing at the homepage.
 * Injected tags are marked data-seo-injected so the browser app can replace
 * them with its own identical tags without creating duplicates.
 */
export function inject(html: string, head: string): string {
  const cleaned = html
    .replace(/[ \t]*<title\b[^>]*\bdata-default-seo\b[^>]*>[\s\S]*?<\/title>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<(?:meta|link)\b[^>]*\bdata-default-seo\b[^>]*>[ \t]*\r?\n?/gi, '');
  const marked = head.replace(/<(title|meta|link|script)\b/gi, '<$1 data-seo-injected');
  if (cleaned.includes(HEAD_PLACEHOLDER)) {
    return cleaned.replace(HEAD_PLACEHOLDER, marked);
  }
  return cleaned.replace('</head>', `  ${marked}\n</head>`);
}

/** Vercel middleware rewrite: serve another path of this deployment at the same URL. */
export function rewriteTo(destination: URL): Response {
  return new Response(null, { headers: { 'x-middleware-rewrite': destination.toString() } });
}

// ---------------------------------------------------------------------------
// Main middleware handler
// ---------------------------------------------------------------------------
export default async function middleware(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  // Pass through static assets and admin routes immediately
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')          // static files (.js, .css, .ico, etc.)
  ) {
    return fetch(request);
  }

  // Prerendered pages: serve the build-time HTML (full content for crawlers and
  // link previews). Independent of Supabase. Uses Vercel's middleware rewrite
  // (the same header @vercel/edge's rewrite() sets): the static file is served
  // directly, with no extra request, so it also works on protected previews.
  const prerendered = PRERENDERED_FILES[pathname];
  if (prerendered) return rewriteTo(new URL(prerendered, request.url));

  const supabaseUrl = (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined)
    ?? (globalThis as Record<string, unknown>).SUPABASE_URL as string | undefined;
  const serviceKey  = (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined)
    ?? (globalThis as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  // If env vars are missing, fall through to the CDN (local dev without middleware)
  if (!supabaseUrl || !serviceKey) {
    return fetch(request);
  }

  // Fetch the base index.html from the origin
  const origin   = new URL(request.url).origin;
  const htmlResp = await fetch(`${origin}/index.html`);
  if (!htmlResp.ok) return fetch(request);
  const baseHtml = await htmlResp.text();

  try {
    // ── /articles (exact) ────────────────────────────────────────────────
    if (pathname === '/articles') {
      return new Response(inject(baseHtml, blogIndexHead()), {
        headers: {
          'Content-Type':  'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        },
      });
    }

    // ── /articles/:slug ──────────────────────────────────────────────────
    const artMatch = pathname.match(/^\/articles\/([a-z0-9][a-z0-9-]{0,79})$/);
    if (artMatch) {
      const article = await fetchArticle(artMatch[1], supabaseUrl, serviceKey);
      if (!article) {
        const moved = await redirectIfMoved(request, pathname, supabaseUrl, serviceKey);
        if (moved) return moved;
        return new Response(inject(baseHtml, notFoundHead()), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow',
          },
        });
      }
      return new Response(inject(baseHtml, articleHead(article, supabaseUrl)), {
        headers: {
          'Content-Type':  'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      });
    }

    // ── /category/:slug ──────────────────────────────────────────────────
    const catMatch = pathname.match(/^\/category\/([a-z0-9][a-z0-9-]{0,79})$/);
    if (catMatch) {
      const cat = await fetchCategory(catMatch[1], supabaseUrl, serviceKey);
      if (!cat) {
        const moved = await redirectIfMoved(request, pathname, supabaseUrl, serviceKey);
        if (moved) return moved;
        return new Response(inject(baseHtml, notFoundHead()), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, follow' },
        });
      }
      return new Response(inject(baseHtml, categoryHead(cat.name, catMatch[1], cat.description)), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' },
      });
    }

    // ── /tag/:slug ───────────────────────────────────────────────────────
    const tagMatch = pathname.match(/^\/tag\/([a-z0-9][a-z0-9-]{0,79})$/);
    if (tagMatch) {
      const tag = await fetchTag(tagMatch[1], supabaseUrl, serviceKey);
      if (!tag) {
        const moved = await redirectIfMoved(request, pathname, supabaseUrl, serviceKey);
        if (moved) return moved;
        return new Response(inject(baseHtml, notFoundHead()), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, follow' },
        });
      }
      return new Response(inject(baseHtml, tagHead(tag.name, tagMatch[1])), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' },
      });
    }
  } catch {
    // On any error, serve the unmodified HTML — React renders client-side
    return new Response(baseHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return fetch(request);
}
