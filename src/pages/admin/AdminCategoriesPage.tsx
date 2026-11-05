/**
 * /admin/categories — Create, edit, organise and safely delete categories.
 *
 * Safety: a category that contains articles cannot be deleted directly. The
 * administrator first chooses another category to move its articles to (or,
 * after the knowledge-platform migration, hides the category instead).
 * Ordering and hiding need the knowledge-platform migration (sort_order,
 * is_active); without it they are shown as unavailable.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Pencil, Trash2, Plus, X, Check, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { hasKnowledgeSchema } from '../../lib/services/knowledgeSchema';
import {
  getCategories, createCategory, updateCategory, getCategoryUsage, reassignCategoryArticles, deleteEmptyCategory,
  type TaxonomyUsage,
} from '../../lib/services/taxonomy';
import { slugify } from '../../lib/services/articles';
import type { Category } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import AdminDialog from '../../components/admin/ui/AdminDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

interface InlineForm { name: string; slug: string; description: string; }
const EMPTY_FORM: InlineForm = { name: '', slug: '', description: '' };
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function AdminCategoriesPage() {
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [usage,       setUsage]       = useState<Record<string, TaxonomyUsage>>({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState<InlineForm>(EMPTY_FORM);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [moveTo,      setMoveTo]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [canOrganise, setCanOrganise] = useState(false);
  const [busyId,      setBusyId]      = useState<string | null>(null);
  const { toasts, showToast, dismissToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, use] = await Promise.all([getCategories(), getCategoryUsage().catch(() => ({}))]);
      setCategories(cats);
      setUsage(use);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { hasKnowledgeSchema().then(setCanOrganise).catch(() => setCanOrganise(false)); }, []);

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name) { showToast('A category name is required.', 'error'); return; }
    if (!SLUG_PATTERN.test(slug)) { showToast('The URL slug may only contain lowercase letters, numbers and single hyphens.', 'error'); return; }
    if (categories.some((c) => c.slug === slug && c.id !== editId)) { showToast('Another category already uses this URL slug.', 'error'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateCategory(editId, { name, slug, description: form.description.trim() || null });
        showToast('Category updated.', 'success');
      } else {
        await createCategory({ name, slug, description: form.description.trim() || null, image_id: null });
        showToast('Category created.', 'success');
      }
      closeForm();
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const startEdit = (cat: Category) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '' });
    setEditId(cat.id);
    setShowForm(true);
  };

  /** Moves a category up/down by renumbering sort_order 1..n for the affected rows. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(categories[index].id);
    try {
      const updates = reordered.map((c, i) => ({ c, order: i + 1 })).filter(({ c, order }) => c.sort_order !== order);
      for (const { c, order } of updates) await updateCategory(c.id, { sort_order: order });
      setCategories(reordered.map((c, i) => ({ ...c, sort_order: i + 1 })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not reorder', 'error');
      load();
    } finally { setBusyId(null); }
  };

  const toggleActive = async (cat: Category) => {
    setBusyId(cat.id);
    try {
      const next = cat.is_active === false;
      await updateCategory(cat.id, { is_active: next });
      setCategories((list) => list.map((c) => (c.id === cat.id ? { ...c, is_active: next } : c)));
      showToast(next ? `"${cat.name}" is visible in the library again.` : `"${cat.name}" is hidden from library navigation. Its articles are unchanged.`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not update', 'error');
    } finally { setBusyId(null); }
  };

  const deleteTarget = categories.find((c) => c.id === deleteId);
  const deleteUsage = deleteId ? usage[deleteId] : undefined;
  const hasArticles = (deleteUsage?.total ?? 0) > 0;
  const otherCategories = categories.filter((c) => c.id !== deleteId);

  const openDelete = (id: string) => { setDeleteId(id); setMoveTo(''); };

  const handleDelete = async () => {
    if (!deleteId || !deleteTarget) return;
    setDeleting(true);
    try {
      if (hasArticles) {
        if (!moveTo) { showToast('Choose the category that will receive the articles.', 'error'); setDeleting(false); return; }
        const moved = await reassignCategoryArticles(deleteId, moveTo);
        const destination = categories.find((c) => c.id === moveTo)?.name;
        await deleteEmptyCategory(deleteId);
        showToast(`Moved ${moved} article${moved === 1 ? '' : 's'} to "${destination}" and deleted "${deleteTarget.name}".`, 'success');
      } else {
        await deleteEmptyCategory(deleteId);
        showToast(`Category "${deleteTarget.name}" deleted.`, 'success');
      }
      setDeleteId(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
      load();
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <title>Categories | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Categories</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            {categories.length} categories · the library shows them in this order
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}>
          Add category
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#4A777A] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1A2B40]">{editId ? 'Edit category' : 'New category'}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-[#6B7A8D] hover:text-[#1A2B40]"><X className="w-4 h-4" /></button>
          </div>
          <Input label="Name" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editId ? form.slug : slugify(e.target.value) }); }} required />
          <Input
            label="URL slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            hint={editId && usage[editId]?.published ? 'Changing the slug changes the category page address (/category/…). Existing links to the old address will stop working.' : `Page address: /category/${form.slug || '…'}`}
            required
          />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} hint="Shown at the top of the category page and on the library home page." />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving} icon={<Check className="w-4 h-4" />}>{editId ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      )}

      {!canOrganise && !loading && (
        <div className="bg-[#1B365D]/5 border border-[#1B365D]/15 rounded-lg p-4 text-sm text-[#1A2B40]">
          Reordering and hiding categories become available after the knowledge-platform database upgrade
          (awaiting approval — see docs/knowledge-platform.md). Until then categories appear alphabetically.
        </div>
      )}

      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-6 h-6" />}
            title="No categories yet"
            description="Categories organise the library by subject."
            action={{ label: 'Add first category', onClick: () => setShowForm(true) }}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DDE3EA] bg-[#F4F6F8]">
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Category</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Articles</th>
                {canOrganise && <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Status</th>}
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EA]">
              {categories.map((cat, index) => {
                const u = usage[cat.id] ?? { total: 0, published: 0 };
                return (
                  <tr key={cat.id} className={`hover:bg-[#F4F6F8] transition ${cat.is_active === false ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A2B40]">{cat.name}</p>
                      <p className="text-xs text-[#6B7A8D] font-mono">/category/{cat.slug}</p>
                      {cat.description && <p className="text-xs text-[#6B7A8D] mt-0.5 line-clamp-2 max-w-md">{cat.description}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.total > 0 ? (
                        <Link to={`/admin/articles?category=${cat.id}`} className="text-[#1B365D] hover:underline">
                          {u.total} <span className="text-[#6B7A8D]">({u.published} published)</span>
                        </Link>
                      ) : (
                        <span className="text-[#6B7A8D]">None</span>
                      )}
                    </td>
                    {canOrganise && (
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.is_active === false ? 'bg-[#F4F6F8] text-[#6B7A8D]' : 'bg-[#4A777A]/10 text-[#2F5D60]'}`}>
                          {cat.is_active === false ? 'Hidden' : 'Visible'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canOrganise && (
                          <>
                            <button onClick={() => move(index, -1)} disabled={index === 0 || !!busyId} aria-label={`Move ${cat.name} up`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-white transition disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => move(index, 1)} disabled={index === categories.length - 1 || !!busyId} aria-label={`Move ${cat.name} down`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-white transition disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                            <button onClick={() => toggleActive(cat)} disabled={!!busyId} aria-label={cat.is_active === false ? `Show ${cat.name}` : `Hide ${cat.name}`} title={cat.is_active === false ? 'Show in library' : 'Hide from library (articles are kept)'} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-white transition disabled:opacity-30">
                              {cat.is_active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        <button onClick={() => startEdit(cat)} aria-label={`Edit ${cat.name}`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-white transition"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openDelete(cat.id)} aria-label={`Delete ${cat.name}`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#C0392B] hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Empty category: simple confirmation */}
      <ConfirmDialog
        open={!!deleteId && !hasArticles}
        title="Delete category"
        description={`Delete "${deleteTarget?.name}"? It contains no articles. This cannot be undone.`}
        confirmLabel="Delete category"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      {/* Category with articles: move them first */}
      <AdminDialog
        open={!!deleteId && hasArticles}
        title={`Delete "${deleteTarget?.name ?? ''}"`}
        onClose={() => setDeleteId(null)}
        busy={deleting}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={!moveTo}>
              Move articles and delete
            </Button>
          </>
        }
      >
        <p>
          This category contains <strong>{deleteUsage?.total} article{deleteUsage?.total === 1 ? '' : 's'}</strong>
          {' '}({deleteUsage?.published} published). To keep every article in a subject, choose where they should go.
          Articles already in that category simply lose this one.
        </p>
        <div>
          <label htmlFor="move-to" className="block text-sm font-medium">Move the articles to</label>
          <select id="move-to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#DDE3EA] px-3 py-2 text-sm">
            <option value="">Choose a category…</option>
            {otherCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {canOrganise && (
          <p className="text-[#6B7A8D]">
            Prefer to keep the category? Close this window and use <strong>Hide</strong> instead — it disappears from the
            library but nothing is moved or deleted.
          </p>
        )}
      </AdminDialog>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
