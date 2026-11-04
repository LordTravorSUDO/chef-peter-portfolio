-- =============================================================================
-- SCHEDULER — publish_scheduled_articles() and article_events tests
-- =============================================================================
-- Verifies migration 20261104195708_scheduler.sql.
--
-- Runs as one DO block that ends with RAISE EXCEPTION, so every article,
-- scheduler_runs row, article_events row and the temporary failure-injection
-- trigger it creates are rolled back. Requires an active admin profile.
--
-- Roles are exercised exactly as Supabase uses them:
--   service_role  — the Vercel cron endpoint (SUPABASE_SERVICE_ROLE_KEY)
--   authenticated — signed-in users (admin = the active admin's JWT subject)
--   anon          — public visitors
--
-- Result: "SCHEDULER TESTS: <n> passed, <m> failed | <details>"
-- =============================================================================

DO $test$
DECLARE
  v_admin uuid;
  v_other uuid := gen_random_uuid();
  v_tag   text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  a_due uuid; a_future uuid; a_draft uuid; a_pub uuid; a_arch uuid; a_resched uuid;
  a_g uuid; a_h uuid; a_ui uuid;
  v_old_pub timestamptz := now() - interval '30 days';
  v_pub_d   timestamptz := now() - interval '10 days';
  v_res     jsonb;
  v_n       int;
  v_runs0   int;
  v_txt     text;
  v_pass    int := 0;
  v_fail    int := 0;
  v_report  text := '';
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE role = 'admin' AND is_active ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'SCHEDULER TESTS: aborted — no active admin profile'; END IF;
  SELECT count(*) INTO v_runs0 FROM public.scheduler_runs;

  -- ---------------------------------------------------------------- fixtures
  INSERT INTO public.articles (slug, title, author_id, status, scheduled_for, published_at, created_at)
  VALUES ('t-due-'||v_tag,     'Due',         v_admin, 'scheduled', now() - interval '1 hour', NULL,       now() - interval '2 days') RETURNING id INTO a_due;
  INSERT INTO public.articles (slug, title, author_id, status, scheduled_for, published_at, created_at)
  VALUES ('t-future-'||v_tag,  'Future',      v_admin, 'scheduled', now() + interval '1 day',  NULL,       now() - interval '2 days') RETURNING id INTO a_future;
  INSERT INTO public.articles (slug, title, author_id, status, created_at)
  VALUES ('t-draft-'||v_tag,   'Draft',       v_admin, 'draft',     now() - interval '2 days') RETURNING id INTO a_draft;
  INSERT INTO public.articles (slug, title, author_id, status, published_at, created_at)
  VALUES ('t-pub-'||v_tag,     'Published',   v_admin, 'published', v_pub_d,                 now() - interval '20 days') RETURNING id INTO a_pub;
  INSERT INTO public.articles (slug, title, author_id, status, created_at)
  VALUES ('t-arch-'||v_tag,    'Archived',    v_admin, 'archived',  now() - interval '2 days') RETURNING id INTO a_arch;
  -- previously published, unpublished, then rescheduled (published_at preserved)
  INSERT INTO public.articles (slug, title, author_id, status, scheduled_for, published_at, created_at)
  VALUES ('t-resched-'||v_tag, 'Rescheduled', v_admin, 'scheduled', now() - interval '2 hours', v_old_pub, now() - interval '40 days') RETURNING id INTO a_resched;

  -- ---------------------------------------------------------------- execution permissions
  -- T1 anonymous cannot execute
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM public.publish_scheduled_articles('cron');
    v_txt := 'allowed';
  EXCEPTION WHEN insufficient_privilege THEN v_txt := 'denied';
            WHEN OTHERS THEN v_txt := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_txt = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T1 anon execute: %s (expect denied); ', v_txt);

  -- T2 signed-in admin (authenticated role) cannot execute either
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.publish_scheduled_articles('cron');
    v_txt := 'allowed';
  EXCEPTION WHEN insufficient_privilege THEN v_txt := 'denied';
            WHEN OTHERS THEN v_txt := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  IF v_txt = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T2 authenticated execute: %s (expect denied); ', v_txt);

  -- ---------------------------------------------------------------- first scheduler run (service role)
  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles('cron');
  RESET ROLE;

  -- T3 success, exactly the two due articles reported
  IF v_res->>'status' = 'success' AND (v_res->>'published_count')::int = 2
     AND (SELECT array_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_res->'published_ids') x)
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY[a_due::text, a_resched::text]) x)
  THEN v_pass := v_pass + 1; v_txt := 'ok'; ELSE v_fail := v_fail + 1; v_txt := v_res::text; END IF;
  v_report := v_report || format('T3 service_role run reports 2 due (A, F): %s; ', v_txt);

  -- T4 due article published correctly
  SELECT count(*) INTO v_n FROM public.articles
   WHERE id = a_due AND status = 'published' AND published_at IS NOT NULL
     AND published_at <= now() AND scheduled_for IS NULL;
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T4 due -> published, scheduled_for cleared: %s; ', v_n = 1);

  -- T5 future article untouched
  SELECT count(*) INTO v_n FROM public.articles WHERE id = a_future AND status = 'scheduled' AND scheduled_for > now();
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T5 future stays scheduled: %s; ', v_n = 1);

  -- T6 draft / published / archived untouched (published_at of the published one unchanged)
  SELECT count(*) INTO v_n FROM public.articles
   WHERE (id = a_draft AND status = 'draft' AND published_at IS NULL)
      OR (id = a_pub   AND status = 'published' AND published_at = v_pub_d)
      OR (id = a_arch  AND status = 'archived');
  IF v_n = 3 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T6 draft/published/archived untouched: %s/3; ', v_n);

  -- T7 previously-published, rescheduled article keeps its original published_at
  SELECT count(*) INTO v_n FROM public.articles WHERE id = a_resched AND status = 'published' AND published_at = v_old_pub;
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T7 rescheduled keeps original published_at: %s; ', v_n = 1);

  -- T8 exactly one 'published' event per published article, system actor; none for others
  SELECT count(*) INTO v_n FROM public.article_events WHERE article_id = a_due AND event_type = 'published' AND actor_id IS NULL;
  SELECT v_n * 10 + count(*) INTO v_n FROM public.article_events WHERE article_id = a_resched AND event_type = 'published' AND actor_id IS NULL;
  SELECT v_n * 10 + count(*) INTO v_n FROM public.article_events WHERE article_id IN (a_future, a_draft, a_pub, a_arch);
  IF v_n = 110 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T8 one event each for A and F, none for others: %s (expect 110); ', v_n);

  -- ---------------------------------------------------------------- repeated execution
  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles('manual');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.article_events WHERE article_id IN (a_due, a_resched);
  IF v_res->>'status' = 'success' AND (v_res->>'published_count')::int = 0 AND v_n = 2
  THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T9 second run publishes 0, events still 2: count=%s events=%s; ', v_res->>'published_count', v_n);

  SELECT count(*) INTO v_n FROM public.scheduler_runs WHERE run_status = 'success';
  IF v_n - v_runs0 >= 2 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T10 both runs logged in scheduler_runs: %s new; ', v_n - v_runs0);

  -- ---------------------------------------------------------------- invalid triggered_by
  INSERT INTO public.articles (slug, title, author_id, status, scheduled_for, created_at)
  VALUES ('t-g-'||v_tag, 'G', v_admin, 'scheduled', now() - interval '1 hour', now() - interval '2 days') RETURNING id INTO a_g;

  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles('hacker');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.articles WHERE id = a_g AND status = 'scheduled';
  IF v_res->>'status' = 'error' AND v_n = 1
     AND EXISTS (SELECT 1 FROM public.scheduler_runs WHERE run_status = 'error' AND triggered_by = 'manual' AND error_message LIKE 'Invalid triggered_by%hacker%')
  THEN v_pass := v_pass + 1; v_txt := 'rejected, logged, nothing published'; ELSE v_fail := v_fail + 1; v_txt := v_res::text; END IF;
  v_report := v_report || format('T11 invalid triggered_by: %s; ', v_txt);

  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles(NULL);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.articles WHERE id = a_g AND status = 'scheduled';
  IF v_res->>'status' = 'error' AND v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T12 NULL triggered_by rejected: %s; ', v_res->>'status');

  -- ---------------------------------------------------------------- failure is atomic, then recovery
  INSERT INTO public.articles (slug, title, author_id, status, scheduled_for, created_at)
  VALUES ('t-h-fail-'||v_tag, 'H', v_admin, 'scheduled', now() - interval '1 hour', now() - interval '2 days') RETURNING id INTO a_h;
  -- temporary trigger that makes publishing article H fail (rolled back with everything else)
  EXECUTE $f$CREATE FUNCTION public.__test_fail_publish() RETURNS trigger LANGUAGE plpgsql AS $b$
    BEGIN IF NEW.slug LIKE 't-h-fail-%' AND NEW.status = 'published' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $b$$f$;
  EXECUTE 'CREATE TRIGGER __test_fail_publish BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.__test_fail_publish()';

  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles('cron');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.articles WHERE id IN (a_g, a_h) AND status = 'scheduled';
  IF v_res->>'status' = 'error' AND v_res->>'error' LIKE '%injected failure%' AND v_n = 2
     AND NOT EXISTS (SELECT 1 FROM public.article_events WHERE article_id IN (a_g, a_h))
     AND EXISTS (SELECT 1 FROM public.scheduler_runs WHERE run_status = 'error' AND triggered_by = 'cron' AND error_message LIKE '%injected failure%')
  THEN v_pass := v_pass + 1; v_txt := 'error returned, G and H both still scheduled, no events, error logged'; ELSE v_fail := v_fail + 1; v_txt := v_res::text || ' scheduled=' || v_n; END IF;
  v_report := v_report || format('T13 failure is atomic: %s; ', v_txt);

  EXECUTE 'DROP TRIGGER __test_fail_publish ON public.articles';
  EXECUTE 'DROP FUNCTION public.__test_fail_publish()';
  SET LOCAL ROLE service_role;
  v_res := public.publish_scheduled_articles('cron');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.articles WHERE id IN (a_g, a_h) AND status = 'published';
  IF v_res->>'status' = 'success' AND (v_res->>'published_count')::int = 2 AND v_n = 2 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T14 recovery run publishes G and H: count=%s; ', v_res->>'published_count');

  -- ---------------------------------------------------------------- admin UI status changes (trigger)
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.articles SET status = 'published', published_at = now() WHERE id = a_draft;   -- publishArticle()
  UPDATE public.articles SET title = 'Edited title' WHERE id = a_pub;                          -- content-only save
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.article_events WHERE article_id = a_draft AND event_type = 'published' AND actor_id = v_admin;
  SELECT v_n * 10 + count(*) INTO v_n FROM public.article_events WHERE article_id = a_pub;
  IF v_n = 10 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T15 admin publish = 1 event with admin actor; content edit = 0 events: %s (expect 10); ', v_n);

  INSERT INTO public.articles (slug, title, author_id, status, created_at)
  VALUES ('t-ui-'||v_tag, 'UI', v_admin, 'draft', now() - interval '2 days') RETURNING id INTO a_ui;
  SET LOCAL ROLE authenticated;
  UPDATE public.articles SET status = 'scheduled', scheduled_for = now() + interval '3 days' WHERE id = a_ui;  -- scheduleArticle()
  UPDATE public.articles SET status = 'draft', scheduled_for = NULL WHERE id = a_ui;                            -- cancelSchedule()
  RESET ROLE;
  SELECT string_agg(event_type, ',' ORDER BY created_at, event_type) INTO v_txt FROM public.article_events WHERE article_id = a_ui;
  IF v_txt IN ('scheduled,schedule_cancelled', 'schedule_cancelled,scheduled') AND (SELECT count(*) FROM public.article_events WHERE article_id = a_ui) = 2
  THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T16 schedule + cancel = 2 events: %s; ', v_txt);

  -- ---------------------------------------------------------------- audit tables are admin-only
  SET LOCAL ROLE authenticated;   -- still the admin's claims
  SELECT (SELECT count(*) FROM public.scheduler_runs) * 1000 + (SELECT count(*) FROM public.article_events) INTO v_n;
  RESET ROLE;
  IF v_n >= 1001 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T17 admin can read both audit tables: %s; ', v_n >= 1001);

  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.scheduler_runs) + (SELECT count(*) FROM public.article_events) INTO v_n;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T18 non-admin reads 0 audit rows: %s; ', v_n);

  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.scheduler_runs (run_status, triggered_by) VALUES ('success', 'manual');
    v_txt := 'allowed';
  EXCEPTION WHEN insufficient_privilege THEN v_txt := 'denied';
            WHEN OTHERS THEN v_txt := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_txt = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T19 authenticated cannot write scheduler_runs: %s; ', v_txt);

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.article_events;
    v_txt := 'allowed (' || v_n || ' rows)';
  EXCEPTION WHEN insufficient_privilege THEN v_txt := 'denied';
            WHEN OTHERS THEN v_txt := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_txt = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T20 anon cannot read audit tables: %s; ', v_txt);

  RAISE EXCEPTION 'SCHEDULER TESTS: % passed, % failed | %(all changes rolled back)', v_pass, v_fail, v_report;
END $test$;
