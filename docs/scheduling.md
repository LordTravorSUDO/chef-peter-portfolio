# Scheduling Articles — Server-side Mechanism

## Plan compatibility

| Vercel plan | Cron frequency | Cost |
|---|---|---|
| **Hobby (free)** | **Once per day only** | **Free — used here** |
| Pro | Every minute | $20/month |

**This project is configured for the free Vercel Hobby plan.** The cron runs
once per day at **00:00 UTC (03:00 Africa/Kampala time)**.

---

## How daily scheduling works

The cron fires at midnight UTC every night and publishes all articles whose
`scheduled_for` timestamp has arrived.

### What this means for you

| You schedule for... | It goes live at... |
|---|---|
| Any time before 03:00 Kampala on Tuesday | 03:00 Kampala Tuesday (that same night) |
| 09:00 Kampala on Tuesday | 03:00 Kampala Wednesday (next night) |
| 22:00 Kampala on Friday | 03:00 Kampala Saturday (that night, ~5 hrs later) |

**Tip:** To publish on a specific day, schedule the article for any time between
00:00 and 02:59 Kampala on that day. The cron fires at 03:00 and will publish it.

The article is **never published before** its `scheduled_for` time — the Postgres
function checks `scheduled_for <= NOW()` strictly. The only delay is that
publication happens at the cron execution time (03:00 Kampala), not the exact
minute you specified.

### For more precise scheduling (optional, free)

Add Supabase pg_cron (free, see below) alongside the Vercel Cron. pg_cron runs
inside your database every minute. Both schedulers are idempotent — running both
creates no duplicates.

---

## Architecture

```
[Admin editor]
  └── scheduleArticle(id, scheduledFor)
        └── UPDATE articles SET status='scheduled', scheduled_for=<UTC ISO>
              └── articles_log_event trigger → article_events (event_type='scheduled')

[Every day at 00:00 UTC — Vercel Hobby Cron]
  └── POST /api/cron/publish-scheduled  (Authorization: Bearer CRON_SECRET)
        └── POST /rest/v1/rpc/publish_scheduled_articles
              └── UPDATE articles SET status='published' WHERE scheduled_for <= NOW()
              └── INSERT article_events (event_type='published', actor_id=NULL)
              └── INSERT scheduler_runs (published_count, published_ids, run_status)
```

---

## Idempotency

The `publish_scheduled_articles()` Postgres function is safe to call multiple
times. It only acts on articles where `status = 'scheduled' AND scheduled_for <= NOW()`.
Once published, an article never matches again. Each run is logged in `scheduler_runs`.

---

## Timezone handling

- All `scheduled_for` values are stored as `TIMESTAMPTZ` (UTC internally)
- The admin editor converts the local `datetime-local` input to a UTC ISO 8601
  string using `new Date(localValue).toISOString()` before saving
- The admin editor displays both your local time and the UTC equivalent
- Postgres `NOW()` is UTC — comparisons are always UTC-to-UTC
- Uganda is UTC+3 (Africa/Kampala). Midnight UTC = 03:00 Kampala.

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
- `publish_scheduled_articles()` function (idempotent)
- `log_article_event()` trigger on `articles`

### Step 2 — Add environment variables in Vercel

Vercel Dashboard → Project → Settings → Environment Variables:

```
SUPABASE_URL              = https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...
CRON_SECRET               = <your random string>
```

Set for **Production** and **Preview** only. Never add to Development.

### Step 3 — Deploy to Vercel

The cron job in `vercel.json` is configured as:

```json
"crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "0 0 * * *" }]
```

`0 0 * * *` means: at minute 0, hour 0 (midnight), every day. This is valid on
the Vercel Hobby free plan.

The cron only runs on deployed Vercel environments — not in local development.

### Step 4 — Run the SQL tests

In Supabase SQL Editor, run:
```
supabase/tests/scheduler_workflow.sql
```

All 10 tests should print PASS.

### Step 5 — End-to-end verification (Hobby plan)

1. Create an article, set `scheduled_for` to any time before 03:00 Kampala today
   (i.e. before midnight UTC today)
2. Save the article — it should show "Scheduled" status
3. Wait until after midnight UTC (03:00 Kampala)
4. Refresh the articles list — the article should show "Published"
5. Check `scheduler_runs` in Supabase Table Editor — a successful run should appear

---

## Optional: pg_cron for hourly precision (free)

If you want articles to publish within one hour of their scheduled time, enable
Supabase pg_cron. It runs inside Postgres and is free on all Supabase plans.

### Enable pg_cron

Supabase Dashboard → Database → Extensions → enable `pg_cron`.

### Schedule the function (runs every hour)

```sql
SELECT cron.schedule(
  'publish-scheduled-articles-hourly',
  '0 * * * *',        -- top of every hour
  $$ SELECT public.publish_scheduled_articles('pg_cron') $$
);
```

For every minute (maximum precision):
```sql
SELECT cron.schedule(
  'publish-scheduled-articles-minutely',
  '* * * * *',        -- every minute
  $$ SELECT public.publish_scheduled_articles('pg_cron') $$
);
```

Verify:
```sql
SELECT jobid, jobname, schedule, active FROM cron.job;
```

To remove:
```sql
SELECT cron.unschedule('publish-scheduled-articles-hourly');
```

> **Both Vercel Cron AND pg_cron can run at the same time.** The function is
> idempotent — double-running creates no duplicates, only a second log entry.
> Using both gives redundancy: if one fails, the other still publishes.

---

## Failure handling and retry

If the scheduler function fails:

1. The error is logged in `scheduler_runs.error_message` with `run_status='error'`
2. The article stays in `scheduled` status — it is never corrupted or lost
3. The next cron execution picks it up automatically
4. No manual intervention is needed

Check for failures:
```sql
SELECT run_at, run_status, published_count, error_message
FROM public.scheduler_runs
WHERE run_status = 'error'
ORDER BY run_at DESC
LIMIT 10;
```

### Manual trigger (for testing or recovery)

Trigger the endpoint directly from a browser or curl:
```bash
curl -X POST "https://your-deployment.vercel.app/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET"
```

Or from the Supabase SQL Editor:
```sql
SELECT public.publish_scheduled_articles('manual');
```

Expected API response:
```json
{ "status": "success", "published_count": 1, "published_ids": ["..."], "triggered_by": "manual" }
```
