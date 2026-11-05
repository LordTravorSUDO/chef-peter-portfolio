/**
 * Sitemap and robots.txt tests.
 * Run: npx tsx --test tests/unit/seo-sitemap.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSitemapXml, sitemapEntries } from '../../src/lib/seo/sitemap';
import { SEO_PAGES } from '../../src/data/seoPages';

const S = 'https://www.chefpetertheteacher.com';
const articles = [
  { slug: 'how-to-laminate-dough', updated_at: '2026-10-22T08:00:00Z', published_at: '2026-10-20T08:00:00Z', categories: [{ slug: 'pastry-and-bakery', is_active: true }] },
  { slug: 'cooling-rice-safely', updated_at: '2026-10-11T08:00:00Z', published_at: '2026-10-10T08:00:00Z', categories: [{ slug: 'food-safety-and-hygiene' }, { slug: 'pastry-and-bakery', is_active: true }] },
  { slug: 'old-notes', updated_at: '2026-09-01T08:00:00Z', published_at: '2026-09-01T08:00:00Z', categories: [{ slug: 'hidden-subject', is_active: false }] },
];

test('sitemap lists homepage, library, every landing page, categories and articles', () => {
  const locs = sitemapEntries(articles).map((e) => e.loc);
  assert.equal(locs[0], `${S}/`);
  assert.ok(locs.includes(`${S}/articles`));
  for (const p of SEO_PAGES) assert.ok(locs.includes(`${S}${p.path}`), `landing page ${p.path}`);
  assert.ok(locs.includes(`${S}/category/pastry-and-bakery`));
  assert.ok(locs.includes(`${S}/category/food-safety-and-hygiene`));
  assert.ok(!locs.includes(`${S}/category/hidden-subject`), 'hidden categories excluded');
  for (const a of articles) assert.ok(locs.includes(`${S}/articles/${a.slug}`));
  assert.ok(!locs.some((l) => /\/tag\/|\/admin|\/api\/|\?/.test(l)), 'no tag, admin, api or query URLs');
  assert.equal(new Set(locs).size, locs.length, 'no duplicates');
});

test('lastmod uses real dates only', () => {
  const e = Object.fromEntries(sitemapEntries(articles).map((x) => [x.loc, x.lastmod]));
  assert.equal(e[`${S}/`], '2026-10-22');
  assert.equal(e[`${S}/category/pastry-and-bakery`], '2026-10-22');
  assert.equal(e[`${S}/articles/cooling-rice-safely`], '2026-10-11');
  assert.equal(e[`${S}/private-chef-uganda`], undefined, 'no invented lastmod for static pages');
});

test('with no articles (database unavailable) the static pages are still listed', () => {
  const locs = sitemapEntries([]).map((e) => e.loc);
  assert.equal(locs.length, 2 + SEO_PAGES.length);
});

test('XML is well formed and escaped', () => {
  const xml = buildSitemapXml([{ loc: `${S}/a?b=1&c=2`, lastmod: '2026-01-01' }]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/www\.chefpetertheteacher\.com\/a\?b=1&amp;c=2<\/loc>/);
});

test('robots.txt blocks admin and api but allows the sitemap it points to', () => {
  const robots = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^Disallow: \/admin\/$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, /^Allow: \/api\/sitemap$/m, 'sitemap target must be crawlable (Google: longest matching rule wins)');
  assert.match(robots, /^Sitemap: https:\/\/www\.chefpetertheteacher\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: \/articles/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
});

test('vercel.json still sends /sitemap.xml to the dynamic sitemap', () => {
  const v = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.ok(v.redirects.some((r: { source: string; destination: string }) => r.source === '/sitemap.xml' && r.destination === '/api/sitemap'));
});

// ── CMS article SEO checks ─────────────────────────────────────────────────
import { checkArticles } from '../../src/lib/seo/articleChecks';

const base = { status: 'published', noindex: false, featured_image_id: 'm', featured_image: { alt_text: 'Croissants' }, seo_title: null, meta_description: null };

test('article checks flag duplicates, missing descriptions, alt text and noindex', () => {
  const desc = 'A practical lesson on laminating dough for croissants, with butter temperatures, folds and proofing for warm kitchens.';
  const issues = checkArticles([
    { ...base, id: '1', title: 'Laminating dough', slug: 'laminating-dough', excerpt: desc },
    { ...base, id: '2', title: 'Laminating dough', slug: 'laminating-dough-2', excerpt: desc },
    { ...base, id: '3', title: 'Cooling rice', slug: 'cooling-rice', excerpt: '' },
    { ...base, id: '4', title: 'Knife skills', slug: 'knife-skills', excerpt: desc + ' Extra.', featured_image: { alt_text: '' } },
    { ...base, id: '5', title: 'Hidden', slug: 'hidden', excerpt: 'x', noindex: true },
    { ...base, id: '6', title: 'Draft', slug: 'draft', excerpt: '', status: 'draft' },
  ]);
  const msgs = (id: string) => issues.filter((i) => i.articleId === id).map((i) => i.message).join(' | ');
  assert.match(msgs('1'), /Same title/);
  assert.match(msgs('1'), /Same description/);
  assert.match(msgs('3'), /No description/);
  assert.match(msgs('4'), /no alt text/);
  assert.match(msgs('5'), /noindex/);
  assert.equal(msgs('6'), '', 'drafts are not checked');
});
