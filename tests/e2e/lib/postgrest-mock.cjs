/**
 * In-memory Supabase mock for CMS end-to-end tests.
 *
 * Implements the subset of PostgREST that the CMS uses: filters (eq, neq, in,
 * not.in, is, gt/gte/lt/lte, ilike, or=(…)), order, offset/limit, exact
 * counts (GET and HEAD), insert / upsert / update / delete with filters, and
 * single-object responses. Relations used by the CMS are embedded on every
 * row (extra fields are harmless to the app).
 *
 * Options:
 *   knowledgeSchema: true  → knowledge-platform columns exist (default true)
 *   authorProfiles:  true  → author_profiles table exists (default false)
 *
 * No request ever reaches a real Supabase project.
 */
'use strict';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS',
  'access-control-expose-headers': 'content-range, x-supabase-api-version',
};

// Column defaults from supabase/proposed/20261106000000_knowledge_platform.sql
const SCHEMA_DEFAULTS = {
  categories: { sort_order: 100, is_active: true },
  articles: { article_type: 'educational', is_featured: false, is_editors_pick: false, recipe: null },
};
const OLD_SCHEMA_HIDDEN = new Set(['article_type', 'is_featured', 'is_editors_pick', 'recipe', 'sort_order', 'is_active']);
const KNOWLEDGE_COLS = /\b(article_type|is_featured|is_editors_pick|recipe|sort_order|is_active)\b/;

/** Splits "a.eq.1,b.in.(x,y)" at top-level commas. */
function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const unquote = (v) => v.replace(/^"(.*)"$/, '$1');

/** Evaluates one "op.value" expression against a row value. */
function test(rowVal, expr) {
  if (expr.startsWith('not.')) return !test(rowVal, expr.slice(4));
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot);
  const val = expr.slice(dot + 1);
  const str = rowVal === null || rowVal === undefined ? null : String(rowVal);
  switch (op) {
    case 'eq': return str === val || (val === 'true' && rowVal === true) || (val === 'false' && rowVal === false);
    case 'neq': return str !== val;
    case 'in': return splitTopLevel(val.replace(/^\(|\)$/g, '')).map(unquote).includes(str);
    case 'is':
      if (val === 'null') return rowVal === null || rowVal === undefined;
      if (val === 'true') return rowVal === true;
      if (val === 'false') return rowVal === false;
      return false;
    case 'gt': return str !== null && str > val;
    case 'gte': return str !== null && str >= val;
    case 'lt': return str !== null && str < val;
    case 'lte': return str !== null && str <= val;
    case 'ilike': {
      if (str === null) return false;
      const re = new RegExp('^' + val.split('%').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      return re.test(str);
    }
    default: throw new Error('mock: unsupported operator ' + op);
  }
}

/** "col.op.value" (inside or=) */
function testCondition(row, cond) {
  const dot = cond.indexOf('.');
  return test(row[cond.slice(0, dot)], cond.slice(dot + 1));
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'or', 'on_conflict', 'columns']);

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params.entries()) {
    if (RESERVED.has(key)) continue;
    out = out.filter((r) => test(r[key], value));
  }
  for (const orExpr of params.getAll('or')) {
    const conds = splitTopLevel(orExpr.replace(/^\(|\)$/g, ''));
    out = out.filter((r) => conds.some((c) => testCondition(r, c)));
  }
  return out;
}

function applyOrder(rows, order) {
  if (!order) return rows;
  const [col, dir = 'asc', nulls] = order.split(',')[0].split('.');
  const asc = dir !== 'desc';
  const nullsLast = nulls ? nulls === 'nullslast' : asc;
  return [...rows].sort((a, b) => {
    const x = a[col]; const y = b[col];
    if (x == null && y == null) return 0;
    if (x == null) return nullsLast ? 1 : -1;
    if (y == null) return nullsLast ? -1 : 1;
    if (x < y) return asc ? -1 : 1;
    if (x > y) return asc ? 1 : -1;
    return 0;
  });
}

