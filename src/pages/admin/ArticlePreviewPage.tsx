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
import { enhanceArticleHtml, readingMinutesFromHtml } from '../../lib/knowledge/articleHtml';
import { articleTypeOf, ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import { normaliseRecipe } from '../../lib/knowledge/recipe';
import { RecipeCard, TableOfContents } from '../../components/knowledge/ArticleParts';
import { getMediaUrl } from '../../lib/services/media';
import type { ArticleWithRelations } from '../../types/article';
import Spinner from '../../components/admin/ui/Spinner';
import Badge from '../../components/admin/ui/Badge';
import { enhanceImageHtml } from '../../components/blog/ResponsiveImage';

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-cream text-ink flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-ink-soft">{error ?? 'Article not found.'}</p>
          <Link to="/admin/articles" className="font-semibold text-ink underline decoration-gold underline-offset-4">
            ← Back to articles
          </Link>
        </div>
      </div>
    );
  }

  // Same rendering pipeline as the public article page (src/pages/blog/ArticlePage.tsx)
  const featuredUrl = article.featured_image ? getMediaUrl(article.featured_image.storage_path) : null;
  const primaryCat  = article.article_categories?.find((ac) => ac.is_primary)?.categories ?? article.article_categories?.[0]?.categories ?? null;
  const tags        = article.article_tags?.map((at) => at.tags).filter(Boolean) ?? [];
  const type        = articleTypeOf(article);
  const recipe      = ARTICLE_TYPE_MAP[type].fields.length ? normaliseRecipe(article.recipe) : null;
  const body        = enhanceArticleHtml(enhanceImageHtml(sanitiseHtml(article.body ?? '')));
  const showToc     = body.toc.filter((t) => t.level === 2).length >= 3;
  const recipeCard  = recipe ? <RecipeCard type={type} recipe={recipe} title={article.title} /> : null;

  return (
    <>
      <title>{`Preview: ${article.title} | Chef Peter CMS`}</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Preview banner */}
      <div className="sticky top-0 z-50 bg-[#1B365D] text-white px-4 py-2.5 flex items-center justify-between text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#D99B26]" />
          <span className="font-medium">Preview mode</span>
          <Badge status={article.status} className="ml-2" />
        </div>
        <Link to={`/admin/articles/${article.id}/edit`} className="flex items-center gap-1.5 text-xs hover:text-[#D99B26] transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to editor
        </Link>
      </div>

      <article className="min-h-screen bg-cream text-ink">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8">
          <header className="max-w-3xl">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">
              {primaryCat?.name}
              {type !== 'educational' && <span className="text-muted">{primaryCat ? ' · ' : ''}{ARTICLE_TYPE_MAP[type].label}</span>}
            </p>
            <h1 className="mt-3 font-serif text-[2.1rem] font-semibold leading-[1.12] text-ink sm:text-[2.75rem]">{article.title}</h1>
            {article.excerpt && <p className="mt-5 text-[1.1875rem] leading-relaxed text-ink-soft">{article.excerpt}</p>}
            <p className="mt-6 border-y border-sand py-4 text-[0.9375rem] text-muted">
              By <span className="font-semibold text-ink">{article.author_display_name}</span>
              {article.published_at && <> · Published {formatDate(article.published_at)}</>}
              {' · '}{readingMinutesFromHtml(article.body ?? '')} min read
            </p>
          </header>

          {featuredUrl && (
            <img src={featuredUrl} alt={article.featured_image?.alt_text ?? ''} className="mt-8 max-h-[36rem] w-full rounded-lg object-cover" />
          )}

          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
            <div className="min-w-0 max-w-[42rem]">
              {showToc && <div className="mb-8"><TableOfContents toc={body.toc} variant="inline" /></div>}
              {type === 'recipe' && recipeCard}
              <div className="article-body" dangerouslySetInnerHTML={{ __html: body.html }} />
              {type !== 'recipe' && recipeCard}

              {tags.length > 0 && (
                <div className="mt-12 flex flex-wrap gap-2 border-t border-sand pt-8">
                  {tags.map((tag) => tag && (
                    <span key={tag.id} className="rounded-full border border-sand-strong px-3 py-1.5 text-[0.875rem] text-ink-soft">{tag.name}</span>
                  ))}
                </div>
              )}

              <div className="mt-12 border-t border-sand pt-8">
                <Link to={`/admin/articles/${article.id}/edit`} className="inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
                  <ArrowLeft className="h-4 w-4" /> Back to editor
                </Link>
              </div>
            </div>
            {showToc && <aside className="hidden lg:block"><TableOfContents toc={body.toc} variant="sidebar" /></aside>}
          </div>
        </div>
      </article>
    </>
  );
}
