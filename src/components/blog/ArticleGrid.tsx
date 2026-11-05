/**
 * ArticleGrid — shared responsive grid for article cards.
 * Used by BlogIndexPage, CategoryPage, TagPage, and related articles sections.
 */
import React from 'react';
import ArticleCard from './ArticleCard';
import type { ArticleCard as ArticleCardType } from '../../types/article';

interface Props {
  articles: ArticleCardType[];
  columns?: 2 | 3;
}

export function ArticleGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-gold/10 rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-paper" />
          <div className="p-5 space-y-3">
            <div className="h-2.5 bg-[#222] rounded w-1/4" />
            <div className="h-4 bg-[#222] rounded w-4/5" />
            <div className="h-3 bg-paper rounded w-full" />
            <div className="h-3 bg-paper rounded w-3/4" />
            <div className="h-2.5 bg-paper rounded w-1/3 mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArticleGrid({ articles, columns = 3 }: Props) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-6`}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
