import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ArticleCard } from '../types/article';
import { Container, Section, SectionHeader, btn, card } from './site/ui';

interface TeaserArticle {
  slug: string;
  title: string;
  excerpt: string;
  readingTime: number | null;
  publishedAt: string | null;
  category: string | null;
  imageUrl: string | null;
  imageAlt: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Latest articles from the CMS. Supabase code is loaded only when this
 * section approaches the viewport, so the homepage's first load stays light.
 * If the CMS is unavailable the section still offers a link to /articles.
 */
export const ArticlesTeaserSection: React.FC = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [articles, setArticles] = useState<TeaserArticle[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el || state !== 'idle') return;

    const load = async () => {
      setState('loading');
      try {
        const [{ getPublishedArticles }, { getMediaUrl }] = await Promise.all([
          import('../lib/services/articles'),
          import('../lib/services/media'),
        ]);
        const { articles: rows } = await getPublishedArticles({ pageSize: 3 });
        const mapped = rows.map((a: ArticleCard): TeaserArticle => {
          const primary = a.article_categories?.find((c) => c.is_primary)?.categories ?? a.article_categories?.[0]?.categories ?? null;
          return {
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
            readingTime: a.reading_time_minutes ?? null,
            publishedAt: a.published_at,
            category: primary?.name ?? null,
            imageUrl: a.featured_image ? getMediaUrl(a.featured_image.storage_path) : null,
            imageAlt: a.featured_image?.alt_text ?? '',
          };
        });
        setArticles(mapped);
        setState(mapped.length ? 'ready' : 'empty');
      } catch {
        setState('error');
      }
    };

    if (!('IntersectionObserver' in window)) {
      void load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state]);

  return (
    <Section id="articles" tone="paper" labelledBy="articles-title">
      <span ref={ref} aria-hidden="true" />
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader
            id="articles-title"
            eyebrow="Culinary articles"
            title="From the kitchen journal"
            intro="Techniques, recipes, baking science and practical advice for cooks, bakers and hospitality teams."
          />
          <a href="/articles" className={`${btn.secondary} shrink-0`}>
            Explore all articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {(state === 'idle' || state === 'loading') && (
          <ul className="mt-12 grid gap-6 md:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={`${card} overflow-hidden`}>
                <div className="aspect-[3/2] animate-pulse bg-sand/50" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-sand/70" />
                  <div className="h-5 w-4/5 animate-pulse rounded bg-sand/70" />
                  <div className="h-4 w-full animate-pulse rounded bg-sand/50" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {state === 'ready' && (
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug} className={`${card} group flex flex-col overflow-hidden`}>
                <a href={`/articles/${a.slug}`} className="flex h-full flex-col">
                  <div className="aspect-[3/2] overflow-hidden bg-sand/40">
                    {a.imageUrl && (
                      <img
                        src={a.imageUrl}
                        alt={a.imageAlt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    {a.category && (
                      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">{a.category}</p>
                    )}
                    <h3 className="mt-2 font-serif text-[1.25rem] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
                      {a.title}
                    </h3>
                    {a.excerpt && <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-soft">{a.excerpt}</p>}
                    <p className="mt-auto pt-5 text-[0.8125rem] text-muted">
                      {a.publishedAt && dateFormat.format(new Date(a.publishedAt))}
                      {a.readingTime ? ` · ${a.readingTime} min read` : ''}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        {(state === 'empty' || state === 'error') && (
          <p className="mt-10 max-w-xl leading-relaxed text-ink-soft">
            New articles are on their way. Visit the{' '}
            <a href="/articles" className="font-semibold text-ink underline decoration-gold underline-offset-4">
              articles page
            </a>{' '}
            to see what has been published.
          </p>
        )}
      </Container>
    </Section>
  );
};
