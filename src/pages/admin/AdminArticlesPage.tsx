/**
 * /admin/articles — Article list with status filter, pagination, archive/delete.
 */

import React, { useState } from 'react';
import { useCachedQuery } from '../../hooks/useCachedQuery';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Pencil, Archive, Trash2, FileText, Eye, EyeOff } from 'lucide-react';
import { getAllArticlesAdmin, archiveArticle, deleteArticle, unpublishArticle } from '../../lib/services/articles';
import Badge from '../../components/admin/ui/Badge';
import Button from '../../components/admin/ui/Button';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived',  label: 'Archived' },
];

type ArticleRow = {
  id: string; slug: string; title: string; status: string;
  published_at: string | null; updated_at: string; author_display_name: string;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminArticlesPage() {
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter   = searchParams.get('status') ?? '';
  const page           = parseInt(searchParams.get('page') ?? '1', 10);

  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [archiveId,   setArchiveId]   = useState<string | null>(null);
  const [unpublishId, setUnpublishId] = useState<string | null>(null);
  const [actionLoad,  setActionLoad]  = useState(false);

  const { toasts, showToast, dismissToast } = useToast();

  // Paginated (20 per page), only list columns are selected. Cached per
  // page/filter: returning to the list is instant and refreshes quietly.
  const { data, error, loading, refreshing, retry } = useCachedQuery(
    `articles:list:${statusFilter}:${page}`,
    () => getAllArticlesAdmin({ page, status: statusFilter || undefined }),
  );
  const articles   = (data?.articles ?? []) as ArticleRow[];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const load       = retry;

  const handleStatusFilter = (value: string) => {
    setSearchParams(value ? { status: value } : {});
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    setActionLoad(true);
    try {
      await archiveArticle(archiveId);
      showToast('Article archived.', 'success');
      setArchiveId(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Archive failed', 'error');
    } finally {
      setActionLoad(false);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishId) return;
    setActionLoad(true);
    try {
      await unpublishArticle(unpublishId);
      showToast('Article unpublished. Reverted to draft (publication date preserved).', 'success');
      setUnpublishId(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Unpublish failed', 'error');
    } finally {
      setActionLoad(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoad(true);
    try {
      await deleteArticle(deleteId);
      showToast('Article deleted.', 'success');
      setDeleteId(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setActionLoad(false);
    }
  };

  const archiveTarget = articles.find((a) => a.id === archiveId);
  const deleteTarget  = articles.find((a) => a.id === deleteId);
  const unpublishTarget = articles.find((a) => a.id === unpublishId);

  return (
    <div className="space-y-6 max-w-5xl">
      <title>Articles | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Articles</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{total} article{total !== 1 ? 's' : ''} total</p>
        </div>
        <Button icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/admin/articles/new')}>
          New article
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${statusFilter === f.value
                ? 'bg-[#1B365D] text-white'
                : 'bg-white text-[#6B7A8D] border border-[#DDE3EA] hover:border-[#1B365D] hover:text-[#1B365D]'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700" role="alert">
          Could not load articles: {error} — <button onClick={retry} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className={`bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden transition-opacity ${refreshing ? 'opacity-70' : ''}`} aria-busy={loading || refreshing}>
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : !data && error ? (
          <div className="p-12 text-center text-sm text-[#6B7A8D]">Articles could not be loaded.</div>
        ) : articles.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={statusFilter ? `No ${statusFilter} articles` : 'No articles yet'}
            description="Start creating content for Chef Peter's audience."
            action={{ label: 'Create first article', onClick: () => navigate('/admin/articles/new') }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#DDE3EA] bg-[#F4F6F8]">
                    <th className="text-left px-4 py-3 font-medium text-[#6B7A8D] text-xs uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7A8D] text-xs uppercase tracking-wide hidden sm:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7A8D] text-xs uppercase tracking-wide hidden md:table-cell">Updated</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3EA]">
                  {articles.map((a) => (
                    <tr key={a.id} className="hover:bg-[#F4F6F8] transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1A2B40] truncate max-w-xs">{a.title}</div>
                        <div className="text-xs text-[#6B7A8D] mt-0.5 sm:hidden">
                          <Badge status={a.status} /> · {formatDate(a.updated_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-[#6B7A8D] hidden md:table-cell">
                        {formatDate(a.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'published' && (
                            <a
                              href={`/articles/${a.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="View article"
                              className="p-1.5 rounded text-[#6B7A8D] hover:text-[#4A777A] hover:bg-[#F4F6F8] transition"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            to={`/admin/articles/${a.id}/edit`}
                            aria-label="Edit article"
                            className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {a.status === 'published' && (
                            <button
                              onClick={() => setUnpublishId(a.id)}
                              aria-label="Unpublish article"
                              className="p-1.5 rounded text-[#6B7A8D] hover:text-[#D99B26] hover:bg-amber-50 transition"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                          {a.status !== 'archived' && (
                            <button
                              onClick={() => setArchiveId(a.id)}
                              aria-label="Archive article"
                              className="p-1.5 rounded text-[#6B7A8D] hover:text-[#D99B26] hover:bg-amber-50 transition"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {(a.status === 'draft' || a.status === 'archived') && (
                            <button
                              onClick={() => setDeleteId(a.id)}
                              aria-label="Delete article"
                              className="p-1.5 rounded text-[#6B7A8D] hover:text-[#C0392B] hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#DDE3EA] flex items-center justify-between text-xs text-[#6B7A8D]">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setSearchParams({ ...(statusFilter ? { status: statusFilter } : {}), page: String(page - 1) })}
                    className="px-3 py-1 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setSearchParams({ ...(statusFilter ? { status: statusFilter } : {}), page: String(page + 1) })}
                    className="px-3 py-1 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveId}
        title="Archive article"
        description={`Archive "${archiveTarget?.title}"? It will be hidden from the public but not deleted.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveId(null)}
        loading={actionLoad}
      />

      {/* Unpublish confirm */}
      <ConfirmDialog
        open={!!unpublishId}
        title="Unpublish article"
        description={`Unpublish "${unpublishTarget?.title}"? It will revert to draft and become invisible to the public. The original publication date will be preserved for re-publishing.`}
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setUnpublishId(null)}
        loading={actionLoad}
      />

      {/* Delete confirm — only for draft/archived */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete article"
        description={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={actionLoad}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
