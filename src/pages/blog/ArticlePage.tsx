/**
 * /articles/:slug — Full individual article page.
 *
 * Features:
 *   - Breadcrumb navigation with BreadcrumbList JSON-LD
 *   - Responsive featured image (eager, high priority)
 *   - Correct H1 heading hierarchy (article title is the only H1)
 *   - Author, publication date, update date, reading time
 *   - Category and tag links
 *   - Article body with enhanced inline images
 *   - Image captions and credits where supplied
 *   - Social sharing links (Twitter/X, Facebook, copy link)
 *   - Related articles (same category)
 *   - BlogPosting JSON-LD structured data
 *   - React 19 native per-article metadata
 *   - 404 state with redirect check for moved articles
 *
 * Security: RLS enforces that only published, non-noindex, non-draft articles
 * are ever returned to the browser. Private content cannot be accessed by
 * guessing a slug — the database returns null and this page shows a 404 UI.
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Clock, ArrowLeft, Calendar, Tag, Share2,
  Twitter, Facebook, Link as LinkIcon, CheckCircle2, User,
} from 'lucide-react';
import {
  getPublishedArticleBySlug,
  getRelatedArticles,
  sanitiseHtml as sanitiseBodyHtml,
} from '../../lib/services/articles';
import { getResponsiveMediaUrl, getMediaSrcset } from '../../lib/services/media';
import { enhanceImageHtml } from '../../components/blog/ResponsiveImage';
import type { ArticleWithRelations, ArticleCard } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import Breadcrumb from '../../components/blog/Breadcrumb';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import { useRedirect } from '../../hooks/useRedirect';

const SITE_URL = 'https://www.chefpetertheteacher.com';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ArticleSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-pulse">
      <div className="h-3 bg-[#222] rounded w-1/3" />
      <div className="h-8 bg-[#222] rounded w-4/5" />
      <div className="h-4 bg-[#1E1E1E] rounded w-full" />
      <div className="aspect-[16/9] bg-[#1A1A1A] rounded-2xl" />
      <div className="space-y-3 pt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`h-4 bg-[#1E1E1E] rounded ${i % 3 === 2 ? 'w-4/5' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social sharing strip
// ---------------------------------------------------------------------------

function ShareStrip({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const twitterUrl  = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#6A6A6A] flex items-center gap-1.5">
        <Share2 className="w-3.5 h-3.5" /> Share
      </span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
        className="p-2 rounded-full border border-[#C5A059]/20 text-[#6A6A6A] hover:text-[#EAE7E2] hover:border-[#C5A059]/50 transition"
      >
        <Twitter className="w-3.5 h-3.5" />
      </a>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="p-2 rounded-full border border-[#C5A059]/20 text-[#6A6A6A] hover:text-[#EAE7E2] hover:border-[#C5A059]/50 transition"
      >
        <Facebook className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={copyLink}
        aria-label="Copy link to clipboard"
        className="p-2 rounded-full border border-[#C5A059]/20 text-[#6A6A6A] hover:text-[#EAE7E2] hover:border-[#C5A059]/50 transition"
      >
        {copied
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          : <LinkIcon className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const [article,  setArticle]  = useState<ArticleWithRelations | null | undefined>(undefined);
  const [related,  setRelated]  = useState<ArticleCard[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [relLoading, setRelLoading] = useState(false);

  // Redirect hook: if article is not found, check for a redirect rule in the DB
  useRedirect(article === null && !loading);

  // ── Load article ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setArticle(undefined);
    setRelated([]);
    getPublishedArticleBySlug(slug)
      .then((data) => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Load related articles after the article is resolved ──────────────────
  useEffect(() => {
    if (!article?.slug) return;
    setRelLoading(true);
    const primaryCat = article.article_categories?.find((ac) => ac.is_primary)?.categories
                    ?? article.article_categories?.[0]?.categories ?? null;
    getRelatedArticles(article.slug, primaryCat?.slug ?? null, 3)
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => setRelLoading(false));
  }, [article]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <BlogLayout>
        <title>Loading… | Chef Peter the Teacher</title>
        <ArticleSkeleton />
      </BlogLayout>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!article) {
    return (
      <BlogLayout>
        <title>Article Not Found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="max-w-2xl mx-auto px-4 py-28 text-center space-y-6">
          <p className="font-serif text-8xl font-bold text-[#C5A059]/20">404</p>
          <h1 className="font-serif text-3xl font-bold text-[#EAE7E2]">Article not found</h1>
          <p className="text-[#A09E98] text-sm leading-relaxed max-w-sm mx-auto">
            This article may have been unpublished, moved to a new URL, or never existed.
          </p>
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-sm text-[#C5A059] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all articles
          </Link>
        </div>
      </BlogLayout>
    );
  }

  // ── Resolved data ──────────────────────────────────────────────────────────
  const primaryCat  = article.article_categories?.find((ac) => ac.is_primary)?.categories
                   ?? article.article_categories?.[0]?.categories ?? null;
  const allCats     = article.article_categories?.map((ac) => ac.categories).filter(Boolean) ?? [];
  const tags        = article.article_tags?.map((at) => at.tags).filter(Boolean) ?? [];
  const featuredImg = article.featured_image;
  const author      = (article as unknown as Record<string, unknown>)['profiles'] as
                       { display_name?: string; avatar_url?: string | null } | null | undefined;

  const canonUrl    = article.canonical_url ?? `${SITE_URL}/articles/${article.slug}`;
  const pageTitle   = (article.seo_title ?? article.title) + ' | Chef Peter the Teacher';
  const metaDesc    = (article.meta_description ?? article.excerpt ?? '').slice(0, 160);
  const authorName  = article.author_display_name ?? 'Chef Peter the Teacher';

  // Images
  const rawArticle  = article as unknown as Record<string, unknown>;
  const socialImg   = (rawArticle['social_image'] as typeof featuredImg | null) ?? featuredImg;
  const ogImageUrl  = socialImg
    ? getResponsiveMediaUrl(socialImg.storage_path, { width: 1200, quality: 80 })
    : `${SITE_URL}/images/chef-peter.jpg`;

  const featSrc    = featuredImg
    ? getResponsiveMediaUrl(featuredImg.storage_path, { width: 1200, quality: 80 })
    : null;
  const featSrcset = featuredImg ? getMediaSrcset(featuredImg.storage_path) : undefined;

  const articleUrl  = `${SITE_URL}/articles/${article.slug}`;

  // JSON-LD BlogPosting
  const ld: Record<string, unknown> = {
    '@context':         'https://schema.org',
    '@type':            'BlogPosting',
    headline:           article.title,
    description:        metaDesc,
    url:                canonUrl,
    mainEntityOfPage:   { '@type': 'WebPage', '@id': canonUrl },
    datePublished:      article.published_at,
    dateModified:       article.updated_at,
    author:             { '@type': 'Person', name: authorName, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name:    'Chef Peter the Teacher',
      logo:    { '@type': 'ImageObject', url: `${SITE_URL}/images/chef-peter.jpg` },
    },
  };
  if (featuredImg) {
    ld['image'] = {
      '@type':   'ImageObject',
      url:       featSrc,
      ...(featuredImg.width_px  ? { width:  featuredImg.width_px  } : {}),
      ...(featuredImg.height_px ? { height: featuredImg.height_px } : {}),
      caption:   featuredImg.alt_text ?? '',
    };
  }
  if (primaryCat) ld['articleSection'] = primaryCat.name;
  if (tags.length) ld['keywords'] = tags.map((t) => t?.name).join(', ');

  // Enhance inline body images with srcset, then sanitise as a defence-in-depth
  // layer (body is already sanitised on write, but we apply it on read too)
  const enhancedBody = enhanceImageHtml(sanitiseBodyHtml(article.body ?? ''));

  // Breadcrumb trail
  const breadcrumbs = [
    { label: 'Home',     href: '/' },
    { label: 'Articles', href: '/articles' },
    ...(primaryCat ? [{ label: primaryCat.name, href: `/category/${primaryCat.slug}` }] : []),
    { label: article.title },
  ];

  return (
    <BlogLayout>
      {/* React 19 native document metadata */}
      <title>{pageTitle}</title>
      <meta name="description"                content={metaDesc} />
      <meta property="og:type"                content="article" />
      <meta property="og:site_name"           content="Chef Peter the Teacher" />
      <meta property="og:title"               content={article.seo_title ?? article.title} />
      <meta property="og:description"         content={metaDesc} />
      <meta property="og:url"                 content={canonUrl} />
      <meta property="og:image"               content={ogImageUrl} />
      <meta property="og:image:alt"           content={featuredImg?.alt_text ?? article.title} />
      <meta property="article:published_time" content={article.published_at ?? ''} />
      <meta property="article:modified_time"  content={article.updated_at} />
      {primaryCat && <meta property="article:section" content={primaryCat.name} />}
      {tags.map((tag) => tag && <meta key={tag.id} property="article:tag" content={tag.name} />)}
      <meta name="twitter:card"               content="summary_large_image" />
      <meta name="twitter:title"              content={article.seo_title ?? article.title} />
      <meta name="twitter:description"        content={metaDesc} />
      <meta name="twitter:image"              content={ogImageUrl} />
      <link rel="canonical"                   href={canonUrl} />
      {article.noindex && <meta name="robots" content="noindex, follow" />}
      <script type="application/ld+json">{JSON.stringify(ld)}</script>

      {/* ── Article wrapper ────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb crumbs={breadcrumbs} />
        </div>

        {/* Category label */}
        {primaryCat && (
          <Link
            to={`/category/${primaryCat.slug}`}
            className="inline-block text-[10px] font-mono uppercase tracking-[0.35em] text-[#D99B26] hover:text-[#E6C687] transition mb-4"
          >
            {primaryCat.name}
          </Link>
        )}

        {/* H1 — article title is the only H1 on this page */}
        <h1 className="font-serif text-3xl sm:text-[2.625rem] font-bold text-[#EAE7E2] leading-tight mb-4">
          {article.title}
        </h1>

        {/* Excerpt / standfirst */}
        {article.excerpt && (
          <p className="text-lg text-[#A09E98] font-light leading-relaxed mb-6 border-l-2 border-[#C5A059]/30 pl-4">
            {article.excerpt}
          </p>
        )}

        {/* Meta bar: author, date, reading time */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6A6A6A] pb-6 mb-8 border-b border-[#C5A059]/10 font-mono uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {authorName}
          </span>
          {article.published_at && (
            <time dateTime={article.published_at} className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(article.published_at)}
            </time>
          )}
          {article.updated_at && article.updated_at !== article.published_at && (
            <span className="text-[#4A4A4A]">
              Updated {formatDate(article.updated_at)}
            </span>
          )}
          {article.reading_time_minutes > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {article.reading_time_minutes} min read
            </span>
          )}
        </div>

        {/* Featured image */}
        {featSrc && (
          <figure className="mb-10 -mx-4 sm:mx-0">
            <img
              src={featSrc}
              srcSet={featSrcset}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 768px, 1200px"
              alt={featuredImg?.alt_text ?? article.title}
              width={1200}
              height={675}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full rounded-none sm:rounded-2xl object-cover max-h-[520px]"
            />
            {(featuredImg?.caption || featuredImg?.credit) && (
              <figcaption className="mt-2.5 text-xs text-[#5A5A5A] text-center leading-relaxed">
                {featuredImg.caption}
                {featuredImg.caption && featuredImg.credit && ' · '}
                {featuredImg.credit && <span className="italic">Credit: {featuredImg.credit}</span>}
              </figcaption>
            )}
          </figure>
        )}

        {/* Article body */}
        <div
          className="article-body text-[#D5D2CD] leading-[1.85] text-[0.9375rem]"
          dangerouslySetInnerHTML={{ __html: enhancedBody }}
        />

        {/* Footer: categories + tags + share */}
        <footer className="mt-14 pt-8 border-t border-[#C5A059]/10 space-y-6">

          {/* Categories */}
          {allCats.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#6A6A6A]">In:</span>
              {allCats.map((cat) => cat && (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[#1A1A1A] border border-[#C5A059]/20 text-[#A09E98] hover:border-[#C5A059]/50 hover:text-[#C5A059] transition"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#6A6A6A] flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags:
              </span>
              {tags.map((tag) => tag && (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="px-3 py-1 rounded-full text-xs border border-[#C5A059]/15 text-[#6A6A6A] hover:border-[#C5A059]/40 hover:text-[#A09E98] transition"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Social sharing */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <ShareStrip url={articleUrl} title={article.title} />
            <Link
              to="/articles"
              className="inline-flex items-center gap-1.5 text-xs text-[#6A6A6A] hover:text-[#C5A059] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All articles
            </Link>
          </div>
        </footer>
      </div>

      {/* ── Related articles ────────────────────────────────────────────── */}
      {(relLoading || related.length > 0) && (
        <section className="border-t border-[#C5A059]/10 mt-4 py-14" aria-label="Related articles">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            <h2 className="font-serif text-2xl font-bold text-[#EAE7E2]">
              More to read
            </h2>
            {relLoading
              ? <ArticleGridSkeleton count={3} columns={3} />
              : <ArticleGrid articles={related} columns={3} />
            }
          </div>
        </section>
      )}

      {/* Article body typography */}
      <style>{`
        .article-body h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.75rem; font-weight: 700; color: #EAE7E2;
          margin: 2.25em 0 0.65em; line-height: 1.25;
        }
        .article-body h3 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.375rem; font-weight: 600; color: #EAE7E2;
          margin: 1.9em 0 0.5em; line-height: 1.3;
        }
        .article-body h4 {
          font-size: 1.125rem; font-weight: 600; color: #EAE7E2;
          margin: 1.6em 0 0.4em; line-height: 1.35;
        }
        .article-body p  { margin: 0.9em 0; }
        .article-body ul, .article-body ol { padding-left: 1.5em; margin: 0.9em 0; }
        .article-body ul { list-style: disc; }
        .article-body ol { list-style: decimal; }
        .article-body li { margin: 0.35em 0; }
        .article-body blockquote {
          border-left: 3px solid #C5A059;
          padding: 0.8em 1.25em; margin: 1.5em 0;
          color: #A09E98; font-style: italic;
          background: rgba(197,160,89,0.04);
          border-radius: 0 10px 10px 0;
        }
        .article-body a { color: #C5A059; text-decoration: underline; text-underline-offset: 3px; }
        .article-body a:hover { color: #E6C687; }
        .article-body img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.75em 0; }
        .article-body figure { margin: 1.75em 0; }
        .article-body figcaption { text-align: center; font-size: 0.75rem; color: #5A5A5A; margin-top: 0.6em; }
        .article-body hr { border: none; border-top: 1px solid rgba(197,160,89,0.12); margin: 2.25em 0; }
        .article-body strong { color: #EAE7E2; font-weight: 600; }
        .article-body em { color: #C5B88A; }
        .article-body code {
          background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px;
          padding: 0.15em 0.4em; font-size: 0.875em; color: #C5A059;
        }
        .article-body pre {
          background: #141414; border: 1px solid #2A2A2A; border-radius: 8px;
          padding: 1em 1.25em; overflow-x: auto; margin: 1.5em 0;
        }
        .article-body pre code { background: none; border: none; padding: 0; }
        .article-body table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.875rem; }
        .article-body th { text-align: left; padding: 0.6em 0.8em; color: #EAE7E2; border-bottom: 1px solid #2A2A2A; }
        .article-body td { padding: 0.5em 0.8em; border-bottom: 1px solid #1A1A1A; color: #D5D2CD; }
      `}</style>
    </BlogLayout>
  );
}
