/**
 * /tag/:slug — Articles associated with a tag.
 *
 * SEO decision: tag pages are noindex by default.
 * Rationale: tag pages are inherently thin — they duplicate article content
 * as a filtered subset. Category pages are the canonical discovery path.
 * Tag pages remain useful for navigation but we tell search engines not to
 * index them to prevent duplicate content issues.
 *
 * Canonical URL still points to the tag page itself (not to /articles)
 * so that internal links remain stable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublishedArticles } from '../../lib/services/articles';
import { getTagBySlug } from '../../lib/services/taxonomy';
import type { ArticleCard as ArticleCardData, Tag } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import Breadcrumb from '../../components/blog/Breadcrumb';

const SITE_URL  = 'https://www.chefpetertheteacher.com';
const PAGE_SIZE = 9;

export default function TagPage() {
  const { slug }                        = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const [tag,        setTag]        = useState<Tag | null | undefined>(undefined);
  const [articles,   setArticles]   = useState<ArticleCardData[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [tagLoaded,  setTagLoaded]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setTagLoaded(false);
    getTagBySlug(slug)
      .then((t) => { setTag(t); setTagLoaded(true); })
      .catch(() => { setTag(null); setTagLoaded(true); });
  }, [slug]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({ page, pageSize: PAGE_SIZE, tagSlug: slug });
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
  if (tagLoaded && tag === null) {
    return (
      <BlogLayout>
        <title>Tag Not Found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="max-w-2xl mx-auto px-4 py-28 text-center space-y-6">
          <p className="font-serif text-8xl font-bold text-gold-deep/20">404</p>
          <h1 className="font-serif text-3xl font-bold text-ink">Tag not found</h1>
          <Link to="/articles" className="inline-flex items-center gap-2 text-sm text-gold-deep hover:underline">
            <ArrowLeft className="w-4 h-4" /> Browse all articles
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const tagName   = tag?.name ?? (slug ? slug.replace(/-/g, ' ') : '');
  const pageTitle = `Articles tagged "${tagName}" | Chef Peter the Teacher`;
  const canonUrl  = `${SITE_URL}/tag/${slug}`;

  return (
    <BlogLayout>
      <title>{pageTitle}</title>
      {/* Tag pages: noindex to prevent thin/duplicate content issues */}
      <meta name="robots"       content="noindex, follow" />
      <meta name="description"  content={`Browse articles tagged "${tagName}" from Chef Peter the Teacher.`} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:url"   content={canonUrl} />
      <link rel="canonical"     href={canonUrl} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Breadcrumb */}
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: `#${tagName}` },
        ]} />

        {/* Page header */}
        <div className="space-y-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">Tag</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink">
            <span className="text-gold-deep/40">#</span>{tagName}
          </h1>
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
            <p className="font-serif text-xl text-ink">No articles with this tag yet.</p>
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
          <nav className="flex items-center justify-center gap-3" aria-label="Tag pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold/20 text-xs text-ink-soft hover:border-gold/50 hover:text-ink transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs text-muted">Page {page} of {totalPages}</span>
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
