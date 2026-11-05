/**
 * /articles/:slug — a lesson in the culinary library.
 *
 * Reading experience:
 *   - Breadcrumbs (with BreadcrumbList JSON-LD), category, format and tags
 *   - Title, introduction (excerpt), author, published + updated dates, reading time
 *   - Featured image with caption/credit
 *   - Table of contents for long articles (sidebar on desktop, collapsible on mobile)
 *   - Body with numbered instructions, figures with captions and "Chef's tip"
 *     style callouts (see src/lib/knowledge/articleHtml.ts)
 *   - Optional recipe / tutorial card (knowledge-platform migration)
 *   - Share links, author biography, previous/next, related articles
 *   - BlogPosting JSON-LD, plus Recipe JSON-LD only for qualifying recipes
 *   - Social metadata (Open Graph / Twitter) via React 19 document metadata
 *   - 404 with redirect check for moved articles
 *
 * Security: RLS returns only published, non-noindex articles to visitors.
 * The body is sanitised on save and again here before rendering.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getPublishedArticleBySlug,
  getRelatedArticles,
  getAdjacentArticles,
  sanitiseHtml as sanitiseBodyHtml,
} from '../../lib/services/articles';
import { getMediaUrl } from '../../lib/services/media';
import { useRedirect } from '../../hooks/useRedirect';
import { getAuthorProfile } from '../../lib/services/authors';
import { DEFAULT_AUTHOR, isChefPeterByline, type AuthorProfileView } from '../../data/authorProfile';
import { enhanceImageHtml } from '../../components/blog/ResponsiveImage';
import { enhanceArticleHtml, readingMinutesFromHtml } from '../../lib/knowledge/articleHtml';
import { articleLearningLinks } from '../../data/internalLinks';
import { articleTypeOf, ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import { buildRecipeJsonLd, normaliseRecipe, qualifiesForRecipeSchema } from '../../lib/knowledge/recipe';
import type { ArticleWithRelations, ArticleCard, Media } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import Breadcrumb from '../../components/blog/Breadcrumb';
import ArticleGrid from '../../components/blog/ArticleGrid';
import { SITE_URL } from '../../components/knowledge/LibraryParts';
import { IDS, articleDocumentTitle } from '../../lib/seo/schema';
import { ArticleNavigation, AuthorBio, RecipeCard, ShareLinks, TableOfContents } from '../../components/knowledge/ArticleParts';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmt = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : '');

/** Minimum number of main (h2) headings before a table of contents is shown */
const TOC_MIN_HEADINGS = 3;

