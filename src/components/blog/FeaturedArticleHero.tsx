/**
 * FeaturedArticleHero — editorial hero banner for the most recent article.
 * Displayed at the top of the /articles listing page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { getResponsiveMediaUrl, getMediaSrcset } from '../../lib/services/media';
import type { ArticleWithRelations } from '../../types/article';

interface Props {
  article: ArticleWithRelations;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function FeaturedArticleHero({ article }: Props) {
  const primaryCat = article.article_categories?.find((ac) => ac.is_primary)?.categories
                  ?? article.article_categories?.[0]?.categories ?? null;
  const img        = article.featured_image;
  const featSrc    = img ? getResponsiveMediaUrl(img.storage_path, { width: 1400, quality: 80 }) : null;
  const featSrcset = img ? getMediaSrcset(img.storage_path) : undefined;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-card border border-gold/15 group">
      {/* Background image */}
      {featSrc ? (
        <div className="absolute inset-0">
          <img
            src={featSrc}
            srcSet={featSrcset}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
            alt={img?.alt_text ?? article.title}
            width={1400}
            height={700}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/70 to-cream/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-paper to-cream" />
      )}

      {/* Content overlay */}
      <div className="relative z-10 px-6 sm:px-10 py-12 sm:py-16 flex flex-col justify-end min-h-[420px] sm:min-h-[500px]">
        <div className="max-w-2xl">
          {/* Featured label + category */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep bg-gold-wash border border-gold/40 px-3 py-1 rounded-full">
              Featured
            </span>
            {primaryCat && (
              <Link
                to={`/category/${primaryCat.slug}`}
                className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-soft hover:text-gold-deep transition"
              >
                {primaryCat.name}
              </Link>
            )}
          </div>

          {/* Title */}
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-ink leading-tight mb-3">
            <Link
              to={`/articles/${article.slug}`}
              className="hover:text-gold-deep transition-colors duration-200"
            >
              {article.title}
            </Link>
          </h2>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-ink-soft text-sm sm:text-base leading-relaxed line-clamp-2 mb-5 max-w-xl">
              {article.excerpt}
            </p>
          )}

          {/* Meta + CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-muted uppercase tracking-[0.08em]">
              {article.published_at && (
                <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
              )}
              {article.reading_time_minutes > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {article.reading_time_minutes} min
                </span>
              )}
            </div>
            <Link
              to={`/articles/${article.slug}`}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink bg-gold hover:bg-gold-light px-4 py-2 rounded-full transition"
            >
              Read article <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
