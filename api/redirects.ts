/**
 * GET /api/redirects — Returns active redirect rules as JSON.
 *
 * Called by the client-side 404 handler to resolve old article paths to
 * their new destinations. Also used for testing.
 *
 * IMPORTANT: This API is read-only and public. It only exposes active
 * redirects with from_path and to_path — no article content is exposed.
 *
 * For production, redirect rules should also be added to vercel.json
 * `redirects` for true server-side 3xx responses. This API is the
 * fallback for rules not yet in vercel.json.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RedirectRow {
  from_path:   string;
  to_path:     string;
  status_code: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    res.status(200).json([]);
    return;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/redirects`);
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('select',    'from_path,to_path,status_code');
  url.searchParams.set('limit',     '500');

  try {
    const apiRes = await fetch(url.toString(), {
      headers: {
        apikey:        serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept:        'application/json',
      },
    });
    if (!apiRes.ok) throw new Error(`${apiRes.status}`);
    const rows = await apiRes.json() as RedirectRow[];

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).json(rows);
  } catch {
    res.status(200).json([]);
  }
}
