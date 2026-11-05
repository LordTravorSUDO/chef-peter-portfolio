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
  assert.match(out, /"@type": "Person"/);
  assert.match(out, /fonts\.googleapis\.com/);
  assert.match(out, /<script data-seo-injected type="application\/ld\+json">\{\}<\/script>/);
});

test('works when the placeholder is missing', () => {
  const out = inject('<html><head><title data-default-seo>Home</title></head><body></body></html>', '<title>X</title>');
  assert.equal(out, '<html><head>  <title data-seo-injected>X</title>\n</head><body></body></html>');
});
