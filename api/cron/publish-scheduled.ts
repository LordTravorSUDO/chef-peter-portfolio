/**
 * Vercel Cron Job — Scheduled Article Publisher
 * Path: /api/cron/publish-scheduled
 * Schedule: every minute (see vercel.json crons block)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES:
 *   Calls the `publish_scheduled_articles()` Postgres function, which:
 *     1. Finds all articles with status='scheduled' AND scheduled_for <= NOW()
 *     2. Updates their status to 'published' and clears scheduled_for
 *     3. Logs the result to the scheduler_runs table
 *     4. Logs an article_event for each published article
 *     5. Returns a JSON summary of what was published
 *
 * IDEMPOTENCY:
 *   Re-running this endpoint is safe. The Postgres function only acts on
 *   articles that are STILL in 'scheduled' status. Already-published articles
 *   are never touched again.
 *
 * AUTHENTICATION:
 *   The CRON_SECRET environment variable must be set in Vercel.
 *   Vercel Cron automatically sends:
 *     Authorization: Bearer <CRON_SECRET>
 *   This endpoint rejects any request without that header.
 *
 * TIMEZONE:
 *   All comparisons are done in UTC (TIMESTAMPTZ in Postgres). The UI stores
 *   the user's local datetime as a UTC ISO 8601 string. Postgres NOW() is UTC.
 *   There is no ambiguity.
 *
 * SECURITY:
 *   Uses SUPABASE_SERVICE_ROLE_KEY — a server-only secret (no VITE_ prefix).
 *   It bypasses RLS and is required to call the SECURITY DEFINER function.
 *   This key must NEVER appear in browser-bundled code.
 *
 * ENVIRONMENT VARIABLES REQUIRED (add in Vercel Dashboard):
 *   SUPABASE_URL              — same value as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API → service_role
 *   CRON_SECRET               — any strong random string, e.g. openssl rand -hex 32
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SchedulerResult {
  status:           string;
  published_count?: number;
  published_ids?:   string[];
  run_id?:          string;
  error?:           string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // ── Method guard ──────────────────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Authorisation — Vercel Cron sends the CRON_SECRET automatically ──────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Configuration error — log but don't expose the detail
    console.error('[scheduler] CRON_SECRET environment variable is not set');
    res.status(500).json({ error: 'Scheduler is not configured correctly' });
    return;
  }

  const authHeader = (req.headers['authorization'] ?? '') as string;
  const isVercelInternal = authHeader === `Bearer ${cronSecret}`;
  const isManualWithSecret = req.query['secret'] === cronSecret;

  if (!isVercelInternal && !isManualWithSecret) {
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

  // Determine trigger type
  const triggeredBy = isManualWithSecret ? 'manual' : 'cron';

  // ── Call the idempotent Postgres scheduler function ───────────────────────
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/publish_scheduled_articles`;

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
        detail:  errBody,
      });
      return;
    }

    const result = await rpcRes.json() as SchedulerResult;

    // Log summary to Vercel function logs (visible in Vercel Dashboard)
    if (result.status === 'error') {
      console.error('[scheduler] Postgres function returned error:', result.error);
    } else {
      console.log(
        `[scheduler] Run complete — published: ${result.published_count ?? 0}`,
        result.published_ids?.length
          ? `IDs: ${result.published_ids.join(', ')}`
          : '(none)',
      );
    }

    res.status(200).json({
      ...result,
      triggered_by: triggeredBy,
      timestamp:    new Date().toISOString(),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scheduler] Fetch error:', message);
    res.status(500).json({ status: 'error', error: message });
  }
}
