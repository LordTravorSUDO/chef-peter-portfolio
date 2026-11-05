import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDITORIAL_CALENDAR, CATEGORY_NAMES, DRAFTED_SLUGS, suggestedDate, BREAK_WEEKS } from '../../src/data/editorial/calendar';
import { ARTICLE_DRAFTS } from '../../src/data/editorial/drafts';
import { LINKS } from '../../src/data/internalLinks';
import { SEO_PAGES } from '../../src/data/seoPages';
import { draftContent, outlineBody, resolveLink } from '../../src/lib/editorial/draftFromProposal';
import { findEditorialPlaceholders, assertNoEditorialPlaceholders } from '../../src/lib/editorial/placeholders';
import { enhanceArticleHtml, headingId } from '../../src/lib/knowledge/articleHtml';
import { runSeoChecks } from '../../src/lib/seo/quality';
import { isArticleType } from '../../src/lib/knowledge/articleTypes';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test('28 proposals: four per category, unique slugs and slots', () => {
  assert.equal(EDITORIAL_CALENDAR.length, 28);
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    assert.equal(EDITORIAL_CALENDAR.filter((p) => p.category === cat).length, 4, cat);
  }
  assert.equal(new Set(EDITORIAL_CALENDAR.map((p) => p.slug)).size, 28);
  assert.deepEqual([...EDITORIAL_CALENDAR.map((p) => p.slot)].sort((a, b) => a - b), Array.from({ length: 28 }, (_, i) => i + 1));
});

test('every two weeks (four slots) covers four different categories', () => {
  const bySlot = [...EDITORIAL_CALENDAR].sort((a, b) => a.slot - b.slot);
  for (let i = 0; i < 28; i += 4) {
    assert.equal(new Set(bySlot.slice(i, i + 4).map((p) => p.category)).size, 4, `slots ${i + 1}–${i + 4}`);
  }
});

test('each proposal has every required field', () => {
  for (const p of EDITORIAL_CALENDAR) {
    assert.match(p.slug, SLUG, p.slug);
    assert.ok(p.slug.length <= 70, p.slug);
    assert.ok(isArticleType(p.articleType), p.slug);
    assert.ok(p.title && p.audience && p.searchIntent && p.mainKeyword, p.slug);
    assert.ok(p.supportingKeywords.length >= 3, p.slug);
    assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.slug} description is ${p.description.length} characters`);
    assert.ok(p.headings.length >= 4, p.slug);
    assert.ok(p.photographs.length >= 2, p.slug);
    assert.ok(p.internalLinks.length >= 2, p.slug);
    assert.ok(Array.isArray(p.references) && Array.isArray(p.reviewNotes), p.slug);
  }
});

test('internal links resolve to real pages or planned articles', () => {
  const slugs = new Set(EDITORIAL_CALENDAR.map((p) => p.slug));
  const pages = new Set([...SEO_PAGES.map((p) => p.path), '/articles', '/']);
  for (const p of EDITORIAL_CALENDAR) {
    for (const ref of p.internalLinks) {
      if (ref.startsWith('article:')) {
        const target = ref.slice(8);
        assert.ok(slugs.has(target), `${p.slug} links to unknown article ${target}`);
        assert.notEqual(target, p.slug);
      } else {
        assert.ok(ref in LINKS, `${p.slug}: unknown link ${ref}`);
        assert.ok(pages.has(resolveLink(ref).href.split('#')[0]), ref);
      }
    }
  }
});

test('suggested dates: Tuesdays and Fridays, in order, skipping break weeks', () => {
  assert.equal(suggestedDate(1), '2026-11-17');
  assert.equal(suggestedDate(2), '2026-11-20');
  let prev = '';
  for (let s = 1; s <= 28; s++) {
    const d = suggestedDate(s);
    const day = new Date(`${d}T00:00:00Z`).getUTCDay();
    assert.ok(day === 2 || day === 5, `${d} is not a Tuesday or Friday`);
    assert.ok(d > prev);
    prev = d;
    for (const monday of BREAK_WEEKS) {
      const inBreak = d >= monday && d < new Date(Date.parse(`${monday}T00:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10);
      assert.ok(!inBreak, `${d} falls in a break week`);
    }
  }
});