function createMock(seed = {}, opts = {}) {
  const knowledgeSchema = opts.knowledgeSchema !== false;
  const authorProfilesTable = !!opts.authorProfiles;
  const db = {
    profiles: [], articles: [], categories: [], tags: [], article_categories: [], article_tags: [],
    media: [], author_profiles: [], article_revisions: [], redirects: [],
    ...JSON.parse(JSON.stringify(seed)),
  };
  const log = [];
  let idCounter = 1000;
  const newId = () => `99999999-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`;

  const embed = (table, row) => {
    const byId = (t, id) => db[t].find((r) => r.id === id) ?? null;
    switch (table) {
      case 'articles':
        return {
          ...row,
          article_categories: db.article_categories.filter((l) => l.article_id === row.id).map((l) => ({ is_primary: l.is_primary, categories: byId('categories', l.category_id) })),
          article_tags: db.article_tags.filter((l) => l.article_id === row.id).map((l) => ({ tags: byId('tags', l.tag_id) })),
          featured_image: row.featured_image_id ? byId('media', row.featured_image_id) : null,
          social_image: row.social_image_id ? byId('media', row.social_image_id) : null,
          profiles: byId('profiles', row.author_id),
        };
      case 'article_categories':
        return { ...row, articles: byId('articles', row.article_id), categories: byId('categories', row.category_id) };
      case 'article_tags':
        return { ...row, articles: byId('articles', row.article_id), tags: byId('tags', row.tag_id) };
      case 'author_profiles':
        return { ...row, photo: row.photo_media_id ? byId('media', row.photo_media_id) : null };
      default:
        return row;
    }
  };

  async function handler(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const p = url.pathname;
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let body;
    if (!['GET', 'HEAD'].includes(method)) { try { body = JSON.parse(req.postData() || 'null'); } catch { body = req.postData(); } }
    const entry = { method, path: p, query: url.search, params: url.searchParams, body, t: Date.now() };
    log.push(entry);
    const headers = req.headers();
    const json = (status, payload, extra = {}) =>
      route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...extra }, body: payload === undefined ? '' : JSON.stringify(payload) });

    // Auth
    if (p === '/auth/v1/user') return json(200, opts.user);
    if (p === '/auth/v1/token') return json(200, opts.makeSession());
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });

    // Storage (public object URLs used by <img>)
    if (p.startsWith('/storage/v1/object/public/')) {
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: opts.png });
    }
    if (p.startsWith('/storage/v1/')) return json(200, {});

    if (!p.startsWith('/rest/v1/')) return json(404, { message: 'not mocked' });
    const table = p.slice('/rest/v1/'.length);
    if (!(table in db)) return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
    if (table === 'author_profiles' && !authorProfilesTable) {
      return json(404, { code: 'PGRST205', message: "Could not find the table 'public.author_profiles' in the schema cache" });
    }
    const select = url.searchParams.get('select') || '';
    if (!knowledgeSchema && (table === 'articles' || table === 'categories')) {
      const written = body && typeof body === 'object' ? JSON.stringify(Object.keys(Array.isArray(body) ? body[0] ?? {} : body)) : '';
      if (KNOWLEDGE_COLS.test(select) || KNOWLEDGE_COLS.test(written) || KNOWLEDGE_COLS.test(url.search.replace(/select=[^&]*/, ''))) {
        return json(400, { code: '42703', message: 'column does not exist' });
      }
    }

    const wantsObject = (headers['accept'] || '').includes('vnd.pgrst.object');
    const prefer = headers['prefer'] || '';

    if (method === 'GET' || method === 'HEAD') {
      let rows = applyFilters(db[table].map((r) => embed(table, r)), url.searchParams);
      // Before the knowledge-platform migration these columns do not exist, so
      // select=* must not return them (the app detects the schema from a sample row)
      if (!knowledgeSchema && (table === 'articles' || table === 'categories')) {
        rows = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !OLD_SCHEMA_HIDDEN.has(k))));
      }
      // After the migration every row has these columns (with the migration's defaults)
      if (knowledgeSchema && SCHEMA_DEFAULTS[table]) rows = rows.map((r) => ({ ...SCHEMA_DEFAULTS[table], ...r }));
      const total = rows.length;
      rows = applyOrder(rows, url.searchParams.get('order'));
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const limit = url.searchParams.has('limit') ? parseInt(url.searchParams.get('limit'), 10) : undefined;
      rows = rows.slice(offset, limit === undefined ? undefined : offset + limit);
      const range = { 'content-range': rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}` };
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, ...range } });
      if (wantsObject) {
        if (rows.length !== 1) return json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
        return json(200, rows[0], range);
      }
      return json(200, rows, range);
    }

    if (method === 'POST') {
      const items = Array.isArray(body) ? body : [body];
      const created = [];
      const conflict = url.searchParams.get('on_conflict');
      for (const item of items) {
        if (prefer.includes('resolution=merge-duplicates') && conflict) {
          const existing = db[table].find((r) => r[conflict] === item[conflict]);
          if (existing) { Object.assign(existing, item, { updated_at: new Date().toISOString() }); created.push(existing); continue; }
        }
        if (table === 'tags' && db.tags.some((t) => t.slug === item.slug)) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint "tags_slug_key"' });
        const now = new Date().toISOString();
        const row = { ...(table === 'article_categories' || table === 'article_tags' || table === 'author_profiles' ? {} : { id: newId() }), created_at: now, updated_at: now, ...item };
        db[table].push(row);
        created.push(row);
      }
      if (prefer.includes('return=representation')) return json(201, wantsObject ? created[0] : created);
      return route.fulfill({ status: 201, headers: cors });
    }

    if (method === 'PATCH') {
      const rows = applyFilters(db[table], url.searchParams);
      for (const r of rows) Object.assign(r, body, table === 'articles' || table === 'categories' || table === 'media' ? { updated_at: new Date().toISOString() } : {});
      if (prefer.includes('return=representation')) return json(200, wantsObject ? rows[0] : rows);
      return route.fulfill({ status: 204, headers: cors });
    }

    if (method === 'DELETE') {
      const rows = applyFilters(db[table], url.searchParams);
      db[table] = db[table].filter((r) => !rows.includes(r));
      if (table === 'categories') db.article_categories = db.article_categories.filter((l) => !rows.some((r) => r.id === l.category_id));
      if (table === 'tags') db.article_tags = db.article_tags.filter((l) => !rows.some((r) => r.id === l.tag_id));
      return route.fulfill({ status: 204, headers: cors });
    }

    return json(405, { message: 'method not mocked' });
  }

  return { db, log, handler };
}

module.exports = { createMock };
