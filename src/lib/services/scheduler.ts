/**
 * Scheduler service — read scheduler run history and trigger manual runs.
 *
 * Admin-only reads. All writes are done server-side by the database function
 * called from the cron endpoint. This file only reads.
 */

import { supabase } from '../supabase';

export interface SchedulerRun {
  id:               string;
  run_at:           string;
  published_count:  number;
  published_ids:    string[];
  error_message:    string | null;
  run_status:       'success' | 'error' | 'partial';
  triggered_by:     'cron' | 'manual' | 'pg_cron';
}

export interface ArticleEvent {
  id:          string;
  article_id:  string;
  event_type:  string;
  actor_id:    string | null;
  payload:     Record<string, unknown>;
  created_at:  string;
}

/** Fetch the most recent scheduler runs (admin only). */
export async function getSchedulerRuns(limit = 20): Promise<SchedulerRun[]> {
  const { data, error } = await supabase
    .from('scheduler_runs')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getSchedulerRuns: ${error.message}`);
  return (data ?? []) as SchedulerRun[];
}

/** Fetch article lifecycle events for a specific article (admin only). */
export async function getArticleEvents(articleId: string): Promise<ArticleEvent[]> {
  const { data, error } = await supabase
    .from('article_events')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`getArticleEvents: ${error.message}`);
  return (data ?? []) as ArticleEvent[];
}

/** Count articles currently in 'scheduled' status (for the dashboard). */
export async function getScheduledCount(): Promise<number> {
  const { count, error } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled');

  if (error) return 0;
  return count ?? 0;
}

// Manual publish runs are intentionally NOT available from browser code: the
// cron endpoint requires CRON_SECRET, which must never reach the browser.
// Run it server-side instead — see the header of api/cron/publish-scheduled.ts.
