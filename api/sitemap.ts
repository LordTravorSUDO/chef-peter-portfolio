/**
 * GET /api/sitemap — Dynamic XML sitemap (also served at /sitemap.xml via vercel.json).
 *
 * Contents:
 *   - homepage, /articles and every prerendered SEO landing page
 *   - published, indexable articles (status=published, published_at <= now, noindex=false)
 *   - category pages that contain published articles and are not hidden
 * Excludes drafts, scheduled, archived and noindex articles, tag pages,
 * search/filter URLs, admin and API routes.
 *
 * robots.txt explicitly allows /api/sitemap (the rest of /api/ stays disallowed),
 * so crawlers can follow the /sitemap.xml redirect.
 *
 * Uses the Supabase service-role key server-side only. Cached at the edge for
 * 30 minutes. If Supabase is unavailable, the static pages are still listed.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Sitemap builder (pure; exported for unit tests) ─────────────────────────
// This function is deployed on its own: Vercel compiles each API file
// separately as an ES module, so it must not import from src/ (extensionless
// imports fail at runtime with ERR_MODULE_NOT_FOUND). The landing-page list
// below is checked against src/data/seoPages.ts by tests/unit/seo-sitemap.test.ts.

/** Prerendered SEO landing pages (must match SEO_PAGES in src/data/seoPages.ts). */
export const LANDING_PATHS = [
  '/private-chef-uganda',
  '/culinary-consultant-uganda',
  '/cooking-classes-kampala',
  '/baking-pastry-classes',
  '/hospitality-consultancy',
  '/about-chef-peter',
  '/culinary-books',
];

export const SITE_URL = 'https://www.chefpetertheteacher.com';

export interface SitemapArticle {
  slug: string;
  updated_at: string;
  published_at: string | null;
  categories: Array<{ slug: string; is_active?: boolean | null }>;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

const day = (iso: string) => iso.slice(0, 10);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const latest = (dates: string[]) => dates.reduce<string | undefined>((max, d) => (!max || d > max ? d : max), undefined);

export function sitemapEntries(articles: SitemapArticle[]): SitemapEntry[] {
  const newest = latest(articles.map((a) => a.updated_at));
  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, ...(newest ? { lastmod: day(newest) } : {}) },
    { loc: `${SITE_URL}/articles`, ...(newest ? { lastmod: day(newest) } : {}) },
    ...LANDING_PATHS.map((p) => ({ loc: `${SITE_URL}${p}` })),
  ];

  const categoryDates = new Map<string, string[]>();
  for (const a of articles) {
    for (const c of a.categories) {
      if (!c?.slug || c.is_active === false) continue;
      categoryDates.set(c.slug, [...(categoryDates.get(c.slug) ?? []), a.updated_at]);
    }
  }
  for (const [slug, dates] of [...categoryDates].sort(([a], [b]) => a.localeCompare(b))) {
    entries.push({ loc: `${SITE_URL}/category/${slug}`, lastmod: day(latest(dates)!) });
  }

  for (const a of articles) {
    entries.push({ loc: `${SITE_URL}/articles/${a.slug}`, lastmod: day(a.updated_at) });
  }

  // De-duplicate (defensive)
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.loc) ? false : (seen.add(e.loc), true)));
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => `  <url>\n    <loc>${esc(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${esc(e.lastmod)}</lastmod>` : ''}\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

interface ArticleRow {
  slug: string;
  updated_at: string;
  published_at: string | null;
  article_categories?: Array<{ categories: { slug: string; is_active?: boolean | null } | null }>;
}

async function fetchArticles(supabaseUrl: string, serviceKey: string, withActiveFlag: boolean): Promise<ArticleRow[]> {
  const url = new URL(`${supabaseUrl}/rest/v1/articles`);
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('published_at', `lte.${new Date().toISOString()}`);
  url.searchParams.set('noindex', 'eq.false');
  url.searchParams.set('select', `slug,updated_at,published_at,article_categories(categories(slug${withActiveFlag ? ',is_active' : ''}))`);
  url.searchParams.set('order', 'published_at.desc');
  url.searchParams.set('limit', '5000');
  const res = await fetch(url.toString(), {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return (await res.json()) as ArticleRow[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let rows: ArticleRow[] = [];
  let cache = 'public, s-maxage=1800, stale-while-revalidate=300';

  if (supabaseUrl && serviceKey) {
    try {
      // categories.is_active exists only after the knowledge-platform migration
      rows = await fetchArticles(supabaseUrl, serviceKey, true).catch(() => fetchArticles(supabaseUrl, serviceKey, false));
    } catch (err) {
      console.error('[sitemap] Error fetching articles:', err);
      cache = 'public, s-maxage=60';
    }
  }

  const articles: SitemapArticle[] = rows.map((r) => ({
    slug: r.slug,
    updated_at: r.updated_at,
    published_at: r.published_at,
    categories: (r.article_categories ?? []).map((ac) => ac.categories).filter((c): c is { slug: string; is_active?: boolean | null } => !!c),
  }));

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.status(200).send(buildSitemapXml(sitemapEntries(articles)));
}
