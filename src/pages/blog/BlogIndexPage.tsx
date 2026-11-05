/**
 * /articles — The Culinary Library (public landing page of the knowledge platform).
 *
 * Without filters it is an editorial home page:
 *   introduction + search → featured article → browse by category →
 *   latest articles → editor's selection → topics (tags) → the educator.
 *
 * With filters (?q=, ?category=, ?type=, ?view=all, ?page=) it becomes a results page.
 * All filter state lives in the URL so links can be shared and Back works.
 *
 * Security: RLS only ever returns published, non-noindex articles to visitors.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPublishedArticles,
  getFeaturedArticle,
  getEditorsPicks,
  getCategoryArticleCounts,
  getTagsInUse,
} from '../../lib/services/articles';
import { getPublicCategories } from '../../lib/services/taxonomy';
import { hasKnowledgeSchema } from '../../lib/services/knowledgeSchema';
import { ARTICLE_TYPES, isArticleType } from '../../lib/knowledge/articleTypes';
import type { ArticleCard as ArticleCardData, Category, ArticleWithRelations } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import ArticleCard from '../../components/blog/ArticleCard';
import FeaturedArticleHero from '../../components/blog/FeaturedArticleHero';
import { IDS } from '../../lib/seo/schema';
import {
  CategoryTiles,
  EducatorPanel,
  LIBRARY_NAME,
  LibrarySectionHeading,
  PageMeta,
  Pagination,
  SITE_URL,
  SearchBox,
} from '../../components/knowledge/LibraryParts';

const PAGE_SIZE = 12;
const LATEST_COUNT = 6;

const META_TITLE = 'Culinary Library: Recipes, Techniques & Training | Chef Peter';
const META_DESC =
  'Culinary lessons from Chef Peter the Teacher: cooking techniques, baking and pastry, ingredients, food safety, international cuisine and kitchen skills.';

type TagInUse = { id: string; slug: string; name: string; count: number };

export default function BlogIndexPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const q = params.get('q') ?? '';
  const categorySlug = params.get('category') ?? '';
  const typeParam = params.get('type') ?? '';
  const articleType = isArticleType(typeParam) ? typeParam : undefined;
  const listAll = params.get('view') === 'all';
  const filtering = !!(q || categorySlug || articleType || listAll);

  // Shared data
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [v2, setV2] = useState(false);

  // Home sections
  const [featured, setFeatured] = useState<ArticleWithRelations | null | undefined>(undefined);
  const [latest, setLatest] = useState<ArticleCardData[] | null>(null);
  const [picks, setPicks] = useState<ArticleCardData[]>([]);
  const [tags, setTags] = useState<TagInUse[]>([]);

  // Results
  const [results, setResults] = useState<ArticleCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicCategories().then(setCategories).catch(() => {});
    getCategoryArticleCounts().then(setCounts).catch(() => {});
    hasKnowledgeSchema().then(setV2).catch(() => {});
  }, []);

  // Home page data (loaded once, the first time the unfiltered library is shown)
  const homeRequested = useRef(false);
  useEffect(() => {
    if (filtering || homeRequested.current) return;
    homeRequested.current = true;
    let cancelled = false;
    (async () => {
      try {
        const feat = await getFeaturedArticle().catch(() => null);
        if (cancelled) return;
        setFeatured(feat);
        const [res, editorPicks, tagList] = await Promise.all([
          getPublishedArticles({ pageSize: LATEST_COUNT, excludeIds: feat ? [feat.id] : undefined }),
          getEditorsPicks(4),
          getTagsInUse(30),
        ]);
        if (cancelled) return;
        setLatest(res.articles);
        setTotal(res.total + (feat ? 1 : 0));
        setPicks(editorPicks.filter((a) => a.id !== feat?.id));
        setTags(tagList);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('The library could not be loaded. Please try again.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      homeRequested.current = false; // allow a reload if the page unmounts mid-request
    };
  }, [filtering]);

  // Filtered results
  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({
        page,
        pageSize: PAGE_SIZE,
        search: q || undefined,
        categorySlug: categorySlug || undefined,
        articleType,
      });
      setResults(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Articles could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, q, categorySlug, articleType]);

  useEffect(() => {
    if (filtering) loadResults();
  }, [filtering, loadResults]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const typeOptions = useMemo(() => (v2 ? ARTICLE_TYPES : []), [v2]);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: LIBRARY_NAME,
    url: `${SITE_URL}/articles`,
    description: META_DESC,
    // References the site-wide WebSite and Person entities (defined once in index.html)
    isPartOf: { '@id': IDS.website },
    author: { '@id': IDS.person },
  };

  return (
    <BlogLayout>
      <PageMeta
        title={filtering ? `Search the library | Chef Peter the Teacher` : META_TITLE}
        description={META_DESC}
        path="/articles"
        noindex={filtering}
        jsonLd={filtering ? undefined : ld}
      />

      {/* ── Introduction ─────────────────────────────────────────────── */}
      <header className="border-b border-sand bg-paper">
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
          <div className="max-w-3xl">
            <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">Learn with Chef Peter</p>
            <h1 className="mt-3 font-serif text-[2.5rem] font-semibold leading-[1.08] text-ink sm:text-[3.25rem]">{LIBRARY_NAME}</h1>
            <p className="mt-5 text-[1.125rem] leading-relaxed text-ink-soft">
              Practical, well-organised lessons for aspiring chefs, culinary students, working cooks, bakers and hospitality
              teams. Each article explains how <em>and</em> why — with examples from Ugandan, African and international
              kitchens.
            </p>
          </div>
          <div className="mt-8 max-w-2xl">
            <SearchBox value={q} onSearch={(term) => update({ q: term })} />
          </div>
          {categories.length > 0 && (
            <nav aria-label="Categories" className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.slug}`}
                  className="shrink-0 rounded-full border border-sand-strong bg-card px-4 py-2 text-[0.9375rem] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {error && (
          <div role="alert" className="mb-10 rounded-md border border-danger/30 bg-danger/5 p-5 text-ink-soft">
            {error}{' '}
            <button type="button" onClick={() => (filtering ? loadResults() : window.location.reload())} className="font-semibold text-ink underline">
              Try again
            </button>
          </div>
        )}

        {filtering ? (
          /* ── Results view ─────────────────────────────────────────── */
          <section aria-labelledby="results-title">
            <div className="flex flex-col gap-4 border-b border-sand pb-6">
              <h2 id="results-title" className="font-serif text-[1.75rem] font-semibold text-ink">
                {q ? <>Results for “{q}”</> : activeCategory ? activeCategory.name : 'All articles'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
                {q && <FilterChip label={`Search: ${q}`} onRemove={() => update({ q: '' })} />}
                {categorySlug && <FilterChip label={`Category: ${activeCategory?.name ?? categorySlug}`} onRemove={() => update({ category: '' })} />}
                {articleType && (
                  <FilterChip
                    label={`Format: ${ARTICLE_TYPES.find((t) => t.value === articleType)?.label}`}
                    onRemove={() => update({ type: '' })}
                  />
                )}
                <Link to="/articles" className="ml-1 text-muted underline hover:text-ink">
                  Clear all
                </Link>
              </div>
              {(categories.length > 0 || typeOptions.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
                  <FilterSelect
                    id="filter-category"
                    label="Category"
                    value={categorySlug}
                    onChange={(v) => update({ category: v })}
                    options={categories.map((c) => ({ value: c.slug, label: c.name }))}
                    allLabel="All categories"
                  />
                  {typeOptions.length > 0 && (
                    <FilterSelect
                      id="filter-type"
                      label="Format"
                      value={articleType ?? ''}
                      onChange={(v) => update({ type: v })}
                      options={typeOptions.map((t) => ({ value: t.value, label: t.label }))}
                      allLabel="All formats"
                    />
                  )}
                </div>
              )}
            </div>

            <p className="mt-6 text-[0.9375rem] text-muted" aria-live="polite">
              {loading ? 'Searching…' : `${total} article${total === 1 ? '' : 's'} found${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`}
            </p>

            <div className="mt-8">
              {loading ? (
                <ArticleGridSkeleton count={6} />
              ) : results.length > 0 ? (
                <ArticleGrid articles={results} />
              ) : (
                !error && (
                  <div className="py-16 text-center">
                    <p className="font-serif text-[1.5rem] text-ink">No articles match yet.</p>
                    <p className="mx-auto mt-2 max-w-md text-ink-soft">
                      Try a different word — for example an ingredient, a dish or a technique — or browse the categories.
                    </p>
                    <Link to="/articles" className={`mt-6 inline-flex font-semibold text-ink underline decoration-gold underline-offset-4`}>
                      Back to the library
                    </Link>
                  </div>
                )
              )}
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} />
          </section>
        ) : (
          /* ── Library home ─────────────────────────────────────────── */
          <div className="space-y-20">
            {featured === undefined ? (
              <div className="aspect-[16/7] animate-pulse rounded-[var(--radius-card)] bg-sand/50" aria-hidden="true" />
            ) : featured ? (
              <section aria-label="Featured article">
                <FeaturedArticleHero article={featured} />
              </section>
            ) : null}

            {categories.length > 0 && (
              <section aria-labelledby="browse-title">
                <LibrarySectionHeading id="browse-title" eyebrow="Browse" title="Learn by subject" />
                <CategoryTiles categories={categories} counts={counts} />
              </section>
            )}

            <section aria-labelledby="latest-title">
              <LibrarySectionHeading
                id="latest-title"
                eyebrow="New in the library"
                title="Latest articles"
                action={total > LATEST_COUNT + 1 ? { href: '/articles?view=all', label: 'All articles' } : undefined}
              />
              {latest === null ? (
                <ArticleGridSkeleton count={3} />
              ) : latest.length > 0 ? (
                <ArticleGrid articles={latest} headingLevel="h3" />
              ) : !featured ? (
                <p className="max-w-xl leading-relaxed text-ink-soft">
                  The first lessons are being prepared. In the meantime, explore Chef Peter’s{' '}
                  <a href="/cooking-classes-kampala" className="font-semibold text-ink underline decoration-gold underline-offset-4">
                    cooking classes
                  </a>
                  .
                </p>
              ) : null}
            </section>

            {picks.length > 0 && (
              <section aria-labelledby="picks-title">
                <LibrarySectionHeading id="picks-title" eyebrow="Chosen by Chef Peter" title="Editor’s selection" />
                <div className="grid gap-10 lg:grid-cols-2">
                  {picks.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="horizontal" headingLevel="h3" />
                  ))}
                </div>
              </section>
            )}

            {tags.length > 0 && (
              <section aria-labelledby="topics-title">
                <LibrarySectionHeading id="topics-title" eyebrow="Explore" title="Topics" />
                <ul className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/tag/${t.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sand-strong bg-card px-3.5 py-1.5 text-[0.9375rem] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                      >
                        {t.name}
                        <span className="text-[0.8125rem] text-muted">{t.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <EducatorPanel />
          </div>
        )}
      </div>
    </BlogLayout>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold-wash px-3 py-1 text-ink">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="ml-1 rounded-full px-1 text-muted hover:text-ink">
        ×
      </button>
    </span>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.875rem] font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-sand-strong bg-card px-3 py-2.5 text-[1rem] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
