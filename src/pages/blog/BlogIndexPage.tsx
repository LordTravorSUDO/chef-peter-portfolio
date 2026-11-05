/**
 * /articles — Public editorial landing page.
 *
 * Layout:
 *   1. Featured article hero (most recent published article)
 *   2. Search bar
 *   3. Category filter chips
 *   4. Article grid with pagination
 *
 * Security: all Supabase queries go through the approved data-access layer.
 * RLS enforces that only status='published' AND published_at<=NOW() AND noindex=false
 * articles are ever returned — drafts, scheduled, archived and noindex articles
 * are invisible at the database level, not just filtered client-side.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublishedArticles, getFeaturedArticle } from '../../lib/services/articles';
import { getCategories } from '../../lib/services/taxonomy';
import type { ArticleCard as ArticleCardData, Category, ArticleWithRelations } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import FeaturedArticleHero from '../../components/blog/FeaturedArticleHero';

const SITE_URL  = 'https://www.chefpetertheteacher.com';
const PAGE_SIZE = 9;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FeaturedSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-card border border-gold/10 min-h-[420px] sm:min-h-[500px] animate-pulse">
      <div className="w-full h-full flex flex-col justify-end p-10 space-y-4">
        <div className="h-3 bg-[#222] rounded w-1/6" />
        <div className="h-8 bg-[#222] rounded w-3/5" />
        <div className="h-4 bg-paper rounded w-2/5" />
        <div className="h-3 bg-paper rounded w-1/4 mt-2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive state from URL — all filter state lives in URL so sharing/back-forward works
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const categorySlug = searchParams.get('category') ?? '';
  const searchQuery  = searchParams.get('q') ?? '';

  // Local controlled search input (only committed to URL on submit)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  // Featured article (page-level, not affected by filters)
  const [featured,      setFeatured]       = useState<ArticleWithRelations | null | undefined>(undefined);
  const [featuredDone,  setFeaturedDone]   = useState(false);

  // Article grid
  const [articles,    setArticles]    = useState<ArticleCardData[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // Categories for filter chips
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Load categories once ─────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // ── Load featured article once (ignores filters) ─────────────────────────
  useEffect(() => {
    getFeaturedArticle()
      .then((a) => setFeatured(a))
      .catch(() => setFeatured(null))
      .finally(() => setFeaturedDone(true));
  }, []);

  // ── Load article grid (re-runs on filter/page change) ────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({
        page,
        pageSize:     PAGE_SIZE,
        categorySlug: categorySlug || undefined,
        search:       searchQuery  || undefined,
      });
      setArticles(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Could not load articles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, categorySlug, searchQuery]);

  useEffect(() => { load(); }, [load]);

  // Sync search input when URL changes externally (back/forward)
  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  // ── URL helpers ──────────────────────────────────────────────────────────
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam('q', searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const setPage = (n: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(n));
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasFilters = !!(categorySlug || searchQuery);

  // ── Metadata ─────────────────────────────────────────────────────────────
  const metaTitle = 'Articles | Chef Peter the Teacher';
  const metaDesc  = 'Culinary articles, recipes, food history and hospitality insights from Chef Peter the Teacher — executive chef and hospitality consultant based in Kampala, Uganda.';
  const ldJson    = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'Blog',
    name:       metaTitle,
    url:        `${SITE_URL}/articles`,
    description: metaDesc,
    author:     { '@type': 'Person', name: 'Chef Peter the Teacher', url: SITE_URL },
    publisher:  { '@type': 'Organization', name: 'Chef Peter the Teacher', url: SITE_URL },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BlogLayout>
      {/* React 19 native document metadata */}
      <title>{metaTitle}</title>
      <meta name="description"        content={metaDesc} />
      <meta property="og:type"        content="website" />
      <meta property="og:title"       content={metaTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url"         content={`${SITE_URL}/articles`} />
      <meta property="og:image"       content={`${SITE_URL}/images/chef-peter.jpg`} />
      <meta name="twitter:card"       content="summary_large_image" />
      <meta name="twitter:title"      content={metaTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <link rel="canonical"           href={`${SITE_URL}/articles`} />
      <script type="application/ld+json">{ldJson}</script>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">
            De'Chosen Knowledge
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink tracking-tight">
            Articles
          </h1>
          <p className="text-ink-soft text-base max-w-lg mx-auto leading-relaxed">
            Culinary insights, recipes, food history and hospitality knowledge from Chef Peter the Teacher.
          </p>
        </div>

        {/* ── Featured article hero ────────────────────────────────────── */}
        {!hasFilters && (
          featuredDone
            ? featured
              ? <FeaturedArticleHero article={featured} />
              : null   /* empty — no published articles yet */
            : <FeaturedSkeleton />
        )}

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} role="search" className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles by title or topic…"
              aria-label="Search articles"
              className="w-full bg-card border border-gold/20 rounded-2xl pl-11 pr-12 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-gold/60 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setParam('q', ''); }}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* ── Category chips ───────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div
            className="flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Filter by category"
          >
            <button
              onClick={() => setParam('category', '')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                !categorySlug
                  ? 'bg-gold text-ink border-gold'
                  : 'border-gold/20 text-ink-soft hover:border-gold/50 hover:text-ink'
              }`}
              aria-pressed={!categorySlug}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setParam('category', cat.slug)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  categorySlug === cat.slug
                    ? 'bg-gold text-ink border-gold'
                    : 'border-gold/20 text-ink-soft hover:border-gold/50 hover:text-ink'
                }`}
                aria-pressed={categorySlug === cat.slug}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Active filter pill ───────────────────────────────────────── */}
        {hasFilters && (
          <div className="flex items-center justify-center gap-2 text-xs text-ink-soft">
            {categorySlug && (
              <span>
                Category:{' '}
                <strong className="text-gold-deep">
                  {categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug}
                </strong>
              </span>
            )}
            {searchQuery && (
              <span>
                Search: <strong className="text-gold-deep">"{searchQuery}"</strong>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-1 underline text-muted hover:text-ink transition"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Results section ──────────────────────────────────────────── */}
        <section aria-label="Article listings">
          {/* Error state */}
          {error && (
            <div className="text-center py-16 space-y-3">
              <p className="text-ink-soft">{error}</p>
              <button
                onClick={load}
                className="text-xs text-gold-deep hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && <ArticleGridSkeleton count={PAGE_SIZE} />}

          {/* Empty state */}
          {!loading && !error && articles.length === 0 && (
            <div className="text-center py-24 space-y-4">
              <p className="text-4xl">✍️</p>
              <p className="font-serif text-xl text-ink">
                {hasFilters ? 'No articles match your filters.' : 'No articles published yet.'}
              </p>
              <p className="text-sm text-muted max-w-xs mx-auto">
                {hasFilters
                  ? 'Try a different category or search term, or browse all articles.'
                  : 'Chef Peter is working on new content. Check back soon.'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gold-deep hover:underline"
                >
                  Show all articles
                </button>
              )}
            </div>
          )}

          {/* Results count + grid */}
          {!loading && !error && articles.length > 0 && (
            <div className="space-y-8">
              <p className="text-xs text-muted text-center" aria-live="polite">
                {total} article{total !== 1 ? 's' : ''}
                {hasFilters ? ' matching your filters' : ''}
                {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ''}
              </p>
              <ArticleGrid articles={articles} columns={3} />
            </div>
          )}
        </section>

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {totalPages > 1 && !loading && (
          <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/20 text-xs text-ink-soft hover:border-gold/50 hover:text-ink transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                      p === page
                        ? 'bg-gold text-ink'
                        : 'text-muted hover:text-ink hover:bg-paper'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/20 text-xs text-ink-soft hover:border-gold/50 hover:text-ink transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        )}

      </div>
    </BlogLayout>
  );
}
