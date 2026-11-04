-- =============================================================================
-- Migration: Scheduled publishing infrastructure
-- =============================================================================
-- Run AFTER all previous migrations (20260101000007_redirects.sql).
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. scheduler_runs — idempotent log of every cron execution
-- ---------------------------------------------------------------------------
-- Every time the scheduler runs (via Vercel Cron or pg_cron), it inserts a
-- row here. This provides:
--   a) An audit trail of scheduler executions
--   b) A record of which articles were published in each run
--   c) A safe retry mechanism — re-running the same cron job is idempotent
--      because the SQL function only publishes articles whose scheduled_for
--      is in the past AND whose status is still 'scheduled'
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ISO 8601 timestamp when the scheduler job started
  run_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Number of articles published in this run
  published_count  INT          NOT NULL DEFAULT 0,
  -- UUIDs of articles published in this run (for audit trail)
  published_ids    UUID[]       NOT NULL DEFAULT '{}',
  -- NULL = success, non-null = error message
  error_message    TEXT,
  -- 'success' | 'error' | 'partial'
  run_status       TEXT         NOT NULL DEFAULT 'success'
                                CHECK (run_status IN ('success', 'error', 'partial')),
  -- Which trigger initiated this run
  triggered_by     TEXT         NOT NULL DEFAULT 'cron'
                                CHECK (triggered_by IN ('cron', 'manual', 'pg_cron'))
);

COMMENT ON TABLE public.scheduler_runs IS
  'Audit log of scheduled-publishing cron job executions. Read by the admin dashboard.';

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_at ON public.scheduler_runs(run_at DESC);

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

-- Admins can read the scheduler log
CREATE POLICY "Admins read scheduler runs"
  ON public.scheduler_runs FOR SELECT
  USING (public.is_admin());

-- The scheduler inserts via service-role key (bypasses RLS)
-- No client INSERT policy needed

-- ---------------------------------------------------------------------------
-- 2. article_events — publication, unpublish, archive, restore events
-- ---------------------------------------------------------------------------
-- Records meaningful state-change events for each article.
-- Provides a richer audit trail than revision history alone.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.article_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID         NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  event_type  TEXT         NOT NULL
              CHECK (event_type IN (
                'published', 'unpublished', 'archived', 'scheduled',
                'schedule_cancelled', 'restored', 'deleted'
              )),
  -- Who triggered the event (NULL = triggered by scheduler/system)
  actor_id    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Snapshot of relevant state at the time of the event
  payload     JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.article_events IS
  'Audit log of publication lifecycle events per article.';

CREATE INDEX IF NOT EXISTS idx_article_events_article ON public.article_events(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_events_type    ON public.article_events(event_type);

ALTER TABLE public.article_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read article events"
  ON public.article_events FOR SELECT
  USING (public.is_admin());

-- No direct INSERT from client — events are written server-side

-- ---------------------------------------------------------------------------
-- 3. publish_scheduled_articles() — idempotent scheduler function
-- ---------------------------------------------------------------------------
-- Called by:
--   a) Vercel Cron (via api/cron/publish-scheduled.ts)
--   b) pg_cron (see setup instructions below)
--
-- IDEMPOTENCY:
--   This function is safe to call multiple times. It only acts on articles
--   where status = 'scheduled' AND scheduled_for <= NOW(). Once an article
--   is published, it no longer matches the WHERE clause, so re-running the
--   function has no effect on already-published articles.
--
-- ATOMICITY:
--   The entire function runs in a single transaction. If any part fails,
--   all changes are rolled back (no partial publishing).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.publish_scheduled_articles(
  p_triggered_by TEXT DEFAULT 'cron'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_article_ids  UUID[];
  v_count        INT := 0;
  v_run_id       UUID;
  v_error        TEXT;
BEGIN
  -- Find all articles due for publication
  SELECT ARRAY_AGG(id)
  INTO   v_article_ids
  FROM   public.articles
  WHERE  status       = 'scheduled'
    AND  scheduled_for <= NOW();

  -- Nothing to publish — log a successful empty run and return
  IF v_article_ids IS NULL OR array_length(v_article_ids, 1) = 0 THEN
    INSERT INTO public.scheduler_runs (published_count, published_ids, run_status, triggered_by)
    VALUES (0, '{}', 'success', p_triggered_by)
    RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
      'run_id', v_run_id,
      'published_count', 0,
      'published_ids', '[]'::JSONB,
      'status', 'success'
    );
  END IF;

  -- Publish each due article
  UPDATE public.articles
  SET status        = 'published',
      published_at  = COALESCE(published_at, NOW()),
      scheduled_for = NULL
  WHERE id = ANY(v_article_ids)
    AND status = 'scheduled';  -- double-check to avoid race conditions

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log article_events for each published article
  INSERT INTO public.article_events (article_id, event_type, actor_id, payload)
  SELECT
    id,
    'published',
    NULL,  -- system-triggered
    jsonb_build_object(
      'previous_status', 'scheduled',
      'triggered_by', p_triggered_by,
      'published_at', NOW()
    )
  FROM public.articles
  WHERE id = ANY(v_article_ids);

  -- Log the scheduler run
  INSERT INTO public.scheduler_runs (
    published_count, published_ids, run_status, triggered_by
  )
  VALUES (v_count, v_article_ids, 'success', p_triggered_by)
  RETURNING id INTO v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'published_count', v_count,
    'published_ids', to_jsonb(v_article_ids),
    'status', 'success'
  );

