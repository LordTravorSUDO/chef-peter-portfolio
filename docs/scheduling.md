# Scheduling Articles — Server-side Mechanism

## Status

**Implementation is complete.** The scheduler is implemented as a Vercel Cron job
that calls `/api/cron/publish-scheduled` every minute. It is NOT operational until
you have:

1. Applied migration `supabase/migrations/20260201000000_scheduler.sql`
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` in Vercel
3. Deployed to Vercel (crons only run on deployed environments, not in local dev)

Until step 3, scheduled articles remain private — the safe default.

---

## Architecture

```
[Admin editor]
  └── scheduleArticle(id, scheduledFor)
        └── UPDATE articles SET status='scheduled', scheduled_for=<UTC ISO>
              └── articles_log_event trigger → article_events (event_type='scheduled')

[Every minute — Vercel Cron]
  └── GET /api/cron/publish-scheduled  (Authorization: Bearer CRON_SECRET)
        └── POST /rest/v1/rpc/publish_scheduled_articles
              └── UPDATE articles SET status='published' WHERE scheduled_for <= NOW()
              └── INSERT article_events (event_type='published', actor_id=NULL)
              └── INSERT scheduler_runs (published_count, published_ids, run_status)
```

---

## Idempotency

The `publish_scheduled_articles()` function is safe to run multiple times in the
same minute (or after a retry). It only acts on articles where:
- `status = 'scheduled'`
- `scheduled_for <= NOW()`

Once an article has been published, it no longer matches the WHERE clause.
Re-running the function a second, third, or hundredth time will not corrupt
or duplicate anything. Each run is logged in `scheduler_runs`.

---

## Timezone handling

All `scheduled_for` values are stored as `TIMESTAMPTZ` in PostgreSQL — this means
UTC internally, with timezone offset preserved. The admin editor shows both the
author's local time and the equivalent UTC time.

When the editor submits a scheduled datetime, it converts the local `datetime-local`
input to a UTC ISO 8601 string using `new Date(localValue).toISOString()`. Postgres
`NOW()` is UTC. The comparison `scheduled_for <= NOW()` is always UTC-to-UTC.

There is no ambiguity.

---

## Required environment variables

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | Vercel env (server-only) | Supabase REST API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (server-only, **never browser**) | Bypasses RLS for scheduler |
| `CRON_SECRET` | Vercel env (server-only) | Authenticates cron requests |

Generate CRON_SECRET: `openssl rand -hex 32`

---

## Setup steps

### Step 1 — Apply the migration

In Supabase Dashboard → SQL Editor, run:
```
supabase/migrations/20260201000000_scheduler.sql
```

This creates:
- `scheduler_runs` table (run log)
- `article_events` table (lifecycle audit log)
- `publish_scheduled_articles()` function
- `log_article_event()` trigger on `articles`

### Step 2 — Add environment variables in Vercel

Vercel Dashboard → Project → Settings → Environment Variables:

```
SUPABASE_URL = https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...   (from Supabase → Settings → API → service_role)
CRON_SECRET = <your random string>
```

Set for **Production** and **Preview** only. Do NOT add to Development.

### Step 3 — Deploy to Vercel

The cron job in `vercel.json` only runs after a deployment:

```json
"crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" }]
```

Vercel Hobby plan supports crons running once per day. **Vercel Pro or higher is
required for minute-level cron frequency.**

> If you are on the Hobby plan, use the pg_cron option below instead.

### Step 4 — Run the tests

In Supabase SQL Editor, run:
```
supabase/tests/scheduler_workflow.sql
```

All 10 tests should print PASS.

### Step 5 — End-to-end verification

1. Create an article in the admin editor
2. Set status to "Scheduled" with a time 2 minutes in the future
3. Save the article
4. Wait 2 minutes
5. Refresh the articles list — article should now show "Published" status
6. Check `scheduler_runs` in Supabase Table Editor — a successful run should appear

---

## Alternative: pg_cron (Hobby plan / no Vercel Pro needed)

If you are on Vercel Hobby plan, use Supabase pg_cron instead:

### Enable pg_cron

In Supabase Dashboard → Database → Extensions, enable `pg_cron`.

### Schedule the function

In the SQL Editor:

```sql
SELECT cron.schedule(
  'publish-scheduled-articles',   -- job name (unique)
  '* * * * *',                    -- every minute
  $$ SELECT public.publish_scheduled_articles('pg_cron') $$
);
```

Verify:
```sql
SELECT * FROM cron.job WHERE jobname = 'publish-scheduled-articles';
```

To remove it:
```sql
SELECT cron.unschedule('publish-scheduled-articles');
```

> ⚠️ Use Vercel Cron OR pg_cron — not both. Running both would double-publish
> each scheduled article batch (though idempotency means this is harmless,
> it creates unnecessary duplicate log entries).

---

## Vercel Cron pricing

| Plan | Cron frequency | Cost |
|---|---|---|
| Hobby | Daily only (once per day) | Free |
| Pro | Every minute | $20/month |
| Enterprise | Every minute | Custom |

For a publishing platform where articles may be scheduled by hour, **Vercel Pro
($20/month) or pg_cron (free, included in Supabase) is required** for minute-level
scheduling precision.

---

## Failure handling and retry

If the scheduler function fails (Postgres error, network timeout, etc.):

1. The error is logged to `scheduler_runs.error_message` with `run_status='error'`
2. The article remains in `scheduled` status (not corrupted)
3. The next cron execution (1 minute later) retries automatically
4. No manual intervention is needed unless `scheduled_for` is more than a few
   minutes in the past and the article is still not published

To check for failures:
```sql
SELECT * FROM public.scheduler_runs
WHERE run_status = 'error'
ORDER BY run_at DESC
LIMIT 10;
```

To trigger a manual retry:
```
POST /api/cron/publish-scheduled?secret=<CRON_SECRET>
```

---

## Testing the scheduler manually (before Vercel Cron is live)

You can test the scheduler directly in the Supabase SQL Editor:

```sql
SELECT public.publish_scheduled_articles('manual');
```

Or trigger the API endpoint:
```bash
curl -X POST "https://your-deployment.vercel.app/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET"
```

Expected response:
```json
{ "status": "success", "published_count": 1, "published_ids": ["..."], "triggered_by": "manual" }
```
