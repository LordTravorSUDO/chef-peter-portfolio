/**
 * Automated SEO audit of the built site.
 *
 * Serves dist/ the way production routes it (prerendered HTML for "/" and the
 * landing pages, SPA fallback otherwise), answers Supabase with an in-memory
 * mock containing only public content, and checks every page for:
 *   - exactly one <title>, meta description, canonical (absolute), H1
 *   - title / description length and uniqueness across indexable pages
 *   - heading levels without skips, alt attribute on every <img>
 *   - Open Graph + Twitter tags
 *   - JSON-LD that parses and has the properties each type requires
 *   - raw HTML (no JavaScript) contains the page content for prerendered pages
 *   - every internal link resolves (no "not found" page) and #anchors exist
 *
 * Errors fail the run; warnings are reported.
 *
 * Run:
 *   VITE_SUPABASE_URL=https://testref.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key npm run build
 *   node tests/seo/seo-audit.cjs dist
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createMock } = require('../e2e/lib/postgrest-mock.cjs');

const DIST = path.resolve(process.argv[2] || 'dist');
const JSON_OUT = process.argv[3];
const SB = 'https://testref.supabase.co';
const SITE = 'https://www.chefpetertheteacher.com';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// ── Server emulating production routing ─────────────────────────────────────
function startServer() {
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jfif': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, p);
    if (p === '/' && fs.existsSync(path.join(DIST, 'home.html'))) file = path.join(DIST, 'home.html');
    else if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const html = path.join(DIST, p.replace(/\/$/, '') + '.html');
      file = fs.existsSync(html) ? html : path.join(DIST, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// ── Public content seed ─────────────────────────────────────────────────────
const C1 = 'cccccccc-0000-4000-8000-000000000001';
const C2 = 'cccccccc-0000-4000-8000-000000000002';
const T1 = 'dddddddd-0000-4000-8000-000000000001';
const M1 = 'eeeeeeee-0000-4000-8000-000000000001';
const art = (n, over) => ({
  id: `aaaaaaaa-0000-4000-8000-00000000000${n}`, excerpt: 'A practical lesson for cooks and bakers in Ugandan and international kitchens, with clear steps and the reasons behind them.',
  body: '<p>Intro paragraph.</p><h2>Understanding the technique</h2><p>Text.</p><h2>Step by step</h2><ol><li>One</li><li>Two</li></ol><h3>Detail</h3><p>Text.</p><h2>Summary</h2><p>Text.</p>',
  reading_time_minutes: 4, author_id: '11111111-1111-4111-8111-111111111111', author_display_name: 'Chef Peter the Teacher', featured_image_id: M1, social_image_id: null,
  status: 'published', scheduled_for: null, seo_title: null, meta_description: null, canonical_url: null, noindex: false, view_count: 0,
  article_type: 'educational', is_featured: false, is_editors_pick: false, recipe: null, created_at: '2026-10-01T08:00:00Z', ...over,
});
const SEED = {
  categories: [
    { id: C1, slug: 'pastry-and-bakery', name: 'Pastry and Bakery', description: 'Breads, pastry, cakes and confectionery — formulas, methods and troubleshooting.', image_id: null, sort_order: 1, is_active: true },
    { id: C2, slug: 'international-cuisines', name: 'International Cuisines', description: 'Dishes from around the world, prepared in African kitchens with local ingredients.', image_id: null, sort_order: 2, is_active: true },
  ],
  tags: [{ id: T1, slug: 'lamination', name: 'Lamination', created_at: '2026-01-01T00:00:00Z' }],
  media: [{ id: M1, storage_path: 'uploads/croissant.png', original_filename: 'croissant.png', mime_type: 'image/png', file_size_bytes: 10, width_px: 1200, height_px: 800, alt_text: 'Golden laminated croissants', caption: null, credit: null }],
  articles: [
    art(1, { slug: 'how-to-laminate-dough', title: 'How to laminate dough for croissants', article_type: 'baking_tutorial', published_at: '2026-10-20T08:00:00Z', updated_at: '2026-10-22T08:00:00Z', seo_title: 'Laminating dough for croissants: a step-by-step guide', meta_description: 'Learn how to laminate dough for croissants: butter temperature, folding and proofing, with tips for warm Ugandan kitchens.',
      recipe: { prep_minutes: 90, cook_minutes: 18, yield: '12 croissants', ingredients: [{ quantity: '500', unit: 'g', item: 'bread flour' }], method: ['Roll', 'Shape'] } }),
    art(2, { slug: 'rolex-kampala-rolled-chapati', title: 'Rolex: Kampala’s rolled chapati and egg', article_type: 'recipe', published_at: '2026-10-12T08:00:00Z', updated_at: '2026-10-12T08:00:00Z',
      recipe: { prep_minutes: 10, cook_minutes: 10, servings: 2, ingredients: [{ quantity: '2', item: 'chapatis' }, { quantity: '3', item: 'eggs' }], preparation: ['Beat the eggs.'], method: ['Cook the omelette.', 'Roll in the chapati.'] } }),
  ],
  article_categories: [
    { article_id: 'aaaaaaaa-0000-4000-8000-000000000001', category_id: C1, is_primary: true },
    { article_id: 'aaaaaaaa-0000-4000-8000-000000000002', category_id: C2, is_primary: true },
  ],
  article_tags: [{ article_id: 'aaaaaaaa-0000-4000-8000-000000000001', tag_id: T1 }],
};

const PAGES = [
  { path: '/', prerendered: true },
  { path: '/about-chef-peter', prerendered: true },
  { path: '/private-chef-uganda', prerendered: true },
  { path: '/culinary-consultant-uganda', prerendered: true },
  { path: '/cooking-classes-kampala', prerendered: true },
  { path: '/baking-pastry-classes', prerendered: true },
  { path: '/hospitality-consultancy', prerendered: true },
  { path: '/culinary-books', prerendered: true },
  { path: '/articles' },
  { path: '/category/pastry-and-bakery' },
  { path: '/articles/how-to-laminate-dough' },
  { path: '/articles/rolex-kampala-rolled-chapati' },
  { path: '/tag/lamination', noindex: true },
];

// ── Structured data rules (Google's required properties for each feature) ──
const REQUIRED = {
  Person: ['name'],
  Organization: ['name'],
  WebSite: ['name', 'url'],
  WebPage: ['url'],
  ProfilePage: ['mainEntity'],
  CollectionPage: ['name', 'url'],
  BlogPosting: ['headline', 'datePublished', 'author'],
  Article: ['headline', 'datePublished', 'author'],
  Recipe: ['name', 'image', 'recipeIngredient', 'recipeInstructions'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
  Book: ['name', 'author'],
  Service: ['name', 'provider'],
  ItemList: ['itemListElement'],
};

function collectNodes(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => collectNodes(v, out));
  else if (value && typeof value === 'object') {
    if (value['@type']) out.push(value);
    for (const [k, v] of Object.entries(value)) if (k !== '@type') collectNodes(v, out);
  }
  return out;
}

function checkJsonLd(texts, issues) {
  const types = [];
  for (const text of texts) {
    let data;
    try { data = JSON.parse(text); } catch (e) { issues.push(['error', `JSON-LD does not parse: ${e.message}`]); continue; }
    for (const node of collectNodes(data)) {
      const ts = [].concat(node['@type']);
      types.push(...ts);
      for (const t of ts) {
        const isReference = Object.keys(node).every((k) => k === '@type' || k === '@id');
        if (isReference) continue;
        for (const prop of REQUIRED[t] ?? []) {
          const v = node[prop];
          if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
            if (!(node['@id'] && texts.join('').includes(`"@id":"${node['@id']}"`) && Object.keys(node).length <= 2)) issues.push(['error', `${t} is missing "${prop}"`]);
          }
        }
        if (t === 'BreadcrumbList') {
          (node.itemListElement || []).forEach((li, i, arr) => {
            if (li.position !== i + 1) issues.push(['error', `BreadcrumbList position ${li.position} at index ${i}`]);
            if (!li.name) issues.push(['error', 'BreadcrumbList item without name']);
            if (i < arr.length - 1 && !li.item) issues.push(['error', `BreadcrumbList item "${li.name}" has no URL`]);
          });
        }
        if (t === 'FAQPage') {
          for (const q of [].concat(node.mainEntity || [])) if (!q.name || !q.acceptedAnswer?.text) issues.push(['error', 'FAQPage question without name/answer']);
        }
      }
      for (const key of ['url', '@id', 'image']) {
        const v = node[key];
        if (typeof v === 'string' && !/^https?:\/\//.test(v)) issues.push(['error', `${ts.join('/')} ${key} is not an absolute URL: ${v}`]);
      }
    }
  }
  // The same entity described in full more than once (e.g. two Person blocks for Chef Peter)
  const seen = new Map();
  for (const text of texts) {
    let data; try { data = JSON.parse(text); } catch { continue; }
    for (const node of collectNodes(data)) {
      // A reference (@id plus name/url, as Google asks for on author/publisher) is not a definition
      const keys = Object.keys(node).filter((k) => !['@type', '@id', 'name', 'url'].includes(k));
      if (keys.length < 1) continue;
      const t = [].concat(node['@type']).join('/');
      if (!['Person', 'Organization', 'Book', 'Service', 'WebSite'].includes(t)) continue;
      const key = `${t}:${node['@id'] || node.name}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
  }
  for (const [key, n] of seen) if (n > 1) issues.push(['warning', `${key} is described ${n} times (duplicate structured data)`]);
  const counts = types.reduce((m, t) => ((m[t] = (m[t] || 0) + 1), m), {});
  return counts;
}

// ── Audit ───────────────────────────────────────────────────────────────────
(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mock = createMock(SEED, { png: PNG, knowledgeSchema: true, authorProfiles: false });
  await context.route(`${SB}/**`, mock.handler);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const report = [];
  const links = new Map(); // href -> first page that links to it

  for (const spec of PAGES) {
    const issues = [];
    // Raw HTML (what non-rendering crawlers and link previews receive)
    const raw = await (await fetch(base + spec.path)).text();
    const rawTitle = (/<title[^>]*>([^<]*)<\/title>/i.exec(raw) || [])[1] || '';
    const rawH1 = (raw.match(/<h1[\s>]/gi) || []).length;
    const rawCanon = (raw.match(/rel="canonical"/g) || []).length;
    if (spec.prerendered) {
      if (rawH1 !== 1) issues.push(['error', `raw HTML has ${rawH1} <h1> (content not prerendered)`]);
      if (rawCanon !== 1) issues.push(['error', `raw HTML has ${rawCanon} canonical links`]);
    }

    await page.goto(base + spec.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const d = await page.evaluate(() => {
      const meta = (sel) => [...document.querySelectorAll(sel)].map((m) => m.getAttribute('content') ?? m.getAttribute('href'));
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent !== null || h.closest('details')).map((h) => Number(h.tagName[1]));
      return {
        titles: [...document.querySelectorAll('title')].map((t) => t.textContent),
        documentTitle: document.title,
        descriptions: meta('meta[name="description"]'),
        canonicals: meta('link[rel="canonical"]'),
        robots: meta('meta[name="robots"]'),
        og: Object.fromEntries(['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map((p) => [p, meta(`meta[property="${p}"]`)])),
        twitter: meta('meta[name="twitter:card"]'),
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        headings,
        imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
        notFound: /not found/i.test(document.querySelector('h1')?.textContent || ''),
      };
    });

    if (d.notFound) issues.push(['error', 'page shows a "not found" state']);
    if (d.titles.length !== 1) issues.push(['error', `${d.titles.length} <title> elements`]);
    const title = d.documentTitle;
    if (spec.prerendered) {
      const decoded = rawTitle.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
      if (decoded !== title.trim()) issues.push(['error', `raw HTML title "${decoded}" differs from the page title "${title.trim()}" (crawlers read the raw one)`]);
    }
    if (title.length < 15 || title.length > 70) issues.push(['warning', `title length ${title.length}: "${title}"`]);
    if (d.descriptions.length !== 1) issues.push(['error', `${d.descriptions.length} meta descriptions`]);
    const desc = d.descriptions[0] || '';
    if (desc.length < 70 || desc.length > 165) issues.push(['warning', `description length ${desc.length}`]);
    if (d.canonicals.length !== 1) issues.push(['error', `${d.canonicals.length} canonical links`]);
    else if (!d.canonicals[0].startsWith(SITE)) issues.push(['error', `canonical not absolute on ${SITE}: ${d.canonicals[0]}`]);
    else if (!spec.noindex && new URL(d.canonicals[0]).pathname !== spec.path) issues.push(['error', `canonical points elsewhere: ${d.canonicals[0]}`]);
    const noindexed = d.robots.some((r) => /noindex/.test(r));
    if (spec.noindex && !noindexed) issues.push(['error', 'expected noindex']);
    if (!spec.noindex && noindexed) issues.push(['error', 'page is noindex but should be indexable']);
    for (const [k, v] of Object.entries(d.og)) if (v.length !== 1) issues.push([k === 'og:type' ? 'warning' : 'error', `${v.length} ${k} tags`]);
    if (d.twitter.length !== 1) issues.push(['warning', `${d.twitter.length} twitter:card tags`]);
    if (d.h1.length !== 1) issues.push(['error', `${d.h1.length} <h1> elements`]);
    for (let i = 1; i < d.headings.length; i++) {
      if (d.headings[i] > d.headings[i - 1] + 1) { issues.push(['warning', `heading level jumps from h${d.headings[i - 1]} to h${d.headings[i]}`]); break; }
    }
    if (d.imgsNoAlt.length) issues.push(['error', `${d.imgsNoAlt.length} <img> without alt`]);
    const ldTypes = checkJsonLd(d.jsonld, issues);
    if (ldTypes.Book && !['/', '/culinary-books'].includes(spec.path)) issues.push(['warning', 'Book structured data on a page that is not about the books']);
    for (const href of d.links) {
      if (!href || /^(mailto:|tel:|https?:\/\/(?!www\.chefpetertheteacher\.com))/.test(href) || href.startsWith('?')) continue;
      const key = href.replace(SITE, '');
      if (!links.has(key)) links.set(key, spec.path);
    }
    report.push({ path: spec.path, title, description: desc, ldTypes, rawTitle, issues, noindexed });
  }

  // Uniqueness across indexable pages
  const indexable = report.filter((r) => !r.noindexed);
  for (const field of ['title', 'description']) {
    const seen = new Map();
    for (const r of indexable) {
      if (seen.has(r[field])) r.issues.push(['error', `duplicate ${field} with ${seen.get(r[field])}`]);
      else seen.set(r[field], r.path);
    }
  }

  // Internal links
  const linkIssues = [];
  for (const [href, from] of links) {
    if (href.startsWith('/admin')) continue;
    const url = new URL(href, base + from);
    const target = url.pathname + url.search;
    if (url.origin !== base) continue;
    const res = await fetch(base + url.pathname);
    if (res.status >= 400) { linkIssues.push(`${href} (from ${from}) → HTTP ${res.status}`); continue; }
    if (/\.(jpg|jpeg|jfif|png|webp|ico|xml|txt)$/i.test(url.pathname)) continue;
    await page.goto(base + target, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const h1 = (await page.locator('h1').first().textContent().catch(() => '')) || '';
    if (/not found/i.test(h1)) linkIssues.push(`${href} (from ${from}) → "${h1.trim()}"`);
    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (id && !(await page.locator(`[id="${id}"]`).count())) linkIssues.push(`${href} (from ${from}) → anchor #${id} missing`);
    }
  }

  await browser.close();
  server.close();

  // Output
  let errors = 0; let warnings = 0;
  for (const r of report) {
    const e = r.issues.filter((i) => i[0] === 'error').length;
    const w = r.issues.length - e;
    errors += e; warnings += w;
    console.log(`\n${e ? '✗' : '✓'} ${r.path}  ${r.noindexed ? '[noindex]' : ''}`);
    console.log(`   title (${r.title.length}): ${r.title}`);
    console.log(`   description (${r.description.length}): ${r.description.slice(0, 110)}${r.description.length > 110 ? '…' : ''}`);
    console.log(`   structured data: ${Object.entries(r.ldTypes).map(([t, n]) => `${t}×${n}`).join(', ') || 'none'}`);
    for (const [lvl, msg] of r.issues) console.log(`   ${lvl === 'error' ? 'ERROR' : 'warn '} ${msg}`);
  }
  console.log(`\nInternal links checked: ${links.size}`);
  for (const l of linkIssues) console.log(`   ERROR broken link ${l}`);
  errors += linkIssues.length;
  if (pageErrors.length) { console.log(`\nPage errors: ${pageErrors.length}`); pageErrors.slice(0, 5).forEach((m) => console.log('   ' + m.slice(0, 160))); }
  console.log(`\n${errors} errors, ${warnings} warnings`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ report, linkIssues, errors, warnings }, null, 2));
  process.exit(errors ? 1 : 0);
})();
