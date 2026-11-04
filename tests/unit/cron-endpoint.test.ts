/**
 * Tests for api/cron/publish-scheduled.ts with a mocked request/response and
 * a mocked fetch — no network, no database.
 *
 * Run: npx tsx --test tests/unit/cron-endpoint.test.ts
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, { isAuthorized } from '../../api/cron/publish-scheduled';

const SECRET = 'test-cron-secret-0123456789abcdef';
const SB_URL = 'https://example.supabase.co';
const SERVICE_KEY = 'service-role-key-for-tests';

interface Captured { status?: number; body?: Record<string, unknown> }

function makeRes(captured: Captured) {
  const res = {
    status(code: number) { captured.status = code; return res; },
    json(body: Record<string, unknown>) { captured.body = body; return res; },
  };
  return res as unknown as Parameters<typeof handler>[1];
}

function makeReq(opts: { method?: string; auth?: string; query?: Record<string, string> } = {}) {
  return {
    method: opts.method ?? 'GET',
    headers: opts.auth === undefined ? {} : { authorization: opts.auth },
    query: opts.query ?? {},
  } as unknown as Parameters<typeof handler>[0];
}

const realFetch = globalThis.fetch;
let fetchCalls: Array<{ url: string; init: RequestInit }> = [];
let nextFetch: () => Promise<Response>;

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.SUPABASE_URL = SB_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  fetchCalls = [];
  nextFetch = async () => new Response(JSON.stringify({
    status: 'success', run_id: 'run-1', published_count: 1, published_ids: ['a1'],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return nextFetch();
  }) as typeof fetch;
});

afterEach(() => { globalThis.fetch = realFetch; });

async function call(req: Parameters<typeof handler>[0]) {
  const c: Captured = {};
  await handler(req, makeRes(c));
  return c;
}

test('isAuthorized: exact bearer match only', () => {
  assert.equal(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(isAuthorized(`Bearer ${SECRET}x`, SECRET), false);
  assert.equal(isAuthorized(`bearer ${SECRET}`, SECRET), false);
  assert.equal(isAuthorized(SECRET, SECRET), false);
  assert.equal(isAuthorized(undefined, SECRET), false);
  assert.equal(isAuthorized([`Bearer ${SECRET}`], SECRET), true);
});

test('valid Authorization header → 200, calls the RPC with service role and p_triggered_by=cron', async () => {
  const c = await call(makeReq({ auth: `Bearer ${SECRET}` }));
  assert.equal(c.status, 200);
  assert.equal(c.body?.status, 'success');
  assert.equal(c.body?.published_count, 1);
  assert.equal(c.body?.triggered_by, 'cron');
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${SB_URL}/rest/v1/rpc/publish_scheduled_articles`);
  const headers = fetchCalls[0].init.headers as Record<string, string>;
  assert.equal(headers['Authorization'], `Bearer ${SERVICE_KEY}`);
  assert.equal(headers['apikey'], SERVICE_KEY);
  assert.deepEqual(JSON.parse(String(fetchCalls[0].init.body)), { p_triggered_by: 'cron' });
});

test('POST is also accepted (manual server-side run labelled via ?trigger=manual)', async () => {
  const c = await call(makeReq({ method: 'POST', auth: `Bearer ${SECRET}`, query: { trigger: 'manual' } }));
  assert.equal(c.status, 200);
  assert.deepEqual(JSON.parse(String(fetchCalls[0].init.body)), { p_triggered_by: 'manual' });
});

test('secret in the URL query is NOT accepted → 401, no RPC call', async () => {
  const c = await call(makeReq({ query: { secret: SECRET } }));
  assert.equal(c.status, 401);
  assert.equal(fetchCalls.length, 0);
});

test('missing or wrong Authorization header → 401, no RPC call', async () => {
  assert.equal((await call(makeReq())).status, 401);
  assert.equal((await call(makeReq({ auth: 'Bearer wrong' }))).status, 401);
  assert.equal(fetchCalls.length, 0);
});

test('unsupported method → 405', async () => {
  assert.equal((await call(makeReq({ method: 'PUT', auth: `Bearer ${SECRET}` }))).status, 405);
});

test('CRON_SECRET not configured → 500, no RPC call', async () => {
  delete process.env.CRON_SECRET;
  const c = await call(makeReq({ auth: 'Bearer anything' }));
  assert.equal(c.status, 500);
  assert.equal(fetchCalls.length, 0);
});

test('Supabase env missing → 500', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal((await call(makeReq({ auth: `Bearer ${SECRET}` }))).status, 500);
});

test('function returns {status:"error"} → HTTP 500 with the error', async () => {
  nextFetch = async () => new Response(JSON.stringify({ status: 'error', error: 'injected failure', run_id: 'run-err' }), { status: 200 });
  const c = await call(makeReq({ auth: `Bearer ${SECRET}` }));
  assert.equal(c.status, 500);
  assert.equal(c.body?.status, 'error');
  assert.equal(c.body?.error, 'injected failure');
  assert.equal(c.body?.run_id, 'run-err');
});

test('RPC HTTP failure (e.g. function missing) → 500', async () => {
  nextFetch = async () => new Response('{"code":"PGRST202","message":"Could not find the function"}', { status: 404 });
  const c = await call(makeReq({ auth: `Bearer ${SECRET}` }));
  assert.equal(c.status, 500);
  assert.match(String(c.body?.error), /HTTP 404/);
});

test('network error → 500', async () => {
  nextFetch = async () => { throw new Error('ECONNRESET'); };
  const c = await call(makeReq({ auth: `Bearer ${SECRET}` }));
  assert.equal(c.status, 500);
  assert.equal(c.body?.error, 'ECONNRESET');
});

test('responses never echo the cron secret or the service key', async () => {
  const bodies = [
    await call(makeReq({ auth: `Bearer ${SECRET}` })),
    await call(makeReq({ query: { secret: SECRET } })),
  ].map((c) => JSON.stringify(c.body));
  for (const b of bodies) {
    assert.ok(!b.includes(SECRET), 'cron secret not in response');
    assert.ok(!b.includes(SERVICE_KEY), 'service key not in response');
  }
});
