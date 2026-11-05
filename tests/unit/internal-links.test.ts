import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINKS, LANDING_RELATED, landingRelatedLinks, articleLearningLinks } from '../../src/data/internalLinks';
import { SEO_PAGES } from '../../src/data/seoPages';
import { PUBLISHED_BOOKS } from '../../src/data/booksData';
import { demoteBodyH1, enhanceArticleHtml, headingId } from '../../src/lib/knowledge/articleHtml';
import { bookNodes } from '../../src/lib/seo/schema';

const landingPaths = new Set(SEO_PAGES.map((p) => p.path));
const booksPage = SEO_PAGES.find((p) => p.path === '/culinary-books')!;
const bookSectionIds = new Set(booksPage.sections.map((s) => headingId(s.title)));

test('every internal link points to a page or anchor that always exists', () => {
  for (const link of Object.values(LINKS)) {
    const [path, hash] = link.href.split('#');
    if (path === '/' || path === '') assert.equal(hash, 'contact');
    else if (path === '/articles') assert.equal(hash, undefined);
    else assert.ok(landingPaths.has(path), `${link.href} is not a landing page`);
    if (path === '/culinary-books' && hash) assert.ok(bookSectionIds.has(hash), `missing section #${hash}`);
  }
});

test('book anchors match the Book structured data URLs', () => {
  for (const node of bookNodes() as Array<{ url: string }>) {
    const hash = node.url.split('#')[1];
    assert.ok(bookSectionIds.has(hash), `Book URL ${node.url} has no matching section`);
  }
  assert.equal(PUBLISHED_BOOKS.every((b) => bookSectionIds.has(b.id)), true);
});

test('every landing page has related links and never links to itself', () => {
  for (const page of SEO_PAGES) {
    assert.ok(LANDING_RELATED[page.path], `no related links for ${page.path}`);
    const links = landingRelatedLinks(page.path);
    assert.ok(links.length >= 3);
    assert.ok(links.every((l) => l.href !== page.path));
  }
});

test('article learning links follow the categories and end with About', () => {
  const bakery = articleLearningLinks(['pastry-and-bakery']);
  assert.deepEqual(bakery.map((l) => l.href), ['/baking-pastry-classes', '/culinary-books#secrets-of-a-successful-baker', '/about-chef-peter']);
  const none = articleLearningLinks([]);
  assert.equal(none.at(-1)!.href, '/about-chef-peter');
  const dup = articleLearningLinks(['pastry-and-bakery', 'pastry-and-bakery', 'professional-cooking-techniques']);
  assert.equal(new Set(dup.map((l) => l.href)).size, dup.length);
  assert.ok(dup.length <= 3);
});

test('a body <h1> becomes an <h2> and appears in the table of contents', () => {
  assert.equal(demoteBodyH1('<h1 class="x">Title</h1><p>a</p>'), '<h2 class="x">Title</h2><p>a</p>');
  const { html, toc } = enhanceArticleHtml('<h1>Mise en place</h1><p>Text</p>');
  assert.ok(!/<h1/i.test(html));
  assert.deepEqual(toc.map((t) => t.id), ['mise-en-place']);
});
