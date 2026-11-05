/**
 * ArticleCard — public article listing card for the culinary library.
 *
 * Variants:
 *   default    — image on top (grids)
 *   horizontal — image beside text (editor's selection, search results on wide screens)
 *   compact    — text only (sidebars, short lists)
 *
 * The whole card is one link target (title link stretched over the card),
 * with the category as a separate link above it.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../../lib/services/media';
import { articleTypeOf, ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import type { ArticleCard as ArticleCardType } from '../../types/article';

interface Props {
  article: ArticleCardType;
  variant?: 'default' | 'horizontal' | 'compact';
  /** Heading level for the title (h2 on listing pages, h3 inside sections) */
  headingLevel?: 'h2' | 'h3';
  key?: React.Key;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function primaryCategoryOf(article: ArticleCardType) {
  return (
    article.article_categories?.find((ac) => ac.is_primary)?.categories ??
    article.article_categories?.[0]?.categories ??
    null
  );
}

export function ArticleMeta({ article, className = '' }: { article: ArticleCardType; className?: string }) {
  return (
    <p className={`text-[0.8125rem] text-muted ${className}`}>
      {article.published_at && <time dateTime={article.published_at}>{dateFormat.format(new Date(article.published_at))}</time>}
      {article.reading_time_minutes > 0 && <span> · {article.reading_time_minutes} min read</span>}
    </p>
  );
}

export default function ArticleCard({ article, variant = 'default', headingLevel = 'h2' }: Props) {
  const primaryCat = primaryCategoryOf(article);
  const type = articleTypeOf(article);
  const showType = type !== 'educational';
  const Heading = headingLevel;
  // Supabase image transformations are a paid feature, so the original is used.
  const thumbUrl = article.featured_image?.storage_path ? getMediaUrl(article.featured_image.storage_path) : null;

  const image = (
    <div className={`overflow-hidden bg-paper ${variant === 'horizontal' ? 'aspect-[4/3] w-32 shrink-0 rounded-md sm:w-48' : 'aspect-[3/2] rounded-md'}`}>
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gold-wash">
          <span aria-hidden="true" className="select-none font-serif text-5xl text-gold-deep/40">
            {article.title.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );

  const labels = (
    <p className="relative z-10 flex flex-wrap items-center gap-x-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em]">
      {primaryCat && (
        <Link to={`/category/${primaryCat.slug}`} className="text-gold-deep hover:underline">
          {primaryCat.name}
        </Link>
      )}
      {showType && (
        <span className="text-muted">
          {primaryCat && <span aria-hidden="true">· </span>}
          {ARTICLE_TYPE_MAP[type].label}
        </span>
      )}
    </p>
  );

  const title = (
    <Heading className={`font-serif font-semibold leading-snug text-ink ${variant === 'compact' ? 'text-[1.0625rem]' : 'text-[1.25rem]'}`}>
      <Link
        to={`/articles/${article.slug}`}
        className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-gold group-hover:decoration-2 group-hover:underline-offset-4"
      >
        {article.title}
      </Link>
    </Heading>
  );

  if (variant === 'compact') {
    return (
      <article className="group relative border-t border-sand py-4">
        {labels}
        <div className="mt-1">{title}</div>
        <ArticleMeta article={article} className="mt-1" />
      </article>
    );
  }

  if (variant === 'horizontal') {
    return (
      <article className="group relative flex gap-4 sm:gap-6">
        {image}
        <div className="min-w-0 flex-1">
          {labels}
          <div className="mt-1.5">{title}</div>
          {article.excerpt && (
            <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-soft max-sm:hidden">{article.excerpt}</p>
          )}
          <ArticleMeta article={article} className="mt-2" />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col">
      {image}
      <div className="mt-4 flex flex-1 flex-col">
        {labels}
        <div className="mt-1.5">{title}</div>
        {article.excerpt && <p className="mt-2 line-clamp-3 text-[0.975rem] leading-relaxed text-ink-soft">{article.excerpt}</p>}
        <ArticleMeta article={article} className="mt-3" />
      </div>
    </article>
  );
}
