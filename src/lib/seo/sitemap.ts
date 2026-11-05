/**
 * XML sitemap builder (pure — used by api/sitemap.ts and unit tests).
 *
 * Includes every page that should be indexed:
 *   - homepage, library (/articles) and the prerendered SEO landing pages
 *   - published, indexable articles (lastmod = last update)
 *   - category pages that contain at least one published article and are
 *     not hidden (lastmod = most recent article in the category)
 * Excludes tag pages (noindex), search/filter URLs, admin and API routes.
 *
 * lastmod is only given where a real date is known — never "now" — so search
 * engines can trust it.
 */
import { SEO_PAGES } from '../../data/seoPages';

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
    ...SEO_PAGES.map((p) => ({ loc: `${SITE_URL}${p.path}` })),
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
