/**
 * FeaturedArticleHero — the featured article at the top of the library.
 * Editorial split layout: large image beside the title and introduction.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getMediaUrl } from '../../lib/services/media';
import { articleTypeOf, ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import type { ArticleWithRelations } from '../../types/article';
import { btn } from '../site/ui';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }); // dates as published in Kampala, for every visitor

export default function FeaturedArticleHero({ article }: { article: ArticleWithRelations }) {
  const primaryCat =
    article.article_categories?.find((ac) => ac.is_primary)?.categories ?? article.article_categories?.[0]?.categories ?? null;
  const img = article.featured_image;
  const type = articleTypeOf(article);

  return (
    <article className="group relative grid overflow-hidden rounded-[var(--radius-card)] border border-sand bg-card md:grid-cols-12">
      <div className="relative aspect-[3/2] overflow-hidden bg-paper md:col-span-7 md:aspect-auto md:min-h-[26rem]">
        {img ? (
          <img
            src={getMediaUrl(img.storage_path)}
            alt={img.alt_text ?? ''}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gold-wash">
            <span aria-hidden="true" className="font-serif text-8xl text-gold-deep/30">
              {article.title.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 md:col-span-5">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">
          Featured{primaryCat ? ` · ${primaryCat.name}` : ''}
          {type !== 'educational' && <span className="text-muted"> · {ARTICLE_TYPE_MAP[type].label}</span>}
        </p>
        <h2 className="mt-3 font-serif text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2.25rem]">
          <Link to={`/articles/${article.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && <p className="mt-4 line-clamp-4 leading-relaxed text-ink-soft">{article.excerpt}</p>}
        <p className="mt-4 text-[0.875rem] text-muted">
          {article.author_display_name}
          {article.published_at && <> · {dateFormat.format(new Date(article.published_at))}</>}
          {article.reading_time_minutes > 0 && <> · {article.reading_time_minutes} min read</>}
        </p>
        <span className={`${btn.primary} mt-7 self-start`} aria-hidden="true">
          Read the article <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}
