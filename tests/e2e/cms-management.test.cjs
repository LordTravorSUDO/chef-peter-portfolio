/**
 * CMS management end-to-end tests (Phase 4).
 *
 * Dashboard, article management (search, filters, pagination, actions),
 * editor workflow (status banner, confirmation before publishing, preview of
 * unsaved changes, structured sections, callouts, inline tags, featured image
 * details, author change), categories (safe deletion with reassignment),
 * tags, media search, author profile (before and after the proposed table)
 * and the public article page reusing the saved author profile.
 *
 * All Supabase traffic is answered by an in-memory mock
 * (tests/e2e/lib/postgrest-mock.cjs) — no real project is contacted.
 *
 * How to run (same build as cms-editor.test.cjs):
 *   VITE_SUPABASE_URL=https://testref.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key \
 *     npx vite build --outDir node_modules/.cache/e2e-dist --emptyOutDir
 *   node tests/e2e/cms-management.test.cjs node_modules/.cache/e2e-dist [name-filter]
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createMock } = require('./lib/postgrest-mock.cjs');

const DIST = path.resolve(process.argv[2] || 'node_modules/.cache/e2e-dist');
const FILTER = process.argv[3] || '';
const SB = 'https://testref.supabase.co';
const STORAGE_KEY = 'sb-testref-auth-token';
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function startServer() {
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-11-01T00:00:00Z' };
function makeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now })}.sig`,
    refresh_token: 'refresh-' + Math.random().toString(36).slice(2), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: USER,
  };
}

// ── seed data ───────────────────────────────────────────────────────────────
const ADMIN2 = '22222222-0000-4000-8000-000000000002';
const C_PASTRY = 'cccccccc-0000-4000-8000-000000000001';
const C_SAFETY = 'cccccccc-0000-4000-8000-000000000002';
const C_EMPTY = 'cccccccc-0000-4000-8000-000000000003';
const T_LAM = 'dddddddd-0000-4000-8000-000000000001';
const T_RICE = 'dddddddd-0000-4000-8000-000000000002';
const M_CROISSANT = 'eeeeeeee-0000-4000-8000-000000000001';
const M_NOALT = 'eeeeeeee-0000-4000-8000-000000000002';
const M_PORTRAIT = 'eeeeeeee-0000-4000-8000-000000000003';
const A_PUB1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const A_PUB2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const A_PUB_NOIMG = 'aaaaaaaa-0000-4000-8000-000000000003';
const A_DRAFT = 'aaaaaaaa-0000-4000-8000-000000000004';
const A_SCHED = 'aaaaaaaa-0000-4000-8000-000000000005';
const A_ARCH = 'aaaaaaaa-0000-4000-8000-000000000006';

function article(id, over = {}) {
  return {
    id, slug: over.slug || 'article-' + id.slice(-2), title: 'Article ' + id.slice(-2), excerpt: 'An introduction.', body: '<p>Body text.</p>',
    reading_time_minutes: 1, author_id: USER.id, author_display_name: 'Chef Peter the Teacher', featured_image_id: M_CROISSANT, social_image_id: null,
    status: 'draft', published_at: null, scheduled_for: null, seo_title: null, meta_description: null, canonical_url: null, noindex: false, view_count: 0,
    article_type: 'educational', is_featured: false, is_editors_pick: false, recipe: null,
    created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', ...over,
  };
}

function seed() {
  const fillers = Array.from({ length: 20 }, (_, i) => article(`ffffffff-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, {
    title: `Filler draft ${i + 1}`, slug: `filler-draft-${i + 1}`, updated_at: `2026-09-${String(i + 1).padStart(2, '0')}T08:00:00Z`,
  }));
  return {
    profiles: [
      { id: USER.id, display_name: 'Chef Peter', avatar_url: null, role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: ADMIN2, display_name: 'Sarah Editor', avatar_url: null, role: 'admin', is_active: true, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
    ],
    categories: [
      { id: C_PASTRY, slug: 'pastry-and-bakery', name: 'Pastry and Bakery', description: 'Breads and pastry.', image_id: null, sort_order: 1, is_active: true },
      { id: C_SAFETY, slug: 'food-safety-and-hygiene', name: 'Food Safety and Hygiene', description: 'Safe kitchens.', image_id: null, sort_order: 2, is_active: true },
      { id: C_EMPTY, slug: 'empty-category', name: 'Empty Category', description: null, image_id: null, sort_order: 3, is_active: true },
    ],
    tags: [
      { id: T_LAM, slug: 'lamination', name: 'Lamination', created_at: '2026-01-01T00:00:00Z' },
      { id: T_RICE, slug: 'rice', name: 'Rice', created_at: '2026-01-01T00:00:00Z' },
    ],
    media: [
      { id: M_CROISSANT, storage_path: 'uploads/croissant.png', original_filename: 'croissant.png', mime_type: 'image/png', file_size_bytes: 2048, width_px: 1200, height_px: 800, alt_text: 'Golden croissants', caption: 'Croissants from class', credit: 'Chef Peter', uploaded_by: USER.id, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' },
      { id: M_NOALT, storage_path: 'uploads/rice.png', original_filename: 'rice.png', mime_type: 'image/png', file_size_bytes: 1024, width_px: 800, height_px: 600, alt_text: null, caption: null, credit: null, uploaded_by: USER.id, created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-02T00:00:00Z' },
      { id: M_PORTRAIT, storage_path: 'uploads/portrait.png', original_filename: 'portrait.png', mime_type: 'image/png', file_size_bytes: 1024, width_px: 800, height_px: 800, alt_text: 'Chef Peter smiling', caption: null, credit: null, uploaded_by: USER.id, created_at: '2026-10-03T00:00:00Z', updated_at: '2026-10-03T00:00:00Z' },
    ],
    articles: [
      article(A_PUB1, { title: 'How to laminate dough', slug: 'how-to-laminate-dough', status: 'published', published_at: '2026-10-20T08:00:00Z', updated_at: '2026-10-21T08:00:00Z', is_featured: true }),
      article(A_PUB2, { title: 'Cooling rice safely', slug: 'cooling-rice-safely', status: 'published', published_at: '2026-10-10T08:00:00Z', updated_at: '2026-10-11T08:00:00Z' }),
      article(A_PUB_NOIMG, { title: 'Knife skills basics', slug: 'knife-skills-basics', status: 'published', published_at: '2026-10-05T08:00:00Z', featured_image_id: null, updated_at: '2026-10-06T08:00:00Z' }),
      article(A_DRAFT, { title: 'Sourdough starter guide', slug: 'sourdough-starter-guide', updated_at: '2026-10-25T08:00:00Z' }),
      article(A_SCHED, { title: 'Wedding cake planning', slug: 'wedding-cake-planning', status: 'scheduled', scheduled_for: '2027-01-15T06:00:00Z', updated_at: '2026-10-24T08:00:00Z' }),
      article(A_ARCH, { title: 'Old menu notes', slug: 'old-menu-notes', status: 'archived', updated_at: '2026-08-01T08:00:00Z' }),
      ...fillers,
    ],
    article_categories: [
      { article_id: A_PUB1, category_id: C_PASTRY, is_primary: true },
      { article_id: A_PUB2, category_id: C_SAFETY, is_primary: true },
      { article_id: A_DRAFT, category_id: C_PASTRY, is_primary: true },
      { article_id: A_SCHED, category_id: C_PASTRY, is_primary: true },
    ],
    article_tags: [
      { article_id: A_PUB1, tag_id: T_LAM },
      { article_id: A_PUB2, tag_id: T_RICE },
    ],
  };
}

// ── harness ─────────────────────────────────────────────────────────────────
async function withPage(browser, base, opts, fn) {
  const context = await browser.newContext({ timezoneId: 'Africa/Kampala' });
  const mock = createMock(seed(), { user: USER, makeSession, png: PNG_1PX, ...opts });
  await context.route(`${SB}/**`, mock.handler);
  if (opts.signedIn !== false) {
    await context.addInitScript(([k, v]) => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, [STORAGE_KEY, JSON.stringify(makeSession())]);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try { await fn(page, mock, errors, context); } finally { await context.close(); }
}
function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + msg); }
async function waitFor(pred, ms, label) {
  const start = Date.now();
  while (Date.now() - start < ms) { if (await pred()) return; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`Timed out after ${ms} ms waiting for: ${label}`);
}
const writes = (mock, method, table) => mock.log.filter((e) => e.method === method && e.path === `/rest/v1/${table}`);
const openEditor = async (page, base, id) => {
  await page.goto(`${base}/admin/articles/${id}/edit`);
  await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
};

const TESTS = {
  async 'dashboard: counts, recent activity, scheduled, categories and needs-attention'(browser, base) {
    await withPage(browser, base, {}, async (page) => {
      await page.goto(`${base}/admin`);
      await page.getByRole('heading', { name: 'Recently published' }).waitFor({ timeout: 15000 });
      const card = async (label) => (await page.getByText(label, { exact: true }).locator('xpath=preceding-sibling::p').first().textContent()).trim();
      assert(await card('Total articles') === '26', 'total 26');
      assert(await card('Published') === '3', 'published 3');
      assert(await card('Drafts') === '21', 'drafts 21');
      assert(await card('Scheduled') === '1', 'scheduled 1');
      const published = page.locator('section[aria-labelledby="panel-recently-published"] li');
      assert(await published.first().textContent().then((t) => t.includes('How to laminate dough')), 'most recent published first');
      assert(await page.locator('section[aria-labelledby="panel-scheduled-to-go-live"]').getByText('Wedding cake planning').count() === 1, 'scheduled article listed');
      assert(await page.locator('section[aria-labelledby="panel-scheduled-to-go-live"]').getByText('(Kampala)').count() === 1, 'scheduled time in Kampala time');
      const attention = page.locator('section[aria-labelledby="panel-needs-attention"]');
      assert(await attention.getByText('Knife skills basics').count() === 1, 'published article without category flagged');
      const pastryRow = page.locator('section[aria-labelledby="panel-categories"] tr', { hasText: 'Pastry and Bakery' });
      assert((await pastryRow.locator('td').nth(1).textContent()).trim() === '1' && (await pastryRow.locator('td').nth(2).textContent()).trim() === '3', 'category overview: 1 published of 3');
      assert(await page.getByText('1 published article has no category').count() === 1, 'uncategorised warning');
    });
  },

  async 'articles: search, status, category and date filters, pagination, featured badge'(browser, base) {
    await withPage(browser, base, {}, async (page) => {
      await page.goto(`${base}/admin/articles`);
      await page.getByText('26 articles in total').waitFor({ timeout: 15000 });
      assert(await page.locator('tbody tr').count() === 20, 'first page shows 20');
      assert(await page.getByText('Page 1 of 2').count() === 1, 'two pages');
      await page.getByRole('button', { name: 'Next →' }).click();
      await page.getByText('Page 2 of 2').waitFor();
      assert(await page.locator('tbody tr').count() === 6, 'second page shows 6');

      await page.goto(`${base}/admin/articles`);
      await page.getByLabel('Search articles by title or URL').fill('laminate dough');
      await page.getByLabel('Search articles by title or URL').press('Enter');
      await page.getByText('1 article match').waitFor();
      assert(await page.locator('tbody tr', { hasText: 'How to laminate dough' }).getByText('Featured').count() === 1, 'featured indicator');

      await page.goto(`${base}/admin/articles?status=published`);
      await page.getByText('3 articles match').waitFor();
      await page.getByRole('button', { name: 'Filters' }).click().catch(() => {});
      await page.getByLabel('Category').selectOption(C_PASTRY);
      await page.getByText('1 article match').waitFor();
      assert(/category=/.test(page.url()), 'filters are in the URL');

      await page.goto(`${base}/admin/articles?status=published&date=published_at&from=2026-10-08&to=2026-10-15`);
      await page.getByText('1 article match').waitFor();
      assert(await page.locator('tbody tr', { hasText: 'Cooling rice safely' }).count() === 1, 'date range on publication date');
    });
  },

  async 'articles: archive, restore and delete require confirmation'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await page.goto(`${base}/admin/articles?q=sourdough`);
      await page.getByText('1 article match').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Archive Sourdough starter guide' }).click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      assert(writes(mock, 'PATCH', 'articles').length === 0, 'cancel does nothing');
      await page.getByRole('button', { name: 'Archive Sourdough starter guide' }).click();
      await page.getByRole('button', { name: 'Archive', exact: true }).click();
      await waitFor(() => mock.db.articles.find((a) => a.id === A_DRAFT).status === 'archived', 5000, 'archived');
      await page.getByRole('button', { name: 'Restore Sourdough starter guide as draft' }).waitFor();
      await page.getByRole('button', { name: 'Restore Sourdough starter guide as draft' }).click();
      await page.getByRole('button', { name: 'Restore as draft' }).click();
      await waitFor(() => mock.db.articles.find((a) => a.id === A_DRAFT).status === 'draft', 5000, 'restored to draft');
      assert(await page.getByRole('button', { name: 'Delete How to laminate dough' }).count() === 0, 'published articles cannot be deleted from the list');
      await page.getByRole('button', { name: 'Delete Sourdough starter guide' }).click();
      await page.getByText('This cannot be undone').waitFor();
      await page.getByRole('button', { name: 'Delete permanently' }).click();
      await waitFor(() => !mock.db.articles.some((a) => a.id === A_DRAFT), 5000, 'deleted');
    });
  },

  async 'editor: status banner explains visibility; live articles say "Update published article"'(browser, base) {
    await withPage(browser, base, {}, async (page) => {
      await openEditor(page, base, A_PUB1);
      const banner = page.getByTestId('status-banner');
      assert((await banner.textContent()).includes('Live on the website'), 'published banner');
      assert(await page.getByRole('button', { name: 'Update published article' }).count() === 1, 'update label for live article');
      await openEditor(page, base, A_DRAFT);
      assert((await page.getByTestId('status-banner').textContent()).includes('not visible on the website'), 'draft banner');
      await openEditor(page, base, A_SCHED);
      const sched = await page.getByTestId('status-banner').textContent();
      assert(/goes live on .*15 January 2027.*09:00/.test(sched), `scheduled banner in Kampala time (got "${sched}")`);
    });
  },

  async 'editor: publishing needs confirmation; cancelling leaves the draft unpublished'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await openEditor(page, base, A_DRAFT);
      await page.getByRole('button', { name: 'Publish now' }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(500);
      assert(mock.db.articles.find((a) => a.id === A_DRAFT).status === 'draft', 'still a draft after cancel');
      await page.getByRole('button', { name: 'Publish now' }).click();
      await page.getByRole('dialog').getByRole('button', { name: /Publish/ }).click();
      await waitFor(() => mock.db.articles.find((a) => a.id === A_DRAFT).status === 'published', 8000, 'published after confirming');
    });
  },

  async 'editor: preview shows unsaved changes and the author biography'(browser, base) {
    await withPage(browser, base, {}, async (page, mock, errors, context) => {
      await openEditor(page, base, A_DRAFT);
      await page.getByPlaceholder('Enter article title…').fill('Sourdough starter — preview me');
      const [preview] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Preview' }).click()]);
      await preview.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
      assert((await preview.getByRole('heading', { level: 1 }).textContent()) === 'Sourdough starter — preview me', 'preview shows the edited title');
      assert((await preview.getByTestId('preview-source').textContent()).includes('unsaved'), 'preview says it includes unsaved changes');
      await preview.getByLabel('About the author').waitFor();
      assert((await preview.getByLabel('About the author').textContent()).includes('De’Chosen Events Consultants'), 'approved author biography in preview');
    });
  },

  async 'editor: recipe steps and extra sections can be added, reordered and saved'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await openEditor(page, base, A_DRAFT);
      await page.getByLabel('Article format').selectOption('recipe');
      await page.getByRole('button', { name: 'Add method step' }).click();
      await page.getByLabel('Method step 1', { exact: true }).fill('Second in the end');
      await page.getByRole('button', { name: 'Add method step' }).click();
      await page.getByLabel('Method step 2', { exact: true }).fill('First in the end');
      await page.getByRole('button', { name: 'Move method step 2 up' }).click();
      await page.getByRole('button', { name: 'Add section' }).click();
      await page.getByLabel('Section 1 title').fill('Troubleshooting');
      await page.getByLabel('Section 1 text').fill('- Too dense: proof longer');
      await page.getByRole('button', { name: 'Add section' }).click();
      await page.getByLabel('Section 2 title').fill('Key terms');
      await page.getByLabel('Section 2 text').fill('Levain: a pre-ferment.');
      await page.getByRole('button', { name: 'Move section 2 up' }).click();
      await waitFor(() => {
        const r = mock.db.articles.find((a) => a.id === A_DRAFT).recipe;
        return r && r.method?.join('|') === 'First in the end|Second in the end' && r.sections?.map((x) => x.title).join('|') === 'Key terms|Troubleshooting';
      }, 12000, 'autosave with reordered steps and sections');
    });
  },

  async 'editor: highlighted box, inline tag creation, featured image details, author change'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await openEditor(page, base, A_DRAFT);
      await page.locator('.ProseMirror').click();
      await page.getByLabel('Insert a highlighted box').selectOption('Chef’s tip');
      await page.keyboard.type('Keep the starter warm.');
      await page.getByLabel('New tag name').fill('Fermentation');
      await page.getByLabel('New tag name').press('Enter');
      await waitFor(() => mock.db.tags.some((t) => t.name === 'Fermentation' && t.slug === 'fermentation'), 5000, 'tag created');
      assert(await page.getByRole('button', { name: 'Fermentation', pressed: true }).count() === 1, 'new tag selected');
      await page.getByLabel('Caption (shown under the image)').fill('Starter after 12 hours');
      await page.getByLabel('Caption (shown under the image)').blur();
      await waitFor(() => mock.db.media.find((m) => m.id === M_CROISSANT).caption === 'Starter after 12 hours', 5000, 'caption saved to media library');
      await page.getByRole('button', { name: 'Change author' }).click();
      await page.getByLabel('Author of this article').selectOption(ADMIN2);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await waitFor(() => {
        const a = mock.db.articles.find((x) => x.id === A_DRAFT);
        const tagIds = mock.db.article_tags.filter((l) => l.article_id === A_DRAFT).map((l) => l.tag_id);
        const newTag = mock.db.tags.find((t) => t.name === 'Fermentation');
        return a.author_id === ADMIN2 && a.author_display_name === 'Sarah Editor' && /<blockquote><p><strong>Chef’s tip:<\/strong> Keep the starter warm\.<\/p><\/blockquote>/.test(a.body) && tagIds.includes(newTag?.id);
      }, 10000, 'author, callout and tag saved');
    });
  },

  async 'categories: empty category deletes after confirmation; category with articles must move them first'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await page.goto(`${base}/admin/categories`);
      await page.getByRole('button', { name: 'Delete Empty Category' }).waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Delete Empty Category' }).click();
      await page.getByText('It contains no articles').waitFor();
      await page.getByRole('button', { name: 'Delete category' }).click();
      await waitFor(() => !mock.db.categories.some((c) => c.id === C_EMPTY), 5000, 'empty category deleted');

      await page.getByRole('button', { name: 'Delete Pastry and Bakery' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByText('contains 3 articles').waitFor();
      assert(await dialog.getByRole('button', { name: 'Move articles and delete' }).isDisabled(), 'cannot delete before choosing a destination');
      await dialog.getByLabel('Move the articles to').selectOption(C_SAFETY);
      await dialog.getByRole('button', { name: 'Move articles and delete' }).click();
      await waitFor(() => !mock.db.categories.some((c) => c.id === C_PASTRY), 8000, 'category deleted after moving');
      const moved = mock.db.article_categories.filter((l) => [A_PUB1, A_DRAFT, A_SCHED].includes(l.article_id));
      assert(moved.length === 3 && moved.every((l) => l.category_id === C_SAFETY && l.is_primary), 'all three articles moved and stay primary');
      assert(mock.db.articles.length === 26, 'no article deleted');
    });
  },

  async 'tags: rename and delete with usage count'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await page.goto(`${base}/admin/tags`);
      await page.getByRole('button', { name: 'Edit Lamination' }).waitFor({ timeout: 15000 });
      assert(await page.locator('li', { hasText: 'Lamination' }).getByText('1 article').count() === 1, 'usage count shown');
      await page.getByRole('button', { name: 'Edit Lamination' }).click();
      await page.getByLabel('Name').fill('Laminated doughs');
      await page.getByLabel('URL slug').fill('laminated-doughs');
      await page.getByRole('button', { name: 'Save' }).click();
      await waitFor(() => mock.db.tags.find((t) => t.id === T_LAM).name === 'Laminated doughs', 5000, 'tag renamed');
      await page.getByRole('button', { name: 'Delete Rice' }).click();
      await page.getByText('It will be removed from 1 article').waitFor();
      await page.getByRole('button', { name: 'Delete tag' }).click();
      await waitFor(() => !mock.db.tags.some((t) => t.id === T_RICE), 5000, 'tag deleted');
      assert(mock.db.articles.some((a) => a.id === A_PUB2), 'article kept');
    });
  },

  async 'media: search covers alt text and captions; filter for missing alt text'(browser, base) {
    await withPage(browser, base, {}, async (page, mock) => {
      await page.goto(`${base}/admin/media`);
      await page.getByLabel('Search media by file name, alt text or caption').waitFor({ timeout: 15000 });
      await page.getByLabel('Search media by file name, alt text or caption').fill('smiling');
      await waitFor(async () => (await page.locator('img[alt="Chef Peter smiling"]').count()) >= 1 && (await page.locator('img[alt="Golden croissants"]').count()) === 0, 8000, 'alt text search result');
      await page.getByLabel('Search media by file name, alt text or caption').fill('');
      await page.getByRole('button', { name: 'Filters' }).click();
      await page.getByLabel('Only images missing alt text').check();
      await waitFor(async () => (await page.locator('img[alt="rice.png"]').count()) >= 1 && (await page.locator('img[alt="Golden croissants"]').count()) === 0, 8000, 'missing-alt filter');
    });
  },

  async 'author profile: approved profile shown before the table exists'(browser, base) {
    await withPage(browser, base, { authorProfiles: false }, async (page) => {
      await page.goto(`${base}/admin/author`);
      await page.getByText('becomes available after the author-profile database upgrade', { exact: false }).waitFor({ timeout: 15000 });
      assert(await page.getByLabel('About the author').getByText('De’Chosen Events Consultants', { exact: false }).count() === 1, 'approved biography shown');
    });
  },

  async 'author profile: saved once in the CMS and reused on public article pages'(browser, base) {
    await withPage(browser, base, { authorProfiles: true }, async (page, mock) => {
      await page.goto(`${base}/admin/author`);
      await page.getByLabel('Display name *').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Fill in the approved Chef Peter profile' }).click();
      await page.getByLabel('Short biography (under each article)').fill('Chef Peter teaches practical cooking in Kampala.');
      await page.getByRole('button', { name: 'Choose from media library' }).click();
      await page.locator('img[alt="Chef Peter smiling"]').first().click();
      await page.getByRole('button', { name: /Confirm|Use image|Insert/ }).last().click();
      await page.getByRole('button', { name: 'Save profile' }).click();
      await waitFor(() => mock.db.author_profiles.some((p) => p.profile_id === USER.id && p.short_bio === 'Chef Peter teaches practical cooking in Kampala.' && p.photo_media_id === M_PORTRAIT), 8000, 'profile upserted');

      await page.goto(`${base}/articles/how-to-laminate-dough`);
      const bio = page.getByLabel('About the author');
      await bio.getByText('Chef Peter teaches practical cooking in Kampala.').waitFor({ timeout: 15000 });
      assert(await bio.locator('img[src*="portrait.png"]').count() === 1, 'author photo from the media library');
    });
  },
};

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const results = [];
  for (const [name, fn] of Object.entries(TESTS)) {
    if (FILTER && !name.includes(FILTER)) continue;
    const t0 = Date.now();
    try { await fn(browser, base); results.push(true); console.log(`PASS  ${name}  (${Date.now() - t0} ms)`); }
    catch (e) { results.push(false); console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`); }
  }
  await browser.close();
  server.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
