/**
 * GET /api/sitemap — Dynamic XML sitemap (also served at /sitemap.xml via vercel.json).
 *
 * Contents (see src/lib/seo/sitemap.ts):
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
import { buildSitemapXml, sitemapEntries, type SitemapArticle } from '../src/lib/seo/sitemap';

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
