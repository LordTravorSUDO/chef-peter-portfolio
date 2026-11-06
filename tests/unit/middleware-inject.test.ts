/**
 * The Edge middleware must replace (not add to) the homepage's default SEO tags.
 * Run: npx tsx --test tests/unit/middleware-inject.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inject } from '../../middleware';

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const head = [
  '<title>Lamination | Chef Peter the Teacher</title>',
  '<meta name="description" content="How to laminate dough" />',
  '<link rel="canonical" href="https://www.chefpetertheteacher.com/articles/lamination" />',
  '<meta property="og:title" content="Lamination" />',
  '<script type="application/ld+json">{}</script>',
].join('\n    ');

test('defaults are removed and page tags are injected once', () => {
  const out = inject(indexHtml, head);
  assert.equal((out.match(/<title\b/g) ?? []).length, 1);
  assert.equal((out.match(/rel="canonical"/g) ?? []).length, 1);
  assert.equal((out.match(/name="description"/g) ?? []).length, 1);
  assert.equal((out.match(/property="og:title"/g) ?? []).length, 1);
  assert.match(out, /<title data-seo-injected>Lamination \| Chef Peter the Teacher<\/title>/);
  assert.match(out, /href="https:\/\/www\.chefpetertheteacher\.com\/articles\/lamination"/);
  assert.doesNotMatch(out, /data-default-seo/);
});

test('site-wide structured data and fonts are kept', () => {
  const out = inject(indexHtml, head);
  // The identity graph is injected at build time (vite.config.ts) — the placeholder must survive
  assert.match(out, /<!-- __SITE_JSONLD__ -->/);
  assert.match(out, /fonts\.googleapis\.com/);
  assert.match(out, /<script data-seo-injected type="application\/ld\+json">\{\}<\/script>/);
});

test('works when the placeholder is missing', () => {
  const out = inject('<html><head><title data-default-seo>Home</title></head><body></body></html>', '<title>X</title>');
  assert.equal(out, '<html><head>  <title data-seo-injected>X</title>\n</head><body></body></html>');
});

import { articleDocumentTitle as edgeTitle } from '../../middleware';
import { articleDocumentTitle as appTitle } from '../../src/lib/seo/schema';

test('article document titles: full suffix, short suffix, or none — same in Edge and app', () => {
  const cases = [
    ['Cooling rice safely', 'Cooling rice safely | Chef Peter the Teacher'],
    ['Laminating dough for croissants, step by step', 'Laminating dough for croissants, step by step | Chef Peter'],
    ['A very long article title that is already longer than sixty-five characters', 'A very long article title that is already longer than sixty-five characters'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(appTitle(input), expected);
    assert.equal(edgeTitle(input), expected);
  }
});

import { siteGraph } from '../../src/lib/seo/schema';

test('site-wide graph describes the website, Chef Peter and De’Chosen once, linked by @id', () => {
  const g = siteGraph() as { '@graph': Array<Record<string, unknown>> };
  const types = g['@graph'].map((n) => n['@type']);
  assert.deepEqual(types, ['WebSite', 'Person', 'Organization']);
  const person = g['@graph'][1];
  assert.equal(person['@id'], 'https://www.chefpetertheteacher.com/#chef-peter');
  assert.deepEqual(person.worksFor, { '@id': 'https://www.chefpetertheteacher.com/#dechosen' });
});

// ── Prerendered pages and server-side redirects ────────────────────────────
import middleware, { config, PRERENDERED_FILES, safeRedirectTarget } from '../../middleware';
import { SEO_PAGES } from '../../src/data/seoPages';

test('matcher and prerendered file map cover the homepage and every SEO landing page', () => {
  const expected = ['/', ...SEO_PAGES.map((p) => p.path)].sort();
  assert.deepEqual(Object.keys(PRERENDERED_FILES).sort(), expected);
  for (const p of expected) assert.ok(config.matcher.includes(p), `matcher includes ${p}`);
  assert.equal(PRERENDERED_FILES['/'], '/home.html');
});

test('safeRedirectTarget only allows same-site root-relative paths', () => {
  assert.equal(safeRedirectTarget('/articles/new-slug'), '/articles/new-slug');
  assert.equal(safeRedirectTarget('https://evil.example'), null);
  assert.equal(safeRedirectTarget('//evil.example'), null);
  assert.equal(safeRedirectTarget('/\\evil'), null);
  assert.equal(safeRedirectTarget('javascript:alert(1)'), null);
  assert.equal(safeRedirectTarget(''), null);
});

/** Runs the middleware with a stubbed fetch. */
async function runMiddleware(path: string, routes: (url: string) => Response | null) {
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    return routes(url) ?? new Response('passthrough', { status: 200 });
  }) as typeof fetch;
  process.env.SUPABASE_URL = 'https://sb.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  try {
    return { res: await middleware(new Request(`https://www.chefpetertheteacher.com${path}`)), calls };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test('prerendered pages are served with a Vercel rewrite (no extra request, no database call)', async () => {
  for (const [path, file] of Object.entries(PRERENDERED_FILES)) {
    const { res, calls } = await runMiddleware(path, () => null);
    assert.equal(res.headers.get('x-middleware-rewrite'), `https://www.chefpetertheteacher.com${file}`, path);
    assert.equal(calls.length, 0, `${path}: no fetch at all`);
  }
});

test('a moved article answers with a real 301 to its new address', async () => {
  const { res } = await runMiddleware('/articles/old-slug', (u) => {
    if (u.endsWith('/index.html')) return new Response('<html><head></head><body><div id="root"></div></body></html>');
    if (u.includes('/rest/v1/articles')) return Response.json([]);
    if (u.includes('/rest/v1/redirects')) {
      assert.ok(u.includes('from_path=eq.%2Farticles%2Fold-slug') && u.includes('is_active=eq.true'));
      return Response.json([{ to_path: '/articles/new-slug', status_code: 301 }]);
    }
    return null;
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://www.chefpetertheteacher.com/articles/new-slug');
});

test('unknown article without a redirect stays noindex (no redirect); unsafe targets are ignored', async () => {
  const notFound = await runMiddleware('/articles/missing', (u) => {
    if (u.endsWith('/index.html')) return new Response('<html><head></head><body></body></html>');
    if (u.includes('/rest/v1/')) return Response.json([]);
    return null;
  });
  assert.equal(notFound.res.status, 200);
  assert.equal(notFound.res.headers.get('x-robots-tag'), 'noindex, follow');

  const unsafe = await runMiddleware('/articles/missing', (u) => {
    if (u.endsWith('/index.html')) return new Response('<html><head></head><body></body></html>');
    if (u.includes('/rest/v1/redirects')) return Response.json([{ to_path: 'https://evil.example', status_code: 301 }]);
    if (u.includes('/rest/v1/')) return Response.json([]);
    return null;
  });
  assert.equal(unsafe.res.status, 200);
});