type Adjacent = { previous: { slug: string; title: string } | null; next: { slug: string; title: string } | null };

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-5 px-5 py-14 sm:px-8" aria-hidden="true">
      <div className="h-3 w-1/4 rounded bg-sand/70" />
      <div className="h-10 w-4/5 rounded bg-sand/70" />
      <div className="h-5 w-full rounded bg-sand/50" />
      <div className="aspect-[16/9] rounded-lg bg-sand/50" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`h-4 rounded bg-sand/50 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleWithRelations | null | undefined>(undefined);
  const [related, setRelated] = useState<ArticleCard[]>([]);
  const [adjacent, setAdjacent] = useState<Adjacent>({ previous: null, next: null });
  const [authorProfile, setAuthorProfile] = useState<AuthorProfileView | null>(null);

  // If the article is not found, check the redirects table for a moved URL
  useRedirect(article === null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setArticle(undefined);
    setRelated([]);
    setAdjacent({ previous: null, next: null });
    getPublishedArticleBySlug(slug)
      .then((data) => !cancelled && setArticle(data))
      .catch(() => !cancelled && setArticle(null));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    const categoryIds = (article.article_categories ?? []).map((ac) => ac.categories?.id).filter(Boolean) as string[];
    const tagIds = (article.article_tags ?? []).map((at) => at.tags?.id).filter(Boolean) as string[];
    getRelatedArticles({ id: article.id, categoryIds, tagIds }, 3).then((r) => !cancelled && setRelated(r));
    getAuthorProfile(article.author_id, article.author_display_name)
      .then((p) => !cancelled && setAuthorProfile(p))
      .catch(() => {});
    getAdjacentArticles(article.published_at, article.id)
      .then((a) => !cancelled && setAdjacent(a))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [article]);

  const body = useMemo(
    () => (article ? enhanceArticleHtml(enhanceImageHtml(sanitiseBodyHtml(article.body ?? ''))) : null),
    [article],
  );

  if (article === undefined) {
    return (
      <BlogLayout>
        <title>Loading… | Chef Peter the Teacher</title>
        <ArticleSkeleton />
      </BlogLayout>
    );
  }

  if (article === null || !body) {
    return (
      <BlogLayout>
        <title>Article not found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <p className="font-serif text-7xl text-gold/60">404</p>
          <h1 className="mt-4 font-serif text-[2rem] font-semibold text-ink">Article not found</h1>
          <p className="mt-3 leading-relaxed text-ink-soft">
            This article may have been moved or unpublished. Search the library or browse the categories instead.
          </p>
          <Link to="/articles" className="mt-6 inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the library
          </Link>
        </div>
      </BlogLayout>
    );
  }

  // ── Resolved data ───────────────────────────────────────────────────────
  const type = articleTypeOf(article);
  const typeInfo = ARTICLE_TYPE_MAP[type];
  const recipe = typeInfo.fields.length ? normaliseRecipe(article.recipe) : null;
  const primaryCat =
    article.article_categories?.find((ac) => ac.is_primary)?.categories ?? article.article_categories?.[0]?.categories ?? null;
  const categories = (article.article_categories ?? []).map((ac) => ac.categories).filter(Boolean);
  const tags = (article.article_tags ?? []).map((at) => at.tags).filter(Boolean);
  const learningLinks = articleLearningLinks([primaryCat?.slug, ...categories.map((c) => c!.slug)].filter(Boolean) as string[]);
  const raw = article as unknown as Record<string, unknown>;
  const authorName = article.author_display_name || DEFAULT_AUTHOR.name;
  // Until the author profile loads, Chef Peter bylines use the approved default profile
  const profile: AuthorProfileView =
    authorProfile ?? (isChefPeterByline(authorName) ? { ...DEFAULT_AUTHOR, name: authorName } : { ...DEFAULT_AUTHOR, name: authorName, shortBio: null, jobTitle: null, photoUrl: null, profileUrl: null, source: 'generic' });
  const featuredImg = article.featured_image as Media | null;
  const socialImg = (raw['social_image'] as Media | null) ?? featuredImg;

  const articleUrl = `${SITE_URL}/articles/${article.slug}`;
  const canonUrl = article.canonical_url || articleUrl;
  const pageTitle = articleDocumentTitle(article.seo_title || article.title);
  const metaDesc = (article.meta_description || article.excerpt || '').slice(0, 160);
  const ogImage = socialImg ? getMediaUrl(socialImg.storage_path) : `${SITE_URL}/images/chef-peter.jpg`;
  const featSrc = featuredImg ? getMediaUrl(featuredImg.storage_path) : null;

  const readingMinutes = readingMinutesFromHtml(article.body ?? '');
  const updatedLater =
    !!article.published_at &&
    !!article.updated_at &&
    new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 86_400_000;
  const showToc = body.toc.filter((t) => t.level === 2).length >= TOC_MIN_HEADINGS;
  const authorPhoto = profile.photoUrl;

  // ── Structured data ─────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Library', href: '/articles' },
    ...(primaryCat ? [{ label: primaryCat.name, href: `/category/${primaryCat.slug}` }] : []),
    { label: article.title },
  ];
  const blogPosting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: metaDesc,
    url: canonUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonUrl },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Person',
      // A Chef Peter byline is the same entity as the site-wide Person node
      ...(isChefPeterByline(authorName) ? { '@id': IDS.person } : {}),
      name: authorName,
      ...(profile.profileUrl ? { url: profile.profileUrl.startsWith('/') ? `${SITE_URL}${profile.profileUrl}` : profile.profileUrl } : {}),
      // (the site-wide Person node already gives Chef Peter's job title)
      ...(profile.jobTitle && !isChefPeterByline(authorName) ? { jobTitle: profile.jobTitle } : {}),
    },
    // The site is Chef Peter's own publication, so the publisher is the site-wide Person
    publisher: { '@type': 'Person', '@id': IDS.person, name: 'Chef Peter the Teacher', url: `${SITE_URL}/about-chef-peter` },
    wordCount: body.wordCount,
    ...(featSrc ? { image: { '@type': 'ImageObject', url: featSrc, caption: featuredImg?.alt_text ?? '' } } : {}),
    ...(primaryCat ? { articleSection: primaryCat.name } : {}),
    ...(tags.length ? { keywords: tags.map((t) => t!.name).join(', ') } : {}),
  };
  // BreadcrumbList JSON-LD is emitted by <Breadcrumb>.
  const ld: Array<Record<string, unknown>> = [blogPosting];
  if (qualifiesForRecipeSchema(type, recipe)) {
    ld.push(
      buildRecipeJsonLd(
        {
          name: article.title,
          description: metaDesc,
          url: canonUrl,
          imageUrl: featSrc,
          authorName,
          datePublished: article.published_at,
          category: primaryCat?.name,
          keywords: tags.map((t) => t!.name),
        },
        recipe,
      ),
    );
  }

  const recipeCard = recipe ? <RecipeCard type={type} recipe={recipe} title={article.title} /> : null;

  return (
    <BlogLayout>
      {/* React 19 document metadata */}
      <title>{pageTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Chef Peter the Teacher" />
      <meta property="og:title" content={article.seo_title || article.title} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={socialImg?.alt_text ?? article.title} />
      <meta property="article:published_time" content={article.published_at ?? ''} />
      <meta property="article:modified_time" content={article.updated_at} />
      {primaryCat && <meta property="article:section" content={primaryCat.name} />}
      {tags.map((tag) => tag && <meta key={tag.id} property="article:tag" content={tag.name} />)}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={article.seo_title || article.title} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={canonUrl} />
      {article.noindex && <meta name="robots" content="noindex, follow" />}
      <script type="application/ld+json">{JSON.stringify(ld).replace(/</g, '\\u003c')}</script>

      <article className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8 sm:pt-10">
        <Breadcrumb crumbs={breadcrumbs} />

        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="mx-auto mt-8 max-w-[42rem] lg:mx-0 lg:max-w-3xl">
          <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em]">
            {primaryCat && (
              <Link to={`/category/${primaryCat.slug}`} className="text-gold-deep hover:underline">
                {primaryCat.name}
              </Link>
            )}
            {type !== 'educational' && (
              <span className="text-muted">
                {primaryCat && <span aria-hidden="true">· </span>}
                {typeInfo.label}
              </span>
            )}
          </p>
          <h1 className="mt-3 font-serif text-[2.1rem] font-semibold leading-[1.12] text-ink sm:text-[2.75rem]">{article.title}</h1>
          {article.excerpt && <p className="mt-5 text-[1.1875rem] leading-relaxed text-ink-soft sm:text-[1.25rem]">{article.excerpt}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-sand py-4 text-[0.9375rem] text-muted">
            <span className="flex items-center gap-2.5">
              {authorPhoto && (
                <img src={authorPhoto} alt="" className="h-9 w-9 rounded-full object-cover object-[51%_30%] ring-1 ring-sand" />
              )}
              <span>
                By <span className="font-semibold text-ink">{authorName}</span>
              </span>
            </span>
            {article.published_at && (
              <span>
                Published <time dateTime={article.published_at}>{fmt(article.published_at)}</time>
              </span>
            )}
            {updatedLater && (
              <span>
                Updated <time dateTime={article.updated_at}>{fmt(article.updated_at)}</time>
              </span>
            )}
            <span>{readingMinutes} min read</span>
            {recipe && type === 'recipe' && (
              <a href="#recipe" className="font-semibold text-ink underline decoration-gold underline-offset-4">
                Jump to recipe
              </a>
            )}
          </div>
        </header>

        {/* ── Featured image ───────────────────────────────────────── */}
        {featSrc && (
          <figure className="mt-8">
            <img
              src={featSrc}
              alt={featuredImg?.alt_text ?? ''}
              width={featuredImg?.width_px ?? undefined}
              height={featuredImg?.height_px ?? undefined}
              fetchPriority="high"
              className="max-h-[36rem] w-full rounded-lg object-cover"
            />
            {(featuredImg?.caption || featuredImg?.credit) && (
              <figcaption className="mt-2.5 text-[0.875rem] leading-snug text-muted">
                {featuredImg?.caption}
                {featuredImg?.caption && featuredImg?.credit && ' · '}
                {featuredImg?.credit && <span>Photo: {featuredImg.credit}</span>}
              </figcaption>
            )}
          </figure>
        )}

        {/* ── Body + table of contents ─────────────────────────────── */}
        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
          <div className="mx-auto min-w-0 max-w-[42rem] lg:mx-0">
            {showToc && (
              <div className="mb-8">
                <TableOfContents toc={body.toc} variant="inline" />
              </div>
            )}

            {type === 'recipe' && recipeCard}

            <div className="article-body" dangerouslySetInnerHTML={{ __html: body.html }} />

            {type !== 'recipe' && recipeCard}

            {/* Categories, tags, share */}
            <footer className="mt-12 space-y-5 border-t border-sand pt-8">
              {(categories.length > 0 || tags.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">Filed under</span>
                  {categories.map((c) => (
                    <Link key={c!.id} to={`/category/${c!.slug}`} className="rounded-full bg-gold-wash px-3 py-1.5 text-[0.875rem] text-ink hover:underline">
                      {c!.name}
                    </Link>
                  ))}
                  {tags.map((t) => (
                    <Link
                      key={t!.id}
                      to={`/tag/${t!.slug}`}
                      className="rounded-full border border-sand-strong px-3 py-1.5 text-[0.875rem] text-ink-soft hover:border-ink hover:text-ink"
                    >
                      {t!.name}
                    </Link>
                  ))}
                </div>
              )}
              <ShareLinks url={articleUrl} title={article.title} />
            </footer>

            <AuthorBio profile={profile} />

            {/* Learn with Chef Peter — training, consultancy and books related to this topic */}
            <nav aria-labelledby="learn-more-title" className="mt-10 rounded-lg border border-sand bg-paper p-6">
              <h2 id="learn-more-title" className="font-serif text-[1.375rem] font-semibold text-ink">Learn more with Chef Peter</h2>
              <ul className="mt-4 space-y-3">
                {learningLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="font-semibold text-ink underline decoration-gold underline-offset-4 hover:decoration-ink">
                      {link.label}
                    </a>
                    <span className="text-ink-soft"> — {link.description}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[0.9375rem] text-ink-soft">
                Interested in training or consultancy?{' '}
                <a href="/#contact" className="font-semibold text-ink underline decoration-gold underline-offset-4">Send an enquiry</a>.
              </p>
            </nav>
            <ArticleNavigation previous={adjacent.previous} next={adjacent.next} />

            <p className="mt-8">
              <Link to="/articles" className="inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the library
              </Link>
            </p>
          </div>

          {showToc && (
            <aside className="hidden lg:block">
              <TableOfContents toc={body.toc} variant="sidebar" />
            </aside>
          )}
        </div>
      </article>

      {/* ── Related ──────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-10 border-t border-sand bg-paper py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 id="related-title" className="mb-8 font-serif text-[1.75rem] font-semibold text-ink">
              Continue learning
            </h2>
            <ArticleGrid articles={related} headingLevel="h3" />
          </div>
        </section>
      )}
    </BlogLayout>
  );
}
