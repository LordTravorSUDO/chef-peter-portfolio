/**
 * GET /api/sitemap — Dynamic XML sitemap.
 *
 * Returns an XML sitemap containing:
 *   - The homepage (always included, priority 1.0)
 *   - All published, indexable (noindex=false) article URLs
 *
 * Excludes:
 *   - Draft, scheduled, archived articles
 *   - Articles with noindex=true
 *   - Admin routes, API routes, category/tag pages
 *
 * Uses the Supabase service-role key (server-side only).
 * Cached at the Vercel edge for 30 minutes.
 *
 * SETUP REQUIRED:
 *   Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables.
 *   Then point robots.txt to this dynamic sitemap:
 *     Sitemap: https://www.chefpetertheteacher.com/api/sitemap
 *
 * Vercel function runtime: Node.js (auto-detected from file extension)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_URL = 'https://www.chefpetertheteacher.com';

interface ArticleRow {
  slug:         string;
  updated_at:   string;
  published_at: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toDate(iso: string): string {
  // Return YYYY-MM-DD for sitemap lastmod
  return iso.slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Fallback: static sitemap with homepage only
    const xml = buildSitemap([]);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    res.status(200).send(xml);
    return;
  }

  // Fetch all published, indexable articles
  const now = new Date().toISOString();
  const url = new URL(`${supabaseUrl}/rest/v1/articles`);
  url.searchParams.set('status',       'eq.published');
  url.searchParams.set('published_at', `lte.${now}`);
  url.searchParams.set('noindex',      'eq.false');
  url.searchParams.set('select',       'slug,updated_at,published_at');
  url.searchParams.set('order',        'published_at.desc');
  url.searchParams.set('limit',        '1000');

  try {
    const apiRes = await fetch(url.toString(), {
      headers: {
        apikey:        serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept:        'application/json',
      },
    });

    if (!apiRes.ok) {
      throw new Error(`Supabase error: ${apiRes.status}`);
    }

    const articles = await apiRes.json() as ArticleRow[];

    const xml = buildSitemap(articles);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    res.status(200).send(xml);
  } catch (err) {
    // On error return a minimal valid sitemap rather than 500
    console.error('[sitemap] Error fetching articles:', err);
    const xml = buildSitemap([]);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(200).send(xml);
  }
}

function buildSitemap(articles: ArticleRow[]): string {
  const now = toDate(new Date().toISOString());

  const articleEntries = articles.map((a) => `
  <url>
    <loc>${esc(`${SITE_URL}/articles/${a.slug}`)}</loc>
    <lastmod>${esc(toDate(a.updated_at))}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/articles</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>${articleEntries}
</urlset>`;
}