EXCEPTION WHEN others THEN
  -- Log the failure — do not re-raise so the cron job gets a response
  v_error := SQLERRM;

  INSERT INTO public.scheduler_runs (
    published_count, published_ids, run_status, triggered_by, error_message
  )
  VALUES (0, COALESCE(v_article_ids, '{}'), 'error', p_triggered_by, v_error);

  RETURN jsonb_build_object(
    'status', 'error',
    'error', v_error
  );
END;
$$;

COMMENT ON FUNCTION public.publish_scheduled_articles(TEXT) IS
  'Publishes all articles whose scheduled_for <= NOW() and status = scheduled.
   Idempotent — safe to call multiple times. Returns JSON result summary.
   Logs every run to scheduler_runs and every published article to article_events.';

-- Grant to service_role (used by Vercel Cron API route)
GRANT EXECUTE ON FUNCTION public.publish_scheduled_articles(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Trigger to log article_events on manual publish/unpublish/archive
-- ---------------------------------------------------------------------------
-- Records lifecycle events that happen via the admin UI (not the scheduler).
-- The scheduler calls the function above directly; this trigger catches
-- everything else.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_article_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event TEXT;
BEGIN
  -- Determine what happened
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF   OLD.status = 'draft'      AND NEW.status = 'published'  THEN v_event := 'published';
  ELSIF OLD.status = 'published'  AND NEW.status = 'draft'     THEN v_event := 'unpublished';
  ELSIF OLD.status = 'published'  AND NEW.status = 'archived'  THEN v_event := 'archived';
  ELSIF OLD.status = 'draft'      AND NEW.status = 'archived'  THEN v_event := 'archived';
  ELSIF OLD.status = 'scheduled'  AND NEW.status = 'published' THEN v_event := 'published';
  ELSIF OLD.status = 'scheduled'  AND NEW.status = 'draft'     THEN v_event := 'schedule_cancelled';
  ELSIF OLD.status != 'scheduled' AND NEW.status = 'scheduled' THEN v_event := 'scheduled';
  ELSE RETURN NEW;
  END IF;

  INSERT INTO public.article_events (article_id, event_type, actor_id, payload)
  VALUES (
    NEW.id,
    v_event,
    auth.uid(),
    jsonb_build_object(
      'previous_status', OLD.status,
      'new_status',      NEW.status,
      'scheduled_for',   NEW.scheduled_for,
      'published_at',    NEW.published_at
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_log_event ON public.articles;
CREATE TRIGGER articles_log_event
  AFTER UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.log_article_event();

-- ---------------------------------------------------------------------------
-- 5. pg_cron setup instructions (OPTIONAL — requires pg_cron extension)
-- ---------------------------------------------------------------------------
-- Run this block separately after enabling the pg_cron extension:
--
-- STEP A: Enable pg_cron in Supabase Dashboard → Database → Extensions
-- STEP B: Run the following SQL:
--
--   SELECT cron.schedule(
--     'publish-scheduled-articles',   -- job name (must be unique)
--     '* * * * *',                    -- every minute
--     $$ SELECT public.publish_scheduled_articles('pg_cron') $$
--   );
--
--   -- Verify it was created:
--   SELECT * FROM cron.job WHERE jobname = 'publish-scheduled-articles';
--
-- IMPORTANT: This is an alternative to Vercel Cron (see api/cron/).
-- Use one or the other, not both — to avoid double-publishing.
-- ---------------------------------------------------------------------------
