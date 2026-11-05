/**
 * /admin/articles/:id/preview — Admin preview of an article as readers will see it.
 *
 * Renders the article with the public website's dark luxury theme so the
 * editor can see exactly how it will look when published. The preview is
 * admin-only (protected route) and works for articles of any status —
 * even drafts can be previewed without making them public.
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { getArticleByIdForPreview, sanitiseHtml } from '../../lib/services/articles';
import { enhanceArticleHtml, readingMinutesFromHtml } from '../../lib/knowledge/articleHtml';
import { articleTypeOf, ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import { normaliseRecipe } from '../../lib/knowledge/recipe';
import { AuthorBio, RecipeCard, TableOfContents } from '../../components/knowledge/ArticleParts';
import { readPreviewDraft, type PreviewDraft } from '../../lib/previewDraft';
import { getAuthorProfile } from '../../lib/services/authors';
import { DEFAULT_AUTHOR, type AuthorProfileView } from '../../data/authorProfile';
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
  const [params]                = useSearchParams();
  const [draft,   setDraft]     = useState<PreviewDraft | null>(null);
  const [author,  setAuthor]    = useState<AuthorProfileView | null>(null);

  // Unsaved editor content (stored by the editor's Preview button)
  useEffect(() => {
    if (id && params.get('draft') === '1') setDraft(readPreviewDraft(id));
  }, [id, params]);

  useEffect(() => {
    if (!article) return;
    getAuthorProfile(article.author_id, draft?.authorName || article.author_display_name).then(setAuthor).catch(() => setAuthor(DEFAULT_AUTHOR));
  }, [article, draft?.authorName]);

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

  // Same rendering pipeline as the public article page (src/pages/blog/ArticlePage.tsx).
  // With ?draft=1 the editor's unsaved content is shown on top of the saved article.
  const view = draft
    ? {
        title: draft.title, excerpt: draft.excerpt, body: draft.body,
        featuredPath: draft.featuredImage?.storage_path ?? null, featuredAlt: draft.featuredImage?.alt_text ?? '',
        primaryCat: draft.primaryCategory, tagNames: draft.tags,
        type: draft.articleType ?? articleTypeOf(article), recipeRaw: draft.recipe ?? article.recipe,
        authorName: draft.authorName || article.author_display_name,
      }
    : {
        title: article.title, excerpt: article.excerpt, body: article.body ?? '',
        featuredPath: article.featured_image?.storage_path ?? null, featuredAlt: article.featured_image?.alt_text ?? '',
        primaryCat: article.article_categories?.find((ac) => ac.is_primary)?.categories ?? article.article_categories?.[0]?.categories ?? null,
        tagNames: (article.article_tags?.map((at) => at.tags?.name).filter(Boolean) ?? []) as string[],
        type: articleTypeOf(article), recipeRaw: article.recipe,
        authorName: article.author_display_name,
      };
  const featuredUrl = view.featuredPath ? getMediaUrl(view.featuredPath) : null;
  const primaryCat  = view.primaryCat;
  const type        = view.type;
  const recipe      = ARTICLE_TYPE_MAP[type].fields.length ? normaliseRecipe(view.recipeRaw) : null;
  const body        = enhanceArticleHtml(enhanceImageHtml(sanitiseHtml(view.body)));
  const showToc     = body.toc.filter((t) => t.level === 2).length >= 3;
  const recipeCard  = recipe ? <RecipeCard type={type} recipe={recipe} title={view.title} /> : null;

  return (
    <>
      <title>{`Preview: ${view.title} | Chef Peter CMS`}</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Preview banner */}
      <div className="sticky top-0 z-50 bg-[#1B365D] text-white px-4 py-2.5 flex items-center justify-between text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#D99B26]" />
          <span className="font-medium">Preview mode</span>
          <Badge status={article.status} className="ml-2" />
          <span className="ml-2 text-xs text-white/80" data-testid="preview-source">
            {draft ? 'Showing your latest changes, including unsaved ones' : 'Showing the last saved version'}
          </span>
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
            <h1 className="mt-3 font-serif text-[2.1rem] font-semibold leading-[1.12] text-ink sm:text-[2.75rem]">{view.title}</h1>
            {view.excerpt && <p className="mt-5 text-[1.1875rem] leading-relaxed text-ink-soft">{view.excerpt}</p>}
            <p className="mt-6 border-y border-sand py-4 text-[0.9375rem] text-muted">
              By <span className="font-semibold text-ink">{view.authorName}</span>
              {article.published_at && <> · Published {formatDate(article.published_at)}</>}
              {' · '}{readingMinutesFromHtml(view.body)} min read
            </p>
          </header>

          {featuredUrl && (
            <img src={featuredUrl} alt={view.featuredAlt} className="mt-8 max-h-[36rem] w-full rounded-lg object-cover" />
          )}

          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
            <div className="min-w-0 max-w-[42rem]">
              {showToc && <div className="mb-8"><TableOfContents toc={body.toc} variant="inline" /></div>}
              {type === 'recipe' && recipeCard}
              <div className="article-body" dangerouslySetInnerHTML={{ __html: body.html }} />
              {type !== 'recipe' && recipeCard}

              {view.tagNames.length > 0 && (
                <div className="mt-12 flex flex-wrap gap-2 border-t border-sand pt-8">
                  {view.tagNames.map((name) => (
                    <span key={name} className="rounded-full border border-sand-strong px-3 py-1.5 text-[0.875rem] text-ink-soft">{name}</span>
                  ))}
                </div>
              )}

              {author && <AuthorBio profile={author} />}

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