test('the four full drafts are well-structured and cannot be published unreviewed', () => {
  assert.deepEqual([...DRAFTED_SLUGS].sort(), Object.keys(ARTICLE_DRAFTS).sort());
  const pages = new Set([...SEO_PAGES.map((p) => p.path), '/articles']);
  const bookIds = new Set(SEO_PAGES.find((p) => p.path === '/culinary-books')!.sections.map((s) => headingId(s.title)));
  for (const slug of DRAFTED_SLUGS) {
    const html = ARTICLE_DRAFTS[slug];
    assert.ok(!/<h1/i.test(html), `${slug} has an h1`);
    assert.ok(!/<table/i.test(html), `${slug} uses a table (the editor cannot keep tables)`);
    assert.ok((html.match(/<h2/g) ?? []).length >= 5, slug);
    assert.ok(/<h2>References<\/h2>/.test(html), `${slug} has no references`);
    // Drafts deliberately contain review notes, so they cannot be published as-is
    assert.ok(findEditorialPlaceholders(html).length > 0, slug);
    assert.throws(() => assertNoEditorialPlaceholders(html));
    // Every "Chef Peter’s tip" box is left for Chef Peter
    for (const m of html.matchAll(/Chef Peter’s tip:<\/strong>([^<]*)/g)) assert.match(m[1].trim(), /^\[CHEF PETER:/, slug);
    // No experiences, opinions or quotations attributed to Chef Peter
    assert.ok(!/Chef Peter (says|said|recalls|remembers|believes|learned|tested|developed)/i.test(html), slug);
    // Internal links point to pages that exist
    for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
      const [path, hash] = m[1].split('#');
      assert.ok(pages.has(path), `${slug}: ${m[1]}`);
      if (path === '/culinary-books' && hash) assert.ok(bookIds.has(hash), m[1]);
    }
  }
});

test('voice callouts render with their labels', () => {
  const { html } = enhanceArticleHtml(ARTICLE_DRAFTS['why-cakes-fail']);
  assert.match(html, /callout-mistake[^>]*><p class="callout-label">Common kitchen mistakes<\/p><ul>/);
  assert.match(html, /callout-lesson/);
  assert.match(html, /callout-pro[^>]*><p class="callout-label">What professional chefs should know/);
  assert.match(html, /callout-peter[^>]*><p class="callout-label">Chef Peter’s tip/);
  // The existing "Chef’s tip" label still works
  assert.match(enhanceArticleHtml('<blockquote><p>Chef’s tip: rest the dough.</p></blockquote>').html, /callout-tip/);
});

test('outline drafts contain every proposed heading and writing notes', () => {
  const p = EDITORIAL_CALENDAR.find((x) => !DRAFTED_SLUGS.includes(x.slug))!;
  const body = outlineBody(p);
  for (const h of p.headings) assert.ok(body.includes(`<h2>${h.replace(/&/g, '&amp;')}</h2>`), h);
  assert.ok(findEditorialPlaceholders(body).some((x) => x.kind === 'CHEF PETER'));
  const c = draftContent(p);
  assert.equal(c.isFullDraft, false);
  assert.equal(c.excerpt, p.description);
  assert.equal(draftContent(EDITORIAL_CALENDAR.find((x) => x.slug === DRAFTED_SLUGS[0])!).isFullDraft, true);
});

test('placeholders block publishing and appear as an editor error', () => {
  assert.deepEqual(findEditorialPlaceholders('<p>Fine text [not a note]</p>'), []);
  assert.doesNotThrow(() => assertNoEditorialPlaceholders('<p>Ready to publish.</p>'));
  assert.throws(() => assertNoEditorialPlaceholders('<p>[EDITOR: check this]</p>'), /editorial note/);
  const checks = runSeoChecks({ title: 'T', slug: 't', excerpt: '', body: '<p>[PHOTO: add one]</p>', hasFeaturedImage: false, noindex: false });
  assert.ok(checks.some((c) => c.id === 'editorial-placeholders' && c.severity === 'error'));
});

test('docs/editorial-calendar.md is in step with the calendar data', async () => {
  const fs = await import('node:fs');
  const doc = fs.readFileSync('docs/editorial-calendar.md', 'utf8');
  for (const p of EDITORIAL_CALENDAR) {
    assert.ok(doc.includes(`### ${p.slot}. ${p.title}`), `regenerate the calendar doc (npx tsx scripts/export-editorial-calendar.ts): ${p.title}`);
    assert.ok(doc.includes(p.description), `description changed for ${p.slug}`);
  }
});
