/**
 * useDashboardStats — fetches real article counts from Supabase.
 *
 * Returns counts per status, recent articles and a refresh function.
 * Uses the authenticated session; RLS ensures all statuses are visible to admins.
 */

import { useCallback } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { invalidate } from '../lib/cache';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
  total:     number;
  published: number;
  drafts:    number;
  scheduled: number;
  archived:  number;
}

export interface RecentArticle {
  id:          string;
  title:       string;
  status:      string;
  updated_at:  string;
  slug:        string;
}

export interface UseDashboardResult {
  stats:          DashboardStats;
  recentArticles: RecentArticle[];
  loading:        boolean;
  error:          string | null;
  refresh:        () => void;
}

const EMPTY_STATS: DashboardStats = {
  total: 0, published: 0, drafts: 0, scheduled: 0, archived: 0,
};

async function fetchDashboard(): Promise<{ stats: DashboardStats; recentArticles: RecentArticle[] }> {
  // Five head-only count queries (no rows transferred) + 8 recent rows, in parallel.
  const [totalRes, pubRes, draftRes, schedRes, archRes, recentRes] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    supabase.from('articles')
      .select('id, title, status, updated_at, slug')
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);

  const firstError = [totalRes, pubRes, draftRes, schedRes, archRes, recentRes].find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);

  return {
    stats: {
      total:     totalRes.count  ?? 0,
      published: pubRes.count    ?? 0,
      drafts:    draftRes.count  ?? 0,
      scheduled: schedRes.count  ?? 0,
      archived:  archRes.count   ?? 0,
    },
    recentArticles: (recentRes.data ?? []) as RecentArticle[],
  };
}

export function useDashboardStats(): UseDashboardResult {
  // Cached: revisiting the dashboard shows the last numbers instantly and
  // refreshes them in the background. Article writes invalidate the cache.
  const { data, error, loading, retry } = useCachedQuery('dashboard', fetchDashboard);
  const refresh = useCallback(() => { invalidate('dashboard'); retry(); }, [retry]);
  return {
    stats:          data?.stats ?? EMPTY_STATS,
    recentArticles: data?.recentArticles ?? [],
    loading,
    error,
    refresh,
  };
}
