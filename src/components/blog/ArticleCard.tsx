/**
 * ArticleCard — public-facing article listing card.
 *
 * Used on /articles, /category/:slug and /tag/:slug pages.
 * Renders with the site's dark luxury design system.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getResponsiveMediaUrl } from '../../lib/services/media';
import type { ArticleCard as ArticleCardType } from '../../types/article';

interface Props {
  article: ArticleCardType;
  key?: React.Key;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function ArticleCard({ article }: Props) {
  const primaryCat =
    article.article_categories?.find((ac) => ac.is_primary)?.categories ??
    article.article_categories?.[0]?.categories ?? null;

  const thumbUrl = article.featured_image?.storage_path
    ? getResponsiveMediaUrl(article.featured_image.storage_path, { width: 600, quality: 75 })
    : null;

  return (
    <article className="group bg-card border border-gold/10 rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-300 hover:shadow-xl hover:shadow-gold/5 flex flex-col">
      {/* Thumbnail */}
      <Link to={`/articles/${article.slug}`} tabIndex={-1} aria-hidden="true">
        <div className="aspect-[16/9] bg-paper overflow-hidden">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={article.featured_image?.alt_text ?? article.title}
              width={600}
              height={338}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gold-deep/20 text-6xl font-serif font-bold select-none">
                {article.title.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category */}
        {primaryCat && (
          <Link
            to={`/category/${primaryCat.slug}`}
            className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep hover:text-gold-deep transition mb-2 inline-block"
          >
            {primaryCat.name}
          </Link>
        )}

        {/* Title */}
        <h2 className="font-serif text-lg font-bold text-ink leading-snug mb-2 group-hover:text-gold-deep transition-colors duration-200">
          <Link to={`/articles/${article.slug}`}>
            {article.title}
          </Link>
        </h2>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-sm text-ink-soft leading-relaxed line-clamp-3 mb-4 flex-1">
            {article.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted mt-auto pt-4 border-t border-gold/10">
          {article.published_at && (
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          )}
          {article.reading_time_minutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.reading_time_minutes} min read
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
