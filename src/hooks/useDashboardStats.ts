/**
 * useDashboardStats — fetches real article counts from Supabase.
 *
 * Returns counts per status, recent articles and a refresh function.
 * Uses the authenticated session; RLS ensures all statuses are visible to admins.
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useDashboardStats(): UseDashboardResult {
  const [stats,          setStats]          = useState<DashboardStats>(EMPTY_STATS);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [tick,           setTick]           = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Count per status using individual filtered queries
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

        if (cancelled) return;

        // Surface any error from any query
        const firstError = [totalRes, pubRes, draftRes, schedRes, archRes, recentRes]
          .find((r) => r.error);
        if (firstError?.error) throw new Error(firstError.error.message);

        setStats({
          total:     totalRes.count  ?? 0,
          published: pubRes.count    ?? 0,
          drafts:    draftRes.count  ?? 0,
          scheduled: schedRes.count  ?? 0,
          archived:  archRes.count   ?? 0,
        });

        setRecentArticles((recentRes.data ?? []) as RecentArticle[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tick]);

  return { stats, recentArticles, loading, error, refresh };
}
