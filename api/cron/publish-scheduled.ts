/**
 * Vercel Cron Job — Scheduled Article Publisher
 * Path: /api/cron/publish-scheduled
 * Schedule: once daily at 00:00 UTC (03:00 Africa/Kampala) — see vercel.json
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCHEDULE (Vercel Hobby plan — daily cron):
 *   The job runs once every 24 hours. An article scheduled for 09:00 Kampala
 *   is published at the next run (03:00 Kampala the following day). It is
 *   never published before its scheduled time (the database function checks
 *   scheduled_for <= now()), but it can be published up to ~24 hours later.
 *   Tip: to go live on a given morning, schedule it for before 03:00 Kampala
 *   that day.
 *
 * WHAT THIS DOES:
 *   Calls the Postgres function public.publish_scheduled_articles(p_triggered_by),
 *   which publishes every article with status='scheduled' AND
 *   scheduled_for <= now(), logs the run to scheduler_runs (one
 *   article_events row per published article is written by a trigger) and
 *   returns a JSON summary. Re-running is safe (idempotent).
 *
 * AUTHENTICATION:
 *   Requires the header  Authorization: Bearer <CRON_SECRET>
 *   Vercel Cron sends it automatically when CRON_SECRET is set in the project.
 *   The secret is NOT accepted as a URL query parameter (URLs end up in logs
 *   and browser history). It is compared in constant time.
 *
 *   Manual run (server-side only, e.g. from a terminal — never from browser code):
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *       "https://<deployment>/api/cron/publish-scheduled?trigger=manual"
 *   `trigger=manual` only labels the run in scheduler_runs; it grants nothing.
 *
 * RESPONSES:
 *   200  run succeeded (body: run_id, published_count, published_ids, …)
 *   401  missing or wrong Authorization header
 *   405  method other than GET/POST
 *   500  configuration missing, database call failed, or the function
 *        reported {"status":"error"} — so a failed run is visible as a
 *        failed invocation in Vercel and is also recorded in scheduler_runs.
 *
 * ENVIRONMENT VARIABLES (server-only, no VITE_ prefix — never in the browser):
 *   SUPABASE_URL              — same value as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — only role allowed to execute the function
 *   CRON_SECRET               — any strong random string, e.g. openssl rand -hex 32
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SchedulerResult {
  status:           string;
  published_count?: number;
  published_ids?:   string[];
  run_id?:          string;
  error?:           string;
}

/** Constant-time check of the Authorization header against the expected secret. */
export function isAuthorized(authorizationHeader: string | string[] | undefined, secret: string): boolean {
  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const received = Buffer.from(header, 'utf8');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // ── Method guard ──────────────────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Authorisation — header only ───────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[scheduler] CRON_SECRET environment variable is not set');
    res.status(500).json({ error: 'Scheduler is not configured correctly' });
    return;
  }

  if (!isAuthorized(req.headers['authorization'], cronSecret)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ── Supabase service-role access ──────────────────────────────────────────
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[scheduler] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  // Label only — authentication above is identical for both
  const triggeredBy = req.query['trigger'] === 'manual' ? 'manual' : 'cron';

  // ── Call the idempotent Postgres scheduler function ───────────────────────
  const rpcUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/publish_scheduled_articles`;

  try {
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey':         serviceRoleKey,
        'Authorization':  `Bearer ${serviceRoleKey}`,
        'Content-Type':   'application/json',
        'Accept':         'application/json',
      },
      body: JSON.stringify({ p_triggered_by: triggeredBy }),
    });

    if (!rpcRes.ok) {
      const errBody = await rpcRes.text();
      console.error(`[scheduler] RPC call failed: HTTP ${rpcRes.status} — ${errBody}`);
      res.status(500).json({
        status: 'error',
        error:  `RPC call failed: HTTP ${rpcRes.status}`,
        detail: errBody,
      });
      return;
    }

    const result = await rpcRes.json() as SchedulerResult;
    const timestamp = new Date().toISOString();

    if (result.status !== 'success') {
      // The function logged the failure in scheduler_runs; surface it as a failed invocation
      console.error('[scheduler] Postgres function returned error:', result.error ?? result);
      res.status(500).json({ ...result, status: 'error', triggered_by: triggeredBy, timestamp });
      return;
    }

    console.log(
      `[scheduler] Run complete — published: ${result.published_count ?? 0}`,
      result.published_ids?.length ? `IDs: ${result.published_ids.join(', ')}` : '(none)',
    );
    res.status(200).json({ ...result, triggered_by: triggeredBy, timestamp });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scheduler] Fetch error:', message);
    res.status(500).json({ status: 'error', error: message });
  }
}
