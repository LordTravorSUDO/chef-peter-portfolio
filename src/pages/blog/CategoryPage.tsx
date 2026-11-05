/**
 * /category/:slug — a subject in the culinary library.
 *
 *   - Category name and description from the database
 *   - Links to the other categories (in display order)
 *   - Optional format filter (?type=) once the knowledge-platform migration is applied
 *   - Pagination (?page=); page 2+ is noindex, canonical always points to page 1
 *   - Deactivated categories keep working for existing links but are noindex
 *     and hidden from navigation
 *   - 404 state for unknown slugs
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getPublishedArticles } from '../../lib/services/articles';
import { getCategoryBySlug, getPublicCategories } from '../../lib/services/taxonomy';
import { hasKnowledgeSchema } from '../../lib/services/knowledgeSchema';
import { ARTICLE_TYPES, isArticleType } from '../../lib/knowledge/articleTypes';
import type { ArticleCard, Category } from '../../types/article';
import BlogLayout from '../../components/blog/BlogLayout';
import Breadcrumb from '../../components/blog/Breadcrumb';
import ArticleGrid, { ArticleGridSkeleton } from '../../components/blog/ArticleGrid';
import { PageMeta, Pagination, SITE_URL } from '../../components/knowledge/LibraryParts';

const PAGE_SIZE = 12;

export default function CategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const typeParam = params.get('type') ?? '';
  const articleType = isArticleType(typeParam) ? typeParam : undefined;

  const [category, setCategory] = useState<Category | null | undefined>(undefined);
  const [siblings, setSiblings] = useState<Category[]>([]);
  const [v2, setV2] = useState(false);
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategory(undefined);
    getCategoryBySlug(slug).then(setCategory).catch(() => setCategory(null));
  }, [slug]);

  useEffect(() => {
    getPublicCategories().then(setSiblings).catch(() => {});
    hasKnowledgeSchema().then(setV2).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublishedArticles({ page, pageSize: PAGE_SIZE, categorySlug: slug, articleType });
      setArticles(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Articles could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug, page, articleType]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (category === null) {
    return (
      <BlogLayout>
        <title>Category not found | Chef Peter the Teacher</title>
        <meta name="robots" content="noindex, follow" />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-serif text-[2rem] font-semibold text-ink">Category not found</h1>
          <p className="mt-3 text-ink-soft">This subject does not exist or has been renamed.</p>
          <Link to="/articles" className="mt-6 inline-flex items-center gap-2 font-semibold text-ink underline decoration-gold underline-offset-4">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the library
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const name = category?.name ?? '';
  const inactive = category?.is_active === false;
  const description =
    category?.description || `Articles on ${name.toLowerCase()} from Chef Peter the Teacher’s culinary library.`;

  return (
    <BlogLayout>
      {category && (
        <PageMeta
          title={`${name}${page > 1 ? ` — page ${page}` : ''} | Culinary Library | Chef Peter the Teacher`}
          description={description.slice(0, 160)}
          path={`/category/${category.slug}`}
          noindex={page > 1 || inactive || !!articleType}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name,
            description,
            url: `${SITE_URL}/category/${category.slug}`,
            isPartOf: { '@type': 'CollectionPage', name: 'The Culinary Library', url: `${SITE_URL}/articles` },
          }}
        />
      )}

      <header className="border-b border-sand bg-paper">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8">
          <Breadcrumb crumbs={[{ label: 'Home', href: '/' }, { label: 'Library', href: '/articles' }, { label: name || '…' }]} />
          <p className="mt-8 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">Subject</p>
          {category ? (
            <h1 className="mt-2 font-serif text-[2.25rem] font-semibold leading-tight text-ink sm:text-[3rem]">{name}</h1>
          ) : (
            <div className="mt-3 h-12 w-2/3 animate-pulse rounded bg-sand/60" aria-hidden="true" />
          )}
          {category?.description && <p className="mt-4 max-w-3xl text-[1.125rem] leading-relaxed text-ink-soft">{category.description}</p>}
          {inactive && (
            <p className="mt-4 max-w-3xl rounded-md bg-gold-wash px-4 py-3 text-ink-soft">
              This subject is no longer listed in the library, but its articles remain available.
            </p>
          )}

          {siblings.length > 1 && (
            <nav aria-label="Other subjects" className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
              {siblings.map((c) => {
                const current = c.slug === slug;
                return (
                  <Link
                    key={c.id}
                    to={`/category/${c.slug}`}
                    aria-current={current ? 'page' : undefined}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[0.9375rem] transition-colors ${
                      current ? 'border-charcoal bg-charcoal text-cream' : 'border-sand-strong bg-card text-ink-soft hover:border-ink hover:text-ink'
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[0.9375rem] text-muted" aria-live="polite">
            {loading ? 'Loading…' : `${total} article${total === 1 ? '' : 's'}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`}
          </p>
          {v2 && (
            <div>
              <label htmlFor="category-type" className="block text-[0.875rem] font-semibold text-ink">
                Format
              </label>
              <select
                id="category-type"
                value={articleType ?? ''}
                onChange={(e) => setParam('type', e.target.value)}
                className="mt-1 rounded-md border border-sand-strong bg-card px-3 py-2.5 text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                <option value="">All formats</option>
                {ARTICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

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
          <div className="py-12">
            <p className="font-serif text-[1.5rem] text-ink">Articles on this subject are being prepared.</p>
            <p className="mt-2 max-w-lg text-ink-soft">Browse another subject or search the whole library.</p>
            <Link to="/articles" className="mt-6 inline-flex font-semibold text-ink underline decoration-gold underline-offset-4">
              Back to the library
            </Link>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={(p) => setParam('page', String(p))} />
      </div>
    </BlogLayout>
  );
}
