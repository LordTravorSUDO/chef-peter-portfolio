/**
 * /admin/articles/:id/edit — Edit an existing article.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Eye } from 'lucide-react';
import { getArticleByIdAdmin, type ArticleServerState } from '../../lib/services/articles';
import ArticleForm from '../../components/admin/ArticleForm';
import Spinner from '../../components/admin/ui/Spinner';
import type { ArticleWithRelations } from '../../types/article';

export default function AdminEditArticle() {
  const { id }                   = useParams<{ id: string }>();
  const [article, setArticle]    = useState<ArticleWithRelations | null>(null);
  const [loading, setLoading]    = useState(true);
  const [error,   setError]      = useState<string | null>(null);
  // Bumped only for an explicit reload (e.g. revision restore) so the form
  // re-initialises from the database. Normal saves never remount the form.
  const [formKey, setFormKey]    = useState(0);

  const loadArticle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getArticleByIdAdmin(id);
      if (!data) setError('Article not found.');
      else { setArticle(data); setFormKey((k) => k + 1); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  // After a save/publish/unpublish the form reports what the database stored.
  // Merge it in place (keeps the "View live" link and breadcrumb current)
  // WITHOUT showing the spinner, so the editor is never unmounted mid-edit.
  const handleServerState = useCallback((state: ArticleServerState) => {
    setArticle((prev) => (prev ? { ...prev, ...state } : prev));
  }, []);

  if (loading) {
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
        <div className="flex gap-4">
          {error && error !== 'Article not found.' && (
            <button type="button" onClick={loadArticle} className="text-sm font-medium text-[#1B365D] hover:underline">
              Retry
            </button>
          )}
          <Link to="/admin/articles" className="text-sm text-[#4A777A] hover:underline">
            ← Back to articles
          </Link>
        </div>
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

      <React.Fragment key={formKey}>
        <ArticleForm article={article} onServerState={handleServerState} onReloadRequest={loadArticle} />
      </React.Fragment>
    </div>
  );
}
