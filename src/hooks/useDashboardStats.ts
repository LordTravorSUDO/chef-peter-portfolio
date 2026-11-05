/**
 * useDashboardStats — CMS dashboard data from Supabase.
 *
 * Counts per status, recently updated, recently published, upcoming
 * scheduled articles, a category overview and a short "needs attention" list.
 * Uses the admin session; RLS lets admins see every status.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ArticleStatus } from '../types/database';

export interface DashboardStats {
  total:     number;
  published: number;
  drafts:    number;
  scheduled: number;
  archived:  number;
}

export interface RecentArticle {
  id:            string;
  title:         string;
  status:        ArticleStatus;
  updated_at:    string;
  published_at:  string | null;
  scheduled_for: string | null;
  slug:          string;
}

export interface CategoryOverview {
  id:        string;
  name:      string;
  slug:      string;
  published: number;
  total:     number;
}

export interface AttentionItem {
  id:    string;
  title: string;
  issue: string;
}

export interface UseDashboardResult {
  stats:              DashboardStats;
  recentArticles:     RecentArticle[];
  recentlyPublished:  RecentArticle[];
  upcoming:           RecentArticle[];
  categories:         CategoryOverview[];
  uncategorised:      number;
  attention:          AttentionItem[];
  loading:            boolean;
  error:              string | null;
  refresh:            () => void;
}

const EMPTY_STATS: DashboardStats = { total: 0, published: 0, drafts: 0, scheduled: 0, archived: 0 };
const COLS = 'id, title, status, updated_at, published_at, scheduled_for, slug';

export function useDashboardStats(): UseDashboardResult {
  const [stats,             setStats]             = useState<DashboardStats>(EMPTY_STATS);
  const [recentArticles,    setRecentArticles]    = useState<RecentArticle[]>([]);
  const [recentlyPublished, setRecentlyPublished] = useState<RecentArticle[]>([]);
  const [upcoming,          setUpcoming]          = useState<RecentArticle[]>([]);
  const [categories,        setCategories]        = useState<CategoryOverview[]>([]);
  const [uncategorised,     setUncategorised]     = useState(0);
  const [attention,         setAttention]         = useState<AttentionItem[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [tick,              setTick]              = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const head = { count: 'exact' as const, head: true };
        const [totalRes, pubRes, draftRes, schedRes, archRes, recentRes, publishedRes, upcomingRes, catsRes, linksRes, liveRes] = await Promise.all([
          supabase.from('articles').select('id', head),
          supabase.from('articles').select('id', head).eq('status', 'published'),
          supabase.from('articles').select('id', head).eq('status', 'draft'),
          supabase.from('articles').select('id', head).eq('status', 'scheduled'),
          supabase.from('articles').select('id', head).eq('status', 'archived'),
          supabase.from('articles').select(COLS).order('updated_at', { ascending: false }).limit(6),
          supabase.from('articles').select(COLS).eq('status', 'published').order('published_at', { ascending: false }).limit(5),
          supabase.from('articles').select(COLS).eq('status', 'scheduled').order('scheduled_for', { ascending: true }).limit(5),
          supabase.from('categories').select('*'),
          supabase.from('article_categories').select('article_id, category_id, articles ( status )'),
          // Published articles, checked for missing essentials
          supabase.from('articles').select('id, title, excerpt, featured_image_id, meta_description').eq('status', 'published').limit(200),
        ]);
        if (cancelled) return;

        const firstError = [totalRes, pubRes, draftRes, schedRes, archRes, recentRes, publishedRes, upcomingRes, catsRes, linksRes, liveRes].find((r) => r.error);
        if (firstError?.error) throw new Error(firstError.error.message);

        setStats({
          total:     totalRes.count ?? 0,
          published: pubRes.count   ?? 0,
          drafts:    draftRes.count ?? 0,
          scheduled: schedRes.count ?? 0,
          archived:  archRes.count  ?? 0,
        });
        setRecentArticles((recentRes.data ?? []) as RecentArticle[]);
        setRecentlyPublished((publishedRes.data ?? []) as RecentArticle[]);
        setUpcoming((upcomingRes.data ?? []) as RecentArticle[]);

        // Category overview
        const links = (linksRes.data ?? []) as unknown as Array<{ article_id: string; category_id: string; articles: { status: string } | null }>;
        const cats = ((catsRes.data ?? []) as Array<{ id: string; name: string; slug: string; sort_order?: number; is_active?: boolean }>)
          .filter((c) => c.is_active !== false)
          .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.name.localeCompare(b.name));
        setCategories(cats.map((c) => {
          const rows = links.filter((l) => l.category_id === c.id);
          return { id: c.id, name: c.name, slug: c.slug, total: rows.length, published: rows.filter((r) => r.articles?.status === 'published').length };
        }));
        const linkedIds = new Set(links.map((l) => l.article_id));

        // Needs attention (published articles only — what visitors see)
        const live = (liveRes.data ?? []) as Array<{ id: string; title: string; excerpt: string; featured_image_id: string | null; meta_description: string | null }>;
        const issues: AttentionItem[] = [];
        for (const a of live) {
          if (!linkedIds.has(a.id)) issues.push({ id: a.id, title: a.title, issue: 'No category' });
          else if (!a.featured_image_id) issues.push({ id: a.id, title: a.title, issue: 'No featured image' });
          else if (!a.excerpt?.trim()) issues.push({ id: a.id, title: a.title, issue: 'No introduction (excerpt)' });
        }
        setUncategorised(live.filter((a) => !linkedIds.has(a.id)).length);
        setAttention(issues.slice(0, 6));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tick]);

  return { stats, recentArticles, recentlyPublished, upcoming, categories, uncategorised, attention, loading, error, refresh };
}
