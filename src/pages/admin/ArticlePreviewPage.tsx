/**
 * /admin/articles/:id/preview — Admin preview of an article as readers will see it.
 *
 * Renders the article with the public website's dark luxury theme so the
 * editor can see exactly how it will look when published. The preview is
 * admin-only (protected route) and works for articles of any status —
 * even drafts can be previewed without making them public.
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { getArticleByIdForPreview, sanitiseHtml } from '../../lib/services/articles';
import { getMediaUrl } from '../../lib/services/media';
import type { ArticleWithRelations } from '../../types/article';
import Spinner from '../../components/admin/ui/Spinner';
import Badge from '../../components/admin/ui/Badge';
import { enhanceImageHtml } from '../../components/blog/ResponsiveImage';

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala',
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function ArticlePreviewPage() {
  const { id }                 = useParams<{ id: string }>();
  const [article, setArticle]  = useState<ArticleWithRelations | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getArticleByIdForPreview(id)
      .then((data) => { if (!data) setError('Article not found.'); else setArticle(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
        <Spinner size="lg" className="border-white/30 border-t-white" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-[#A09E98]">{error ?? 'Article not found.'}</p>
          <Link to="/admin/articles" className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] hover:underline">
            ← Back to articles
          </Link>
        </div>
      </div>
    );
  }

  const featuredUrl  = article.featured_image ? getMediaUrl(article.featured_image.storage_path) : null;
  const primaryCat   = article.article_categories?.find((ac) => ac.is_primary)?.categories ?? article.article_categories?.[0]?.categories ?? null;
  const tags         = article.article_tags?.map((at) => at.tags).filter(Boolean) ?? [];

  return (
    <>
      <title>Preview: {article.title} | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Preview banner */}
      <div className="sticky top-0 z-50 bg-[#1B365D] text-white px-4 py-2.5 flex items-center justify-between text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#D99B26]" />
          <span className="font-medium">Preview mode</span>
          <Badge status={article.status} className="ml-2" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/articles/${article.id}/edit`}
            className="flex items-center gap-1.5 text-xs hover:text-[#D99B26] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to editor
          </Link>
        </div>
      </div>

      {/* Article rendering — matches the public dark theme */}
      <article className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2]">
        {/* Hero / header */}
        <header className="relative">
          {featuredUrl && (
            <div className="relative h-[50vh] min-h-[300px] max-h-[500px] overflow-hidden">
              <img src={featuredUrl} alt={article.featured_image?.alt_text ?? article.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#0C0C0C]" />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-32 relative z-10 pb-12">
            {/* Category badge */}
            {primaryCat && (
              <Link
                to={`/category/${primaryCat.slug}`}
                className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] mb-4 hover:underline"
              >
                {primaryCat.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#EAE7E2] leading-tight mb-4">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-[#A09E98] font-light leading-relaxed mb-6 max-w-2xl">
                {article.excerpt}
              </p>
            )}

            {/* Meta line */}
            <div className="flex items-center gap-4 text-xs text-[#8A8A8A] font-mono uppercase tracking-wider border-b border-[#C5A059]/20 pb-4">
              <span>By {article.author_display_name}</span>
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
              <span>{article.reading_time_minutes} min read</span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="prose-content text-[#EAE7E2] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: enhanceImageHtml(sanitiseHtml(article.body)) }}
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#C5A059]/20">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => tag && (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    className="px-3 py-1 rounded-full text-xs font-medium text-[#A09E98] border border-[#C5A059]/30 hover:border-[#C5A059] hover:text-[#C5A059] transition"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to editor */}
          <div className="mt-12 pt-8 border-t border-[#C5A059]/20">
            <Link
              to={`/admin/articles/${article.id}/edit`}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to editor
            </Link>
          </div>
        </div>
      </article>

      {/* Preview styles matching the public theme */}
      <style>{`
        .prose-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #EAE7E2;
          margin: 1.5em 0 0.5em;
        }
        .prose-content h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 600;
          color: #EAE7E2;
          margin: 1.25em 0 0.4em;
        }
        .prose-content h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #EAE7E2;
          margin: 1em 0 0.3em;
        }
        .prose-content p {
          margin: 0.75em 0;
          color: #D5D2CD;
        }
        .prose-content ul, .prose-content ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
          color: #D5D2CD;
        }
        .prose-content ul { list-style: disc; }
        .prose-content ol { list-style: decimal; }
        .prose-content li { margin: 0.25em 0; }
        .prose-content blockquote {
          border-left: 3px solid #C5A059;
          padding-left: 1em;
          margin: 1em 0;
          color: #A09E98;
          font-style: italic;
        }
        .prose-content a {
          color: #C5A059;
          text-decoration: underline;
        }
        .prose-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
        .prose-content hr {
          border: none;
          border-top: 1px solid rgba(197, 160, 89, 0.2);
          margin: 1.5em 0;
        }
      `}</style>
    </>
  );
}
