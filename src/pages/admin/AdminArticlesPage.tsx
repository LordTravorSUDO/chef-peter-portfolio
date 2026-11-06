/**
 * /admin/articles — Article management.
 *
 * Search (title or URL), status tabs, category, format (after the
 * knowledge-platform migration) and date filters; pagination; clear status
 * and featured indicators; edit, preview, view live, unpublish, archive,
 * restore and delete actions with confirmation for anything that changes
 * what visitors see or removes content.
 *
 * All filter state lives in the URL, so a filtered list can be bookmarked and
 * the Back button returns to it.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Pencil, Archive, Trash2, FileText, Eye, EyeOff, ExternalLink, Star, RotateCcw, Search, SlidersHorizontal, X,
} from 'lucide-react';
import {
  getAllArticlesAdmin, archiveArticle, deleteArticle, unpublishArticle, restoreArticle,
  type AdminArticleRow, type AdminDateField,
} from '../../lib/services/articles';
import { getCategories } from '../../lib/services/taxonomy';
import { hasKnowledgeSchema } from '../../lib/services/knowledgeSchema';
import { ARTICLE_TYPES, ARTICLE_TYPE_MAP, articleTypeOf, isArticleType } from '../../lib/knowledge/articleTypes';
import { formatInZone } from '../../lib/datetime';
import type { Category } from '../../types/article';
import Badge from '../../components/admin/ui/Badge';
import Button from '../../components/admin/ui/Button';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived',  label: 'Archived' },
];

const DATE_FIELDS: Array<{ value: AdminDateField; label: string }> = [
  { value: 'updated_at',   label: 'Last updated' },
  { value: 'published_at', label: 'Published' },
  { value: 'created_at',   label: 'Created' },
];

const control = 'mt-1 block w-full rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 text-sm text-[#1A2B40] focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** One line explaining where the article stands. */
function statusDetail(a: AdminArticleRow): string {
  if (a.status === 'scheduled' && a.scheduled_for) {
    return `Goes live ${formatInZone(a.scheduled_for, undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (Kampala)`;
  }
  if (a.status === 'published') return `Live since ${formatDate(a.published_at)}`;
  if (a.status === 'draft') return a.published_at ? 'Unpublished — not visible' : 'Not visible to visitors';
  return 'Hidden from the website';
}

