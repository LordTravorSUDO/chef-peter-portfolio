/**
 * CMS editor end-to-end regression tests.
 *
 * Covers: auth lifecycle (no deadlock after tab refocus / token refresh),
 * article create/save/publish, image preservation, autosave recovery and
 * serialisation, author byline handling, reading-time display, archive,
 * media uploads (session token, bucket, error reporting, picker selection) and
 * scheduling in Kampala time regardless of the browser's time zone.
 *
 * Runs the real application bundle in Chromium. ALL Supabase traffic is
 * intercepted and answered by an in-memory mock — no request ever reaches a
 * real Supabase project, and no credentials are needed.
 *
 * ── How to run ──────────────────────────────────────────────────────────────
 *   Requirements: Node 18+, the `playwright` package and its Chromium build.
 *   Playwright is intentionally NOT a project dependency (yet); install it
 *   locally without saving, e.g.:
 *       npm install --no-save playwright && npx playwright install chromium
 *
 *   1. Build the app against the fake Supabase URL used by the mock:
 *       VITE_SUPABASE_URL=https://testref.supabase.co \
 *       VITE_SUPABASE_ANON_KEY=test-anon-key \
 *       npx vite build --outDir node_modules/.cache/e2e-dist --emptyOutDir
 *   2. Run the tests (optionally pass a name filter as the 2nd argument):
 *       node tests/e2e/cms-editor.test.cjs node_modules/.cache/e2e-dist
 *
 *   Exit code 0 = all passed. The build output lives under node_modules/, so
 *   it is git-ignored and never deployed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.resolve(process.argv[2] || 'node_modules/.cache/e2e-dist');
const FILTER = process.argv[3] || '';
const SB = 'https://testref.supabase.co';
const STORAGE_KEY = 'sb-testref-auth-token';
const ANON_KEY = 'test-anon-key';
const BUCKET = 'article-media';
// 1×1 transparent PNG (valid magic bytes, so client-side content validation passes)
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// ── static server with SPA fallback ─────────────────────────────────────────
function startServer() {
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// ── session helpers ─────────────────────────────────────────────────────────
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const USER = {
  id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'admin@example.test', app_metadata: { provider: 'email' }, user_metadata: {},
  created_at: '2026-11-01T00:00:00Z',
};
function makeSession(expiresInSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', aud: 'authenticated', exp: now + expiresInSec, iat: now })}.sig`,
    refresh_token: 'refresh-' + Math.random().toString(36).slice(2),
    token_type: 'bearer', expires_in: expiresInSec, expires_at: now + expiresInSec, user: USER,
  };
}
const PROFILE = { id: USER.id, display_name: 'Chef Peter', avatar_url: null, role: 'admin', is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' };

const MEDIA = {
  'aaaaaaaa-0000-4000-8000-00000000000f': { id: 'aaaaaaaa-0000-4000-8000-00000000000f', storage_path: 'articles/featured.webp', alt_text: 'Featured alt', width_px: 800, height_px: 600 },
  'aaaaaaaa-0000-4000-8000-00000000000s': { id: 'aaaaaaaa-0000-4000-8000-00000000000s', storage_path: 'articles/social.webp', alt_text: 'Social alt' },
};
const FEATURED_ID = 'aaaaaaaa-0000-4000-8000-00000000000f';
const SOCIAL_ID = 'aaaaaaaa-0000-4000-8000-00000000000s';

function baseArticle(over = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222', slug: 'existing-article', title: 'Existing article',
    excerpt: 'Original excerpt', body: '<p>Original body</p>', reading_time_minutes: null,
    author_id: USER.id, author_display_name: 'Chef Peter', featured_image_id: FEATURED_ID,
    status: 'draft', published_at: null, scheduled_for: null, seo_title: null, meta_description: null,
    canonical_url: null, noindex: false, social_image_id: SOCIAL_ID, view_count: 0,
    created_at: '2026-11-02T10:00:00Z', updated_at: '2026-11-02T10:00:00Z', ...over,
  };
}

// ── mock Supabase backend ───────────────────────────────────────────────────
function createMock(opts = {}) {
  const state = {
    articles: new Map(), log: [], inFlightPatches: 0, maxInFlightPatches: 0,
    failPatches: opts.failPatches || 0, patchDelayMs: opts.patchDelayMs || 0,
    postError: opts.postError || null,
    media: [...(opts.media || [])],
    storageMode: opts.storageMode || 'ok',  // ok | rls | bucket | jwt-expired-once
    tokenFail: !!opts.tokenFail,
    issuedTokens: [],
    // true = database without the knowledge-platform migration (new columns missing)
    legacySchema: !!opts.legacySchema,
  };
  for (const a of opts.articles || []) state.articles.set(a.id, a);

  const withRelations = (a) => ({
    ...a,
    featured_image: a.featured_image_id ? MEDIA[a.featured_image_id] ?? null : null,
    social_image: a.social_image_id ? MEDIA[a.social_image_id] ?? null : null,
    article_categories: [], article_tags: [], profiles: null,
  });

  const cors = {
    'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
  };
  const json = (route, status, body, extra = {}) =>
    route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...extra }, body: body === undefined ? '' : JSON.stringify(body) });

  async function handler(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const p = url.pathname;
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const entry = { method, path: p, query: url.search, t: Date.now() };
    entry.headers = { authorization: req.headers()['authorization'], apikey: req.headers()['apikey'] };
    if (p.startsWith('/storage/v1/object/') && method === 'POST') {
      entry.bodySize = (req.postDataBuffer() || Buffer.alloc(0)).length;
    } else if (method !== 'GET' && method !== 'HEAD') { try { entry.body = JSON.parse(req.postData() || 'null'); } catch { entry.body = req.postData(); } }
    state.log.push(entry);
    const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const one = (rows) => (wantsObject ? rows[0] : rows);

    // Auth
    if (p === '/auth/v1/user') return json(route, 200, USER);
    if (p === '/auth/v1/token') {
      if (state.tokenFail) return json(route, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' });
      const fresh = makeSession(3600);
      state.issuedTokens.push(fresh.access_token);
      return json(route, 200, fresh);
    }

    // Storage
    if (p.startsWith('/storage/v1/object/')) {
      if (method === 'POST') {
        const sbErr = (statusCode, error, message) => json(route, 400, { statusCode, error, message });
        if (state.storageMode === 'rls') return sbErr('403', 'Unauthorized', 'new row violates row-level security policy');
        if (state.storageMode === 'bucket') return sbErr('404', 'Bucket not found', 'Bucket not found');
        if (state.storageMode === 'jwt-expired-once') { state.storageMode = 'ok'; return sbErr('403', 'Unauthorized', 'jwt expired'); }
        return json(route, 200, { Key: p.replace('/storage/v1/object/', ''), Id: 'obj-' + state.log.length });
      }
      if (method === 'DELETE') return json(route, 200, []);
    }
    if (p === '/rest/v1/media') {
      const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
      if (method === 'GET') {
        const rows = idEq ? state.media.filter((m) => m.id === idEq) : state.media;
        return json(route, 200, one(rows), { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
      }
      if (method === 'POST') {
        const row = { id: 'bbbbbbbb-0000-4000-8000-' + String(state.media.length + 1).padStart(12, '0'), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), caption: null, credit: null, ...entry.body };
        state.media.unshift(row);
        return json(route, 201, one([row]));
      }
      if (method === 'PATCH') { const m = state.media.find((x) => x.id === idEq); if (m) Object.assign(m, entry.body); return route.fulfill({ status: 204, headers: cors }); }
      if (method === 'DELETE') { state.media = state.media.filter((x) => x.id !== idEq); return route.fulfill({ status: 204, headers: cors }); }
    }
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });

    // PostgREST
    if (p === '/rest/v1/profiles') return json(route, 200, one([PROFILE]));
    if (p === '/rest/v1/categories' || p === '/rest/v1/tags' || p === '/rest/v1/article_revisions') return json(route, 200, []);
    if (p === '/rest/v1/article_categories' || p === '/rest/v1/article_tags') return json(route, method === 'POST' ? 201 : 204, undefined);

    if (state.legacySchema && (p === '/rest/v1/articles' || p === '/rest/v1/categories')
        && /article_type|is_featured|is_editors_pick|recipe|sort_order|is_active/.test(url.searchParams.get('select') || '')) {
      return json(route, 400, { code: '42703', message: 'column does not exist', details: null, hint: null });
    }
    if (state.legacySchema && p === '/rest/v1/articles' && method === 'PATCH'
        && entry.body && ['article_type', 'is_featured', 'is_editors_pick', 'recipe'].some((k) => k in entry.body)) {
      return json(route, 400, { code: 'PGRST204', message: "Could not find the 'article_type' column of 'articles' in the schema cache", details: null, hint: null });
    }
    if (p === '/rest/v1/articles') {
      const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
      const slugEq = url.searchParams.get('slug')?.replace(/^eq\./, '');
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': `*/${state.articles.size}` } });
      if (method === 'GET') {
        let rows = [...state.articles.values()];
        if (idEq) rows = rows.filter((a) => a.id === idEq);
        if (slugEq) rows = rows.filter((a) => a.slug === slugEq);
        const neq = url.searchParams.get('id')?.startsWith('neq.') ? url.searchParams.get('id').slice(4) : null;
        if (neq) rows = rows.filter((a) => a.id !== neq);
        return json(route, 200, one(rows.map(withRelations)));
      }
      if (method === 'POST') {
        if (state.postError) return json(route, 409, state.postError);
        const id = '33333333-3333-4333-8333-' + String(state.articles.size + 1).padStart(12, '0');
        const now = new Date().toISOString();
        const row = { ...baseArticle(), featured_image_id: null, social_image_id: null, ...entry.body, id, created_at: now, updated_at: now };
        state.articles.set(id, row);
        return json(route, 201, one([{ id }]));
      }
      if (method === 'PATCH') {
        state.inFlightPatches++;
        state.maxInFlightPatches = Math.max(state.maxInFlightPatches, state.inFlightPatches);
        try {
          if (state.patchDelayMs) await new Promise((r) => setTimeout(r, state.patchDelayMs));
          if (state.failPatches > 0) {
            state.failPatches--;
            entry.failed = true;
            return json(route, 500, { code: 'XX000', message: 'simulated server failure', details: null, hint: null });
          }
          const a = state.articles.get(idEq);
          if (a) {
            Object.assign(a, entry.body, { updated_at: new Date().toISOString() });
            if (entry.body.status === 'published' && !a.published_at) a.published_at = new Date().toISOString();
          }
          return route.fulfill({ status: 204, headers: cors });
        } finally { state.inFlightPatches--; }
      }
    }
    return json(route, 200, []);
  }
  return { state, handler };
}

// ── test runner ─────────────────────────────────────────────────────────────
const results = [];
async function withPage(browser, base, mockOpts, fn, { session = makeSession(), timezoneId } = {}) {
  const context = await browser.newContext(timezoneId ? { timezoneId } : {});
  const mock = createMock(mockOpts);
  await context.route(`${SB}/**`, mock.handler);
  if (session) {
    await context.addInitScript(([k, v]) => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, [STORAGE_KEY, JSON.stringify(session)]);
  }
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  try { await fn(page, mock.state, consoleErrors, session); } finally { await context.close(); }
}
function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + msg); }
async function waitFor(pred, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) { if (await pred()) return true; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`Timed out after ${timeoutMs} ms waiting for: ${label}`);
}
const writes = (s, m, pth = '/rest/v1/articles') => s.log.filter((e) => e.method === m && e.path === pth);
const storageUploads = (s) => s.log.filter((e) => e.method === 'POST' && e.path.startsWith('/storage/v1/object/'));
const LIBRARY_ITEM = {
  id: 'cccccccc-0000-4000-8000-000000000001', storage_path: 'articles/rolex.webp', original_filename: 'rolex.webp',
  mime_type: 'image/webp', file_size_bytes: 2048, width_px: 800, height_px: 600, alt_text: 'Rolex on a plate',
  caption: null, credit: null, uploaded_by: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-11-02T09:00:00Z', updated_at: '2026-11-02T09:00:00Z',
};
async function chooseFile(scope, name = 'matooke.png') {
  await scope.locator('input[type="file"]').first().setInputFiles({ name, mimeType: 'image/png', buffer: PNG_1PX });
}
async function refocusTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
}
async function expectToast(page, text, timeout = 8000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

const TESTS = {
  // 1. The deadlock scenario: SIGNED_IN is emitted under the auth lock when the tab regains focus.
  async 'auth: saving works after tab refocus (SIGNED_IN under auth lock)'(browser, base) {
    await withPage(browser, base, {}, async (page, s) => {
      await page.goto(`${base}/admin/articles/new`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.waitForTimeout(500);
      await refocusTab(page);
      await page.waitForTimeout(800);
      await page.getByPlaceholder('Enter article title…').fill('Rolex chapati masterclass');
      await page.getByRole('button', { name: 'Save draft' }).click();
      await waitFor(() => writes(s, 'POST').length > 0, 8000, 'POST /rest/v1/articles to reach the backend');
      await page.waitForURL(/\/admin\/articles\/[0-9a-f-]+\/edit$/, { timeout: 8000 });
      await expectToast(page, 'Draft saved.');
      assert(writes(s, 'POST').length === 1, `exactly one insert (got ${writes(s, 'POST').length})`);
      const body = writes(s, 'POST')[0].body;
      assert(body.status === 'draft' && body.author_id === USER.id && body.slug === 'rolex-chapati-masterclass', 'insert payload is a draft by the signed-in admin');
    });
  },

  // 2. TOKEN_REFRESHED is also emitted under the lock.
  async 'auth: saving works after a token refresh; profile loaded once'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      // make the stored session nearly expired, then refocus → refresh → TOKEN_REFRESHED
      await page.evaluate((k) => { const v = JSON.parse(localStorage.getItem(k)); v.expires_at = Math.floor(Date.now() / 1000) + 5; localStorage.setItem(k, JSON.stringify(v)); }, STORAGE_KEY);
      await refocusTab(page);
      await waitFor(() => s.log.some((e) => e.path === '/auth/v1/token'), 8000, 'token refresh request');
      await page.waitForTimeout(500);
      await refocusTab(page);
      await page.waitForTimeout(500);
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Excerpt after token refresh');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await waitFor(() => writes(s, 'PATCH').length > 0, 8000, 'PATCH after token refresh');
      await expectToast(page, 'Article saved.');
      const profileGets = s.log.filter((e) => e.path === '/rest/v1/profiles').length;
      const getUserCalls = s.log.filter((e) => e.path === '/auth/v1/user').length;
      assert(profileGets === 1, `profile requested once across load + refresh + refocus (got ${profileGets})`);
      assert(getUserCalls === 0, `no getUser() round-trips (got ${getUserCalls})`);
    });
  },

  // 3. Images are loaded and preserved; status is not written by content saves; no editor reload.
  async 'images: existing featured/social images preserved by autosave; no reload'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle({ status: 'published', published_at: '2026-11-02T12:00:00Z' })], patchDelayMs: 1200 }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      const titleBox = page.getByPlaceholder('Enter article title…');
      await titleBox.waitFor({ timeout: 15000 });
      const imgs = await page.locator('img[src*="featured.webp"]').count();
      assert(imgs >= 1, 'featured image preview rendered from stored record');
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Edited excerpt');
      await waitFor(() => writes(s, 'PATCH').length >= 1, 9000, 'autosave PATCH');
      // type while the save is in flight
      await titleBox.click();
      await titleBox.press('End');
      await titleBox.type(' — updated', { delay: 30 });
      await waitFor(() => writes(s, 'PATCH').length >= 2, 12000, 'second autosave with the in-flight edits');
      await waitFor(async () => (await page.getByText('Saved', { exact: true }).count()) > 0 || (await page.getByText('All changes saved').count()) > 0, 8000, 'saved status');
      const p1 = writes(s, 'PATCH')[0].body, p2 = writes(s, 'PATCH')[1].body;
      for (const b of [p1, p2]) {
        assert(b.featured_image_id === FEATURED_ID, `featured_image_id preserved (got ${b.featured_image_id})`);
        assert(b.social_image_id === SOCIAL_ID, `social_image_id preserved (got ${b.social_image_id})`);
        assert(!('status' in b) && !('published_at' in b) && !('scheduled_for' in b) && !('author_id' in b), 'content save does not write status/published_at/scheduled_for/author_id');
      }
      assert(p2.title === 'Existing article — updated', `edits typed during a save were saved (got "${p2.title}")`);
      assert(await titleBox.inputValue() === 'Existing article — updated', 'editor kept the typed text (not reloaded)');
      const articleGets = s.log.filter((e) => e.method === 'GET' && e.path === '/rest/v1/articles' && e.query.includes('id=eq.')).length;
      assert(articleGets === 1, `autosave does not reload the article (GET by id: ${articleGets})`);
      assert(s.articles.get('22222222-2222-4222-8222-222222222222').status === 'published', 'article stays published after content saves');
    });
  },

  // 4. Intentional removal still works.
  async 'images: removing the featured image saves NULL, social image kept'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Remove' }).first().click();
      await waitFor(() => writes(s, 'PATCH').length >= 1, 9000, 'autosave after removal');
      const b = writes(s, 'PATCH')[0].body;
      assert(b.featured_image_id === null, 'featured image removed intentionally');
      assert(b.social_image_id === SOCIAL_ID, 'social image untouched');
    });
  },

  // 5. A failed autosave is reported and recovers.
  async 'autosave: failure is reported and the next edit saves successfully'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()], failPatches: 1 }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      const excerpt = page.getByPlaceholder('A short summary', { exact: false });
      await excerpt.fill('First attempt');
      await waitFor(() => writes(s, 'PATCH').some((e) => e.failed), 9000, 'failed PATCH');
      await page.getByText('Save failed').first().waitFor({ timeout: 5000 });
      await expectToast(page, 'Autosave failed');
      await excerpt.fill('Second attempt');
      await waitFor(() => writes(s, 'PATCH').some((e) => !e.failed && e.body.excerpt === 'Second attempt'), 9000, 'successful PATCH after failure');
      await waitFor(async () => (await page.getByText('Save failed').count()) === 0, 5000, 'failed status cleared');
      assert(s.articles.get('22222222-2222-4222-8222-222222222222').excerpt === 'Second attempt', 'content persisted');
    });
  },

  // 6. Only one save in flight at a time.
  async 'autosave: concurrent saves are serialised'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()], patchDelayMs: 1500 }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      const excerpt = page.getByPlaceholder('A short summary', { exact: false });
      await excerpt.fill('Concurrent 1');
      const save = page.getByRole('button', { name: 'Save changes' });
      await save.click();
      await excerpt.fill('Concurrent 2');
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Save changes')); b && b.click(); });
      await page.waitForTimeout(7000);
      assert(s.maxInFlightPatches === 1, `max concurrent PATCH requests = ${s.maxInFlightPatches}`);
      assert(s.articles.get('22222222-2222-4222-8222-222222222222').excerpt === 'Concurrent 2', 'latest content saved');
    });
  },

  // 7. Save & publish from the New Article page.
  async 'workflow: Save & publish creates one article and publishes it'(browser, base) {
    await withPage(browser, base, {}, async (page, s) => {
      await page.goto(`${base}/admin/articles/new`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('Enter article title…').fill('Luwombo the royal way');
      await page.getByRole('button', { name: 'Save & publish' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Save & publish' }).click();
      await page.waitForURL(/\/edit$/, { timeout: 10000 });
      await expectToast(page, 'Article saved and published.');
      assert(writes(s, 'POST').length === 1, 'one insert');
      assert(writes(s, 'PATCH').some((e) => e.body.status === 'published'), 'status set to published');
      await page.getByRole('button', { name: /Unpublish/ }).waitFor({ timeout: 8000 });
      assert(await page.getByRole('button', { name: 'Publish now' }).count() === 0, 'publish button hidden for published article');
    });
  },

  // 8. Publishing an existing draft keeps the editor mounted.
  async 'workflow: Publish now on an existing draft saves content, publishes, no full reload'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      const excerpt = page.getByPlaceholder('A short summary', { exact: false });
      await excerpt.fill('Ready to publish');
      await page.getByRole('button', { name: 'Publish now' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
      await expectToast(page, 'Article published.');
      await page.getByRole('button', { name: /Unpublish/ }).waitFor({ timeout: 8000 });
      const patches = writes(s, 'PATCH');
      assert(patches[0].body.excerpt === 'Ready to publish' && !('status' in patches[0].body), 'content saved first');
      assert(patches.some((e) => e.body.status === 'published'), 'then published');
      assert(await excerpt.inputValue() === 'Ready to publish', 'editor state preserved');
      assert(s.articles.get('22222222-2222-4222-8222-222222222222').featured_image_id === FEATURED_ID, 'featured image still set after publish');
    });
  },

  // 9. Accurate error message for a slug conflict.
  async 'errors: slug conflict on create shows an actionable message'(browser, base) {
    await withPage(browser, base, { postError: { code: '23505', message: 'duplicate key value violates unique constraint "articles_slug_key"', details: 'Key (slug)=(dup) already exists.', hint: null } }, async (page, s) => {
      await page.goto(`${base}/admin/articles/new`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('Enter article title…').fill('Duplicate');
      await page.getByRole('button', { name: 'Save draft' }).click();
      await expectToast(page, 'already used by another article');
      assert(/\/admin\/articles\/new$/.test(page.url()), 'stays on the new-article page');
    });
  },

  // 10. Logout clears auth state.
  async 'auth: sign out returns to the login page'(browser, base) {
    await withPage(browser, base, {}, async (page, s) => {
      await page.goto(`${base}/admin`);
      await page.getByRole('button', { name: /Sign out/ }).waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: /Sign out/ }).click();
      await page.waitForURL(/\/admin\/login/, { timeout: 8000 });
      const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
      assert(stored === null, 'session removed from storage');
    });
  },

  // 11. Author byline: the author's own edit follows their profile name; author_id never sent.
  async 'author: own article byline follows the profile name; author_id never changed'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle({ author_display_name: 'Old Name' })] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Author edit');
      await waitFor(() => writes(s, 'PATCH').length >= 1, 9000, 'autosave');
      const b = writes(s, 'PATCH')[0].body;
      assert(b.author_display_name === PROFILE.display_name, `byline follows author's profile (got ${b.author_display_name})`);
      assert(!('author_id' in b), 'author_id not sent on edit');
    });
  },

  // 12. Author byline: another admin's edit keeps the original author's byline.
  async "author: another admin's edit keeps the original byline"(browser, base) {
    const other = baseArticle({ author_id: '99999999-9999-4999-8999-999999999999', author_display_name: 'Original Author' });
    await withPage(browser, base, { articles: [other] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Edited by a colleague');
      await waitFor(() => writes(s, 'PATCH').length >= 1, 9000, 'autosave');
      const b = writes(s, 'PATCH')[0].body;
      assert(!('author_display_name' in b) && !('author_id' in b), 'original author untouched');
      assert(s.articles.get(other.id).author_display_name === 'Original Author', 'stored byline unchanged');
    });
  },

  // 13. Reading time: live estimate in the editor, same formula as the DB column.
  async 'reading time: editor shows a live estimate that follows the content'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByText('Reading time: 1 min').waitFor({ timeout: 5000 });
      const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(' ');
      await page.locator('.ProseMirror').click();
      await page.keyboard.press('Control+A');
      await page.keyboard.insertText(words);
      await page.getByText('Reading time: 2 min').waitFor({ timeout: 5000 });
      await waitFor(() => writes(s, 'PATCH').length >= 1, 9000, 'autosave');
      assert(!('reading_time_minutes' in writes(s, 'PATCH')[0].body), 'reading_time_minutes is never written (DB-generated)');
    });
  },

  // 14. Archive saves pending edits first.
  async 'archive: pending edits are saved before archiving'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Last-minute edit');
      await page.getByRole('button', { name: 'Archive', exact: true }).click();   // before the 4 s autosave
      await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
      await page.waitForURL(/\/admin\/articles$/, { timeout: 8000 });
      const patches = writes(s, 'PATCH');
      const contentIdx = patches.findIndex((e) => e.body.excerpt === 'Last-minute edit');
      const archiveIdx = patches.findIndex((e) => e.body.status === 'archived');
      assert(contentIdx >= 0 && archiveIdx > contentIdx, `content saved before archive (content #${contentIdx}, archive #${archiveIdx})`);
      const a = s.articles.get('22222222-2222-4222-8222-222222222222');
      assert(a.excerpt === 'Last-minute edit' && a.status === 'archived', 'edit kept and article archived');
    });
  },

  // 15. Archive is cancelled if pending edits cannot be saved.
  async 'archive: cancelled (not archived) when pending edits fail to save'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()], failPatches: 1 }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByPlaceholder('A short summary', { exact: false }).fill('Unsaveable edit');
      await page.getByRole('button', { name: 'Archive', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
      await expectToast(page, 'Archive cancelled');
      assert(!writes(s, 'PATCH').some((e) => e.body.status === 'archived'), 'no archive request sent');
      assert(/\/edit$/.test(page.url()), 'editor stays open');
      assert(await page.getByPlaceholder('A short summary', { exact: false }).inputValue() === 'Unsaveable edit', 'unsaved text still in the editor');
    });
  },

  // 16. Upload uses the signed-in admin's token, the correct bucket and registers the media row.
  async 'upload: admin upload uses the session token and the article-media bucket'(browser, base) {
    await withPage(browser, base, {}, async (page, s, _errs, session) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('[aria-label="Upload images — click or drag files here"]').first().waitFor({ timeout: 15000 });
      await chooseFile(page);
      await expectToast(page, '1 file uploaded.');
      const ups = storageUploads(s);
      assert(ups.length === 1, `one storage upload (got ${ups.length})`);
      const u = ups[0];
      assert(u.path.startsWith(`/storage/v1/object/${BUCKET}/articles/`) && u.path.endsWith('.png'), `correct bucket and folder (got ${u.path})`);
      assert(!/Article%20Media|Article Media/.test(u.path), 'never the "Article Media" bucket');
      assert(u.headers.authorization === `Bearer ${session.access_token}`, 'Authorization carries the signed-in user access token');
      assert(u.headers.authorization !== `Bearer ${ANON_KEY}`, 'anon key is not used as the bearer token');
      assert(u.headers.apikey === ANON_KEY, 'apikey header present (publishable key)');
      assert(u.bodySize === PNG_1PX.length, 'file bytes sent');
      const ins = writes(s, 'POST', '/rest/v1/media');
      assert(ins.length === 1 && ins[0].body.uploaded_by === USER.id && u.path.endsWith(ins[0].body.storage_path), 'media row registered for the uploader with the stored path');
      assert(!s.log.some((e) => e.path === '/auth/v1/user'), 'no getUser() round-trip');
      await page.locator('img[alt="matooke.png"]').first().waitFor({ timeout: 5000 });
    });
  },

  // 17. Unauthenticated visitors cannot reach the upload UI.
  async 'upload: unauthenticated visitor is sent to login; no upload possible'(browser, base) {
    await withPage(browser, base, {}, async (page, s) => {
      await page.goto(`${base}/admin/media`);
      await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
      assert(await page.locator('input[type="file"]').count() === 0, 'no upload control rendered');
      assert(storageUploads(s).length === 0, 'no storage requests');
    }, { session: null });
  },

  // 18. Session lost before uploading → refused before any bytes are sent.
  async 'upload: expired, unrenewable session is refused before sending the file'(browser, base) {
    await withPage(browser, base, { tokenFail: true }, async (page, s) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('[aria-label="Upload images — click or drag files here"]').first().waitFor({ timeout: 15000 });
      await page.evaluate((k) => { const v = JSON.parse(localStorage.getItem(k)); v.expires_at = Math.floor(Date.now() / 1000) - 60; localStorage.setItem(k, JSON.stringify(v)); }, STORAGE_KEY);
      await chooseFile(page);
      await waitFor(async () => /\/admin\/login/.test(page.url()) || (await page.getByText('not signed in', { exact: false }).count()) > 0, 10000, 'sign-in prompt or redirect to login');
      assert(storageUploads(s).length === 0, `no file sent without a valid session (got ${storageUploads(s).length})`);
      assert(writes(s, 'POST', '/rest/v1/media').length === 0, 'no media row created');
    });
  },

  // 19. Token expired mid-session → refreshed once, upload retried with the new token.
  async 'upload: expired token is refreshed and the upload retried once'(browser, base) {
    await withPage(browser, base, { storageMode: 'jwt-expired-once' }, async (page, s, _errs, session) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('[aria-label="Upload images — click or drag files here"]').first().waitFor({ timeout: 15000 });
      await chooseFile(page);
      await expectToast(page, '1 file uploaded.');
      const ups = storageUploads(s);
      assert(ups.length === 2, `exactly one retry (got ${ups.length} uploads)`);
      assert(ups[0].headers.authorization === `Bearer ${session.access_token}`, 'first attempt used the original token');
      assert(s.issuedTokens.length >= 1 && ups[1].headers.authorization === `Bearer ${s.issuedTokens[s.issuedTokens.length - 1]}`, 'retry used the refreshed token');
    });
  },

  // 20. RLS denial is reported as a permission problem, not a missing bucket.
  async 'upload: storage RLS denial shows an accurate permission error'(browser, base) {
    await withPage(browser, base, { storageMode: 'rls' }, async (page, s) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('[aria-label="Upload images — click or drag files here"]').first().waitFor({ timeout: 15000 });
      await chooseFile(page);
      await expectToast(page, 'Upload failed for 1 file');
      const err = page.getByText('refused the upload (permission denied)', { exact: false }).first();
      await err.waitFor({ timeout: 5000 });
      const text = await err.textContent();
      assert(text.includes('new row violates row-level security policy'), 'original Supabase message included');
      assert(!/not found/i.test(text), 'not misreported as a missing bucket');
      assert(writes(s, 'POST', '/rest/v1/media').length === 0, 'no media row for a failed upload');
      await page.waitForTimeout(6000);
      assert(await page.getByText('refused the upload (permission denied)', { exact: false }).count() > 0, 'failure stays visible after successful items are cleared');
    });
  },

  // 21. Missing bucket is reported as such.
  async 'upload: missing bucket is reported accurately'(browser, base) {
    await withPage(browser, base, { storageMode: 'bucket' }, async (page) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('[aria-label="Upload images — click or drag files here"]').first().waitFor({ timeout: 15000 });
      await chooseFile(page);
      await page.getByText(`The storage bucket "${BUCKET}" was not found`, { exact: false }).first().waitFor({ timeout: 8000 });
    });
  },

  // 22. Picker: select an existing image, preview it, confirm; featured image set and saved.
  async 'picker: existing media can be selected, previewed and used as featured image'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle({ featured_image_id: null })], media: [LIBRARY_ITEM] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Select featured image' }).click();
      const dlg = page.getByRole('dialog');
      await dlg.locator('img[alt="Rolex on a plate"]').first().click();
      assert(await dlg.locator('img[src*="rolex.webp"]').count() >= 2, 'grid thumbnail and selection preview shown');
      await dlg.getByRole('button', { name: 'Confirm' }).click();
      await page.locator('img[src*="rolex.webp"]').first().waitFor({ timeout: 5000 });
      await waitFor(() => writes(s, 'PATCH').some((e) => e.body.featured_image_id === LIBRARY_ITEM.id), 9000, 'autosave with the selected featured image');
    });
  },

  // 23. Picker: upload inside the editor uses the session and auto-selects; errors shown in the picker.
  async 'picker: upload from the editor auto-selects the new image; errors are shown'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle({ featured_image_id: null })] }, async (page, s, _errs, session) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Select featured image' }).click();
      const dlg = page.getByRole('dialog');
      await chooseFile(dlg, 'posho.png');
      await waitFor(() => writes(s, 'POST', '/rest/v1/media').length === 1, 8000, 'media row created');
      assert(storageUploads(s)[0].headers.authorization === `Bearer ${session.access_token}`, 'picker upload uses the session token');
      await dlg.getByRole('button', { name: 'Confirm' }).waitFor({ state: 'visible' });
      await waitFor(async () => await dlg.getByRole('button', { name: 'Confirm' }).isEnabled(), 5000, 'new upload auto-selected');
      // now make the next upload fail and check the message is visible inside the picker
      s.storageMode = 'rls';
      await chooseFile(dlg, 'failing.png');
      await dlg.getByText('refused the upload (permission denied)', { exact: false }).first().waitFor({ timeout: 8000 });
    });
  },

  // 24. Media library: metadata editing and deletion still work.
  async 'library: metadata can be edited and media deleted'(browser, base) {
    await withPage(browser, base, { media: [{ ...LIBRARY_ITEM }] }, async (page, s) => {
      await page.goto(`${base}/admin/media`);
      await page.locator('img[alt="Rolex on a plate"]').first().click();
      await page.getByPlaceholder('Caption displayed below the image', { exact: false }).fill('Kampala street food');
      await page.getByRole('button', { name: 'Save metadata' }).click();
      await waitFor(() => writes(s, 'PATCH', '/rest/v1/media').some((e) => e.body.caption === 'Kampala street food'), 6000, 'metadata PATCH');
      await page.getByRole('button', { name: /^Delete image/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await waitFor(() => s.media.length === 0, 6000, 'media row deleted');
      assert(s.log.some((e) => e.method === 'DELETE' && e.path.startsWith('/storage/v1/object/')), 'storage object removal requested');
    });
  },

  // 25–26. Scheduling uses Kampala time whatever the browser's time zone is.
  ...['Africa/Kampala', 'America/New_York'].reduce((acc, tz) => Object.assign(acc, {
    [`schedule: Kampala wall time round-trips without shifting (browser in ${tz})`]: async (browser, base) => {
      const stored = '2026-12-01T06:00:00+00:00';           // = 09:00 in Kampala
      const art = baseArticle({ status: 'scheduled', scheduled_for: stored, created_at: '2026-11-01T10:00:00Z' });
      await withPage(browser, base, { articles: [art] }, async (page, s) => {
        await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
        await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
        const input = page.locator('input[type="datetime-local"]');
        assert(await input.inputValue() === '2026-12-01T09:00', `input shows Kampala time (got ${await input.inputValue()})`);
        const preview = await page.getByTestId('schedule-preview').textContent();
        assert(/Kampala time: .*09:00/.test(preview) && /06:00:00 GMT/.test(preview), `preview shows Kampala + UTC (got "${preview}")`);
        // Re-schedule without changing the field → same instant
        await page.getByRole('button', { name: 'Schedule publication' }).click();
        await waitFor(() => writes(s, 'PATCH').some((e) => e.body.status === 'scheduled'), 8000, 'schedule PATCH');
        const first = writes(s, 'PATCH').find((e) => e.body.status === 'scheduled').body.scheduled_for;
        assert(new Date(first).getTime() === new Date(stored).getTime(), `unchanged reschedule keeps the instant (sent ${first})`);
        // Change the time → converted from Kampala to UTC exactly once
        await input.fill('2026-12-02T10:30');
        await page.getByRole('button', { name: 'Schedule publication' }).click();
        await waitFor(() => writes(s, 'PATCH').filter((e) => e.body.status === 'scheduled').length >= 2, 8000, 'second schedule PATCH');
        const second = writes(s, 'PATCH').filter((e) => e.body.status === 'scheduled')[1].body.scheduled_for;
        assert(second === '2026-12-02T07:30:00.000Z', `10:30 Kampala → 07:30Z (sent ${second})`);
        await expectToast(page, 'Article scheduled for');
      }, { timezoneId: tz });
    },
  }), {}),
  // 27. Knowledge platform (after the migration): format, flags and structured recipe data are saved.
  async 'knowledge: recipe format, flags and ingredients are saved after the migration'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()] }, async (page, s) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByLabel('Article format').selectOption('recipe');
      await page.getByLabel('Featured article (top of the library)').check();
      await page.getByLabel('Prep (min)').fill('15');
      await page.getByRole('button', { name: 'Add ingredient' }).click();
      await page.getByLabel('Ingredient 1 quantity').fill('2');
      await page.getByLabel('Ingredient 1 name').fill('eggs');
      await page.getByRole('button', { name: 'Add method step' }).click();
      await page.getByLabel('Method step 1', { exact: true }).fill('Beat the eggs.');
      await page.getByRole('button', { name: 'Add method step' }).click();
      await page.getByLabel('Method step 2', { exact: true }).fill('Cook in a hot pan.');
      await page.getByLabel('Eggs').check();
      await waitFor(() => writes(s, 'PATCH').some((e) => e.body.article_type === 'recipe' && e.body.is_featured === true
        && e.body.recipe?.ingredients?.[0]?.item === 'eggs' && e.body.recipe?.method?.length === 2
        && e.body.recipe?.prep_minutes === 15 && e.body.recipe?.allergens?.includes('Eggs')), 12000, 'autosave with recipe data');
    });
  },

  // 28. Before the migration: the panel is disabled and no unknown columns are ever sent.
  async 'knowledge: before the migration no new columns are sent and saving still works'(browser, base) {
    await withPage(browser, base, { articles: [baseArticle()], legacySchema: true }, async (page, s, errors) => {
      await page.goto(`${base}/admin/articles/22222222-2222-4222-8222-222222222222/edit`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByText('saved after the knowledge-platform database upgrade', { exact: false }).waitFor({ timeout: 8000 });
      assert(await page.getByLabel('Article format').isDisabled(), 'format select disabled');
      await page.getByPlaceholder('Enter article title…').fill('Existing article — edited');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await waitFor(() => writes(s, 'PATCH').some((e) => e.body.title === 'Existing article — edited'), 8000, 'save PATCH');
      const bad = writes(s, 'PATCH').filter((e) => e.body && ['article_type', 'is_featured', 'is_editors_pick', 'recipe'].some((k) => k in e.body));
      assert(bad.length === 0, 'no knowledge columns sent before the migration');
      await expectToast(page, 'Changes saved');
      assert(errors.length === 0, 'no page errors: ' + errors.join('; '));
    });
  },

  // 29. Starter outline: inserting an outline fills an empty body with the format's headings.
  async 'knowledge: starter outline is inserted into an empty article'(browser, base) {
    await withPage(browser, base, {}, async (page) => {
      await page.goto(`${base}/admin/articles/new`);
      await page.getByPlaceholder('Enter article title…').waitFor({ timeout: 15000 });
      await page.getByLabel('Starter outline').selectOption('food_safety_guide');
      await page.getByRole('button', { name: 'Insert', exact: true }).click();
      await page.locator('.ProseMirror h2', { hasText: 'Safe practice' }).waitFor({ timeout: 5000 });
      assert(await page.locator('.ProseMirror blockquote', { hasText: 'Safety note' }).count() === 1, 'safety callout prompt inserted');
    });
  },
};

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  for (const [name, fn] of Object.entries(TESTS)) {
    if (FILTER && !name.includes(FILTER)) continue;
    const t0 = Date.now();
    try { await fn(browser, base); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`PASS  ${name}  (${Date.now() - t0} ms)`); }
    catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`); }
  }
  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
