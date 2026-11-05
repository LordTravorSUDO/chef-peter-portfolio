/**
 * ArticleGrid — shared responsive grid for article cards.
 * Used by the library page, category and tag pages, and related articles.
 */
import React from 'react';
import ArticleCard from './ArticleCard';
import type { ArticleCard as ArticleCardType } from '../../types/article';

interface Props {
  articles: ArticleCardType[];
  columns?: 2 | 3;
  headingLevel?: 'h2' | 'h3';
}

const gridCls = (columns: 2 | 3) =>
  `grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`;

export function ArticleGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 }) {
  return (
    <div className={gridCls(columns)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/2] rounded-md bg-sand/50" />
          <div className="mt-4 space-y-2.5">
            <div className="h-3 w-1/3 rounded bg-sand/70" />
            <div className="h-5 w-4/5 rounded bg-sand/70" />
            <div className="h-4 w-full rounded bg-sand/50" />
            <div className="h-3 w-1/4 rounded bg-sand/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArticleGrid({ articles, columns = 3, headingLevel = 'h2' }: Props) {
  return (
    <div className={gridCls(columns)}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} headingLevel={headingLevel} />
      ))}
    </div>
  );
}