export default function AdminArticlesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') ?? '';
  const q            = params.get('q') ?? '';
  const categoryId   = params.get('category') ?? '';
  const typeParam    = params.get('type') ?? '';
  const articleType  = isArticleType(typeParam) ? typeParam : undefined;
  const dateField    = (DATE_FIELDS.some((d) => d.value === params.get('date')) ? params.get('date') : 'updated_at') as AdminDateField;
  const dateFrom     = params.get('from') ?? '';
  const dateTo       = params.get('to') ?? '';
  const page         = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [articles,    setArticles]    = useState<AdminArticleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [v2,          setV2]          = useState(false);
  const [searchText,  setSearchText]  = useState(q);
  const [showFilters, setShowFilters] = useState(!!(categoryId || articleType || dateFrom || dateTo));
  const [confirm,     setConfirm]     = useState<null | { kind: 'archive' | 'delete' | 'unpublish' | 'restore'; id: string }>(null);
  const [actionLoad,  setActionLoad]  = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    hasKnowledgeSchema().then(setV2).catch(() => {});
  }, []);
  useEffect(() => setSearchText(q), [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllArticlesAdmin({
        page, pageSize: PAGE_SIZE, status: statusFilter || undefined, search: q || undefined,
        categoryId: categoryId || undefined, articleType, dateField, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
      });
      setArticles(res.articles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, q, categoryId, articleType, dateField, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const filtersActive = !!(q || categoryId || articleType || dateFrom || dateTo);
  const clearFilters = () => {
    setSearchText('');
    setParams(statusFilter ? { status: statusFilter } : {});
  };

  const target = confirm ? articles.find((a) => a.id === confirm.id) : undefined;

  const runAction = async () => {
    if (!confirm) return;
    setActionLoad(true);
    try {
      if (confirm.kind === 'archive')   { await archiveArticle(confirm.id);   showToast('Article archived. It is no longer visible on the website.', 'success'); }
      if (confirm.kind === 'unpublish') { await unpublishArticle(confirm.id); showToast('Article unpublished and returned to draft. The original publication date is kept.', 'success'); }
      if (confirm.kind === 'restore')   { await restoreArticle(confirm.id);   showToast('Article restored as a draft.', 'success'); }
      if (confirm.kind === 'delete')    { await deleteArticle(confirm.id);    showToast('Article deleted.', 'success'); }
      setConfirm(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'The action failed', 'error');
    } finally {
      setActionLoad(false);
    }
  };

  const confirmCopy: Record<string, { title: string; description: string; label: string }> = {
    archive:   { title: 'Archive article', label: 'Archive', description: `Archive "${target?.title}"? ${target?.status === 'published' ? 'It will be removed from the website immediately. ' : ''}You can restore it later.` },
    unpublish: { title: 'Unpublish article', label: 'Unpublish', description: `Unpublish "${target?.title}"? It will be removed from the website and returned to draft. Its publication date is kept.` },
    restore:   { title: 'Restore article', label: 'Restore as draft', description: `Restore "${target?.title}" as a draft? It stays hidden until you publish it.` },
    delete:    { title: 'Delete article permanently', label: 'Delete permanently', description: `Permanently delete "${target?.title}" and its revision history? This cannot be undone. To keep it but hide it, archive it instead.` },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <title>Articles | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Articles</h1>
          <p className="text-sm text-[#5F6E80] mt-0.5" aria-live="polite">
            {loading ? 'Loading…' : `${total} article${total !== 1 ? 's' : ''}${filtersActive || statusFilter ? ' match' : ' in total'}`}
          </p>
        </div>
        <Button icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/admin/articles/new')}>
          New article
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={statusFilter === f.value}
            onClick={() => update({ status: f.value })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === f.value ? 'bg-[#1B365D] text-white' : 'bg-white text-[#5F6E80] border border-[#DDE3EA] hover:border-[#1B365D] hover:text-[#1B365D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => { e.preventDefault(); update({ q: searchText.trim() }); }}
          >
            <label htmlFor="article-search" className="sr-only">Search articles by title or URL</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6E80]" />
            <input
              id="article-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title or URL slug — press Enter"
              className="w-full rounded-lg border border-[#DDE3EA] py-2 pl-9 pr-3 text-sm focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15"
            />
          </form>
          <Button variant="ghost" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="article-filters">
            Filters
          </Button>
          {filtersActive && (
            <Button variant="ghost" icon={<X className="w-4 h-4" />} onClick={clearFilters}>Clear filters</Button>
          )}
        </div>

        {showFilters && (
          <div id="article-filters" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="f-category" className="block text-xs font-medium text-[#5F6E80]">Category</label>
              <select id="f-category" className={control} value={categoryId} onChange={(e) => update({ category: e.target.value })}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {v2 && (
              <div>
                <label htmlFor="f-type" className="block text-xs font-medium text-[#5F6E80]">Format</label>
                <select id="f-type" className={control} value={articleType ?? ''} onChange={(e) => update({ type: e.target.value })}>
                  <option value="">All formats</option>
                  {ARTICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-date" className="block text-xs font-medium text-[#5F6E80]">Date</label>
              <select id="f-date" className={control} value={dateField} onChange={(e) => update({ date: e.target.value === 'updated_at' ? '' : e.target.value })}>
                {DATE_FIELDS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-from" className="block text-xs font-medium text-[#5F6E80]">From</label>
              <input id="f-from" type="date" className={control} value={dateFrom} max={dateTo || undefined} onChange={(e) => update({ from: e.target.value })} />
            </div>
            <div>
              <label htmlFor="f-to" className="block text-xs font-medium text-[#5F6E80]">To</label>
              <input id="f-to" type="date" className={control} value={dateTo} min={dateFrom || undefined} onChange={(e) => update({ to: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error} — <button onClick={load} className="underline">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : articles.length === 0 ? (
          filtersActive || statusFilter ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No articles match"
              description="Try a different search word or clear the filters."
              action={{ label: 'Clear filters', onClick: () => setParams({}) }}
            />
          ) : (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No articles yet"
              description="Start the culinary library with a first article."
              action={{ label: 'Create first article', onClick: () => navigate('/admin/articles/new') }}
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#DDE3EA] bg-[#F4F6F8]">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-[#5F6E80] text-xs uppercase tracking-wide">Article</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-[#5F6E80] text-xs uppercase tracking-wide hidden md:table-cell">Status</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-[#5F6E80] text-xs uppercase tracking-wide hidden lg:table-cell">
                      {DATE_FIELDS.find((d) => d.value === dateField)?.label}
                    </th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3EA]">
                  {articles.map((a) => {
                    const primary = a.article_categories?.find((ac) => ac.is_primary)?.categories ?? a.article_categories?.[0]?.categories;
                    const type = articleTypeOf(a);
                    return (
                      <tr key={a.id} className="hover:bg-[#F4F6F8] transition align-top">
                        <td className="px-4 py-3">
                          <Link to={`/admin/articles/${a.id}/edit`} className="font-medium text-[#1A2B40] hover:text-[#1B365D] hover:underline">
                            {a.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5F6E80]">
                            {a.is_featured && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">
                                <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Featured
                              </span>
                            )}
                            {a.is_editors_pick && <span className="rounded bg-[#4A777A]/10 px-1.5 py-0.5 font-medium text-[#2F5D60]">Editor’s pick</span>}
                            <span>{primary?.name ?? 'No category'}</span>
                            {v2 && type !== 'educational' && <span>· {ARTICLE_TYPE_MAP[type].label}</span>}
                            <span className="font-mono">· /{a.slug}</span>
                          </div>
                          <div className="mt-1.5 md:hidden"><Badge status={a.status} /> <span className="text-xs text-[#5F6E80]">{statusDetail(a)}</span></div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge status={a.status} />
                          <p className="mt-1 text-xs text-[#5F6E80] max-w-[12rem]">{statusDetail(a)}</p>
                        </td>
                        <td className="px-4 py-3 text-[#5F6E80] hidden lg:table-cell whitespace-nowrap">
                          {formatDate(a[dateField])}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <Link to={`/admin/articles/${a.id}/edit`} aria-label={`Edit ${a.title}`} title="Edit" className="p-1.5 rounded text-[#5F6E80] hover:text-[#1B365D] hover:bg-white transition">
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <Link to={`/admin/articles/${a.id}/preview`} target="_blank" aria-label={`Preview ${a.title} (opens in a new tab)`} title="Preview" className="p-1.5 rounded text-[#5F6E80] hover:text-[#1B365D] hover:bg-white transition">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {a.status === 'published' && (
                              <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${a.title} on the website (opens in a new tab)`} title="View on website" className="p-1.5 rounded text-[#5F6E80] hover:text-[#4A777A] hover:bg-white transition">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {a.status === 'published' && (
                              <button onClick={() => setConfirm({ kind: 'unpublish', id: a.id })} aria-label={`Unpublish ${a.title}`} title="Unpublish" className="p-1.5 rounded text-[#5F6E80] hover:text-[#8A5A12] hover:bg-amber-50 transition">
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                            {a.status !== 'archived' ? (
                              <button onClick={() => setConfirm({ kind: 'archive', id: a.id })} aria-label={`Archive ${a.title}`} title="Archive" className="p-1.5 rounded text-[#5F6E80] hover:text-[#8A5A12] hover:bg-amber-50 transition">
                                <Archive className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => setConfirm({ kind: 'restore', id: a.id })} aria-label={`Restore ${a.title} as draft`} title="Restore as draft" className="p-1.5 rounded text-[#5F6E80] hover:text-[#1B365D] hover:bg-white transition">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {(a.status === 'draft' || a.status === 'archived') && (
                              <button onClick={() => setConfirm({ kind: 'delete', id: a.id })} aria-label={`Delete ${a.title}`} title="Delete permanently" className="p-1.5 rounded text-[#5F6E80] hover:text-[#C0392B] hover:bg-red-50 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav aria-label="Pagination" className="px-4 py-3 border-t border-[#DDE3EA] flex items-center justify-between text-xs text-[#5F6E80]">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="px-3 py-1 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition">← Previous</button>
                  <button disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })} className="px-3 py-1 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition">Next →</button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? confirmCopy[confirm.kind].title : ''}
        description={confirm ? confirmCopy[confirm.kind].description : ''}
        confirmLabel={confirm ? confirmCopy[confirm.kind].label : ''}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
        loading={actionLoad}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
