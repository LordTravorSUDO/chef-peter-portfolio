/**
 * /category/:slug — Articles filtered by category.
 *
 * Features:
 *   - Category title and description from the database
 *   - Correct canonical URL with pagination (rel="canonical" points to page 1)
 *   - Noindex on page 2+ to avoid duplicate content
 *   - 404 state for unknown category slugs
 *   - Real pagination with scroll-to-top
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublishedArticles } from '../../lib/services/articles';
import { getCategoryBySlug } from '../../lib/services/taxonomy';
import type { ArticleCard as ArticleCardData, Category } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import Breadcrumb from '../../components/blog/Breadcrumb';

const SITE_URL  = 'https://www.chefpetertheteacher.com';
const PAGE_SIZE = 9;

export default function CategoryPage() {
  const { slug }                        = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const [category,   setCategory]   = useState<Category | null | undefined>(undefined);
  const [articles,   setArticles]   = useState<ArticleCardData[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [catLoaded,  setCatLoaded]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Load category metadata
  useEffect(() => {
    if (!slug) return;
    setCatLoaded(false);
    getCategoryBySlug(slug)
      .then((cat) => { setCategory(cat); setCatLoaded(true); })
      .catch(() => { setCategory(null); setCatLoaded(true); });
  }, [slug]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({ page, pageSize: PAGE_SIZE, categorySlug: slug });
      setArticles(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Could not load articles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug, page]);

  useEffect(() => { load(); }, [load]);

  const setPage = (n: number) => {
    setSearchParams({ page: String(n) }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── 404 state ─────────────────────────────────────────────────────────────
  if (catLoaded && category === null) {
    return (
      <BlogLayout>
        <title>Category Not Found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="max-w-2xl mx-auto px-4 py-28 text-center space-y-6">
          <p className="font-serif text-8xl font-bold text-gold-deep/20">404</p>
          <h1 className="font-serif text-3xl font-bold text-ink">Category not found</h1>
          <Link to="/articles" className="inline-flex items-center gap-2 text-sm text-gold-deep hover:underline">
            <ArrowLeft className="w-4 h-4" /> Browse all articles
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const catName   = category?.name ?? (slug ? slug.replace(/-/g, ' ') : '');
  const catDesc   = category?.description;
  const pageTitle = `${catName} Articles | Chef Peter the Teacher`;
  const canonUrl  = `${SITE_URL}/category/${slug}`;

  return (
    <BlogLayout>
      <title>{pageTitle}</title>
      <meta name="description"  content={catDesc ?? `Browse ${catName} articles from Chef Peter the Teacher.`} />
      {/* noindex on pages > 1 to avoid thin duplicate content */}
      {page > 1 && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:url"   content={canonUrl} />
      <meta property="og:image" content={`${SITE_URL}/images/chef-peter.jpg`} />
      {/* canonical always points to page 1 */}
      <link rel="canonical"     href={canonUrl} />
      {page > 1 && <link rel="prev" href={page === 2 ? canonUrl : `${canonUrl}?page=${page - 1}`} />}
      {page < totalPages && <link rel="next" href={`${canonUrl}?page=${page + 1}`} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Breadcrumb */}
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: catName },
        ]} />

        {/* Page header */}
        <div className="space-y-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">Category</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink">{catName}</h1>
          {catDesc && (
            <p className="text-ink-soft leading-relaxed max-w-2xl">{catDesc}</p>
          )}
          {!loading && !error && (
            <p className="text-xs text-muted">
              {total} article{total !== 1 ? 's' : ''}
              {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ''}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-16 space-y-3">
            <p className="text-ink-soft">{error}</p>
            <button onClick={load} className="text-xs text-gold-deep hover:underline">Try again</button>
          </div>
        )}

        {/* Grid */}
        {loading && !error && <ArticleGridSkeleton count={PAGE_SIZE} />}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <p className="font-serif text-xl text-ink">No articles in this category yet.</p>
            <Link to="/articles" className="text-sm text-gold-deep hover:underline">
              Browse all articles
            </Link>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <ArticleGrid articles={articles} columns={3} />
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <nav className="flex items-center justify-center gap-3" aria-label="Category pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/20 text-xs text-ink-soft hover:border-gold/50 hover:text-ink transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
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
