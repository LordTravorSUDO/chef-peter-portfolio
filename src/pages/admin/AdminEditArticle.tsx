/**
 * /admin/articles/:id/edit — Edit an existing article.
 *
 * Loading model:
 *   - The full-page spinner is shown ONLY for the first load of an article.
 *   - After a save or a publishing action the article is refreshed silently:
 *     the editor stays mounted, so the cursor, unsaved typing and toasts are
 *     preserved. Only server-owned fields (status, published_at, updated_at,
 *     reading time …) are taken from the refreshed record.
 *   - After a revision restore the editor is deliberately re-initialised from
 *     the refreshed record, because the stored content was replaced.
 *   - Responses for an older request (or a different article ID) are ignored.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Eye } from 'lucide-react';
import { getArticleByIdAdmin } from '../../lib/services/articles';
import ArticleForm from '../../components/admin/ArticleForm';
import Spinner from '../../components/admin/ui/Spinner';
import type { ArticleWithRelations } from '../../types/article';

export default function AdminEditArticle() {
  const { id }                          = useParams<{ id: string }>();
  const [article,      setArticle]      = useState<ArticleWithRelations | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  /** Changing this re-initialises the editor (used only after a revision restore) */
  const [formVersion,  setFormVersion]  = useState(0);

  const requestSeq = useRef(0);

  /** Fetch the article. Returns the record, or null if the response is stale. */
  const fetchArticle = useCallback(async (): Promise<ArticleWithRelations | null | 'stale'> => {
    if (!id) return null;
    const seq = ++requestSeq.current;
    const data = await getArticleByIdAdmin(id);
    return seq === requestSeq.current ? data : 'stale';
  }, [id]);

  // ── Initial load (and when the route ID changes) ────────────────────────
  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setLoading(true);
    setError(null);
    setRefreshError(null);

    fetchArticle()
      .then((data) => {
        if (cancelled || data === 'stale') return;
        if (!data) setError('Article not found.');
        else setArticle(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load article.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fetchArticle]);

  // ── Silent refresh after save / publish / unpublish / schedule ──────────
  const refreshArticle = useCallback(async (): Promise<boolean> => {
    try {
      const data = await fetchArticle();
      if (data === 'stale') return false;
      if (!data) {
        setRefreshError('The article could not be found when refreshing. It may have been deleted.');
        return false;
      }
      setArticle(data);
      setRefreshError(null);
      return true;
    } catch (e) {
      setRefreshError(
        `Your changes were saved, but the latest article details could not be reloaded (${e instanceof Error ? e.message : 'unknown error'}). Reload the page to see them.`,
      );
      return false;
    }
  }, [fetchArticle]);

  const handleSaved = useCallback((_savedId: string) => {
    void refreshArticle();
  }, [refreshArticle]);

  // ── Reload the editor content (after a revision restore) ────────────────
  const handleReloadRequested = useCallback(async () => {
    if (await refreshArticle()) setFormVersion((v) => v + 1);
  }, [refreshArticle]);

  if (loading && !article) {
    return (
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-5xl space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error ?? 'Article not found.'}
        </div>
        <Link to="/admin/articles" className="text-sm text-[#4A777A] hover:underline">
          ← Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <title>Edit Article | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-[#6B7A8D]" aria-label="Breadcrumb">
        <Link to="/admin/articles" className="hover:text-[#1B365D] transition">Articles</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A2B40] font-medium truncate max-w-xs">{article.title}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B365D]">Edit article</h1>
        {article.status === 'published' && (
          <a
            href={`/articles/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#4A777A] hover:text-[#1B365D] font-medium transition border border-[#DDE3EA] px-3 py-1.5 rounded-lg"
          >
            <Eye className="w-3.5 h-3.5" /> View live
          </a>
        )}
      </div>

      {refreshError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800" role="alert">
          {refreshError}
        </div>
      )}

      {/* key changes only on a deliberate reload — never on a routine save */}
      <div key={`${article.id}:${formVersion}`}>
        <ArticleForm
          article={article}
          onSaved={handleSaved}
          onReloadRequested={handleReloadRequested}
        />
      </div>
    </div>
  );
}
