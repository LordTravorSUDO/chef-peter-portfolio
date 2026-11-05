/**
 * /tag/:slug — articles on a specific topic (tag).
 *
 * SEO decision (unchanged): tag pages are noindex, follow. They are useful for
 * navigation but are thin filtered lists; category pages are the canonical
 * discovery path. The canonical URL still points to the tag page itself.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getPublishedArticles } from '../../lib/services/articles';
import { getTagBySlug } from '../../lib/services/taxonomy';
import type { ArticleCard, Tag } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import Breadcrumb from '../../components/blog/Breadcrumb';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import { PageMeta, Pagination } from '../../components/knowledge/LibraryParts';

const PAGE_SIZE = 12;

export default function TagPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [tag, setTag] = useState<Tag | null | undefined>(undefined);
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTag(undefined);
    getTagBySlug(slug).then(setTag).catch(() => setTag(null));
  }, [slug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({ page, pageSize: PAGE_SIZE, tagSlug: slug });
      setArticles(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Articles could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (tag === null) {
    return (
      <BlogLayout>
        <title>Topic not found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-serif text-[2rem] font-semibold text-ink">Topic not found</h1>
          <Link to="/articles" className="mt-6 inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the library
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const name = tag?.name ?? '';

  return (
    <BlogLayout>
      {tag && (
        <PageMeta
          title={`${name} | Culinary Library | Chef Peter the Teacher`}
          description={`Articles about ${name} from Chef Peter the Teacher’s culinary library.`}
          path={`/tag/${tag.slug}`}
          noindex
        />
      )}

      <header className="border-b border-sand bg-paper">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8">
          <Breadcrumb crumbs={[{ label: 'Home', href: '/' }, { label: 'Library', href: '/articles' }, { label: name || '…' }]} />
          <p className="mt-8 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">Topic</p>
          {tag ? (
            <h1 className="mt-2 font-serif text-[2.25rem] font-semibold leading-tight text-ink sm:text-[3rem]">{name}</h1>
          ) : (
            <div className="mt-3 h-12 w-1/2 animate-pulse rounded bg-sand/60" aria-hidden="true" />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="mb-8 text-[0.9375rem] text-muted" aria-live="polite">
          {loading ? 'Loading…' : `${total} article${total === 1 ? '' : 's'}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`}
        </p>
        {error ? (
          <p role="alert" className="text-ink-soft">
            {error}{' '}
            <button type="button" onClick={load} className="font-semibold text-ink underline">
              Try again
            </button>
          </p>
        ) : loading ? (
          <ArticleGridSkeleton count={6} />
        ) : articles.length ? (
          <ArticleGrid articles={articles} />
        ) : (
          <p className="text-ink-soft">No published articles on this topic yet.</p>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={(p) => {
            setParams({ page: String(p) });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <p className="mt-12">
          <Link to="/articles" className="inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the library
          </Link>
        </p>
      </div>
    </BlogLayout>
  );
}
