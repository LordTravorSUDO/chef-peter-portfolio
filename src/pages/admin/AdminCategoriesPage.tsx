/**
 * /admin/categories — Create and manage content categories.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Pencil, Trash2, Plus, X, Check, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { hasKnowledgeSchema } from '../../lib/services/knowledgeSchema';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/services/taxonomy';
import { slugify } from '../../lib/services/articles';
import type { Category } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

interface InlineForm { name: string; slug: string; description: string; }
const EMPTY_FORM: InlineForm = { name: '', slug: '', description: '' };

export default function AdminCategoriesPage() {
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState<InlineForm>(EMPTY_FORM);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  // Ordering and activation need the knowledge-platform migration
  const [canOrganise, setCanOrganise] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { hasKnowledgeSchema().then(setCanOrganise).catch(() => setCanOrganise(false)); }, []);

  /** Moves a category up/down by renumbering sort_order 1..n for the affected rows. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(categories[index].id);
    try {
      const updates = reordered
        .map((c, i) => ({ c, order: i + 1 }))
        .filter(({ c, order }) => c.sort_order !== order);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateCategory(editId, { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim() || null });
        showToast('Category updated.', 'success');
      } else {
        await createCategory({ name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim() || null, image_id: null });
        showToast('Category created.', 'success');
      }
      setForm(EMPTY_FORM); setShowForm(false); setEditId(null);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteId);
      showToast('Category deleted.', 'success');
      setDeleteId(null);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally { setDeleting(false); }
  };

  const deleteTarget = categories.find((c) => c.id === deleteId);

  return (
    <div className="space-y-6 max-w-2xl">
      <title>Categories | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Categories</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{categories.length} categories · shown to visitors in this order</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}>
          Add category
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#4A777A] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1A2B40]">{editId ? 'Edit category' : 'New category'}</h2>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }} className="text-[#6B7A8D] hover:text-[#1A2B40]"><X className="w-4 h-4" /></button>
          </div>
          <Input label="Name" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editId ? form.slug : slugify(e.target.value) }); }} required />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} hint="URL-safe identifier" required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
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

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-6 h-6" />}
            title="No categories yet"
            description="Categories help organise articles by topic."
            action={{ label: 'Add first category', onClick: () => setShowForm(true) }}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DDE3EA] bg-[#F4F6F8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide hidden sm:table-cell">Slug</th>
                {canOrganise && <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Status</th>}
                <th className={`${canOrganise ? 'w-44' : 'w-20'} px-4 py-3`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EA]">
              {categories.map((cat, index) => (
                <tr key={cat.id} className={`hover:bg-[#F4F6F8] transition ${cat.is_active === false ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[#1A2B40]">
                    {cat.name}
                    {cat.description && <p className="text-xs text-[#6B7A8D] font-normal mt-0.5">{cat.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7A8D] font-mono text-xs hidden sm:table-cell">{cat.slug}</td>
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
                          <button onClick={() => move(index, -1)} disabled={index === 0 || !!busyId} aria-label={`Move ${cat.name} up`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                          <button onClick={() => move(index, 1)} disabled={index === categories.length - 1 || !!busyId} aria-label={`Move ${cat.name} down`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive(cat)} disabled={!!busyId} aria-label={cat.is_active === false ? `Show ${cat.name}` : `Hide ${cat.name}`} title={cat.is_active === false ? 'Show in library' : 'Hide from library (articles are kept)'} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition disabled:opacity-30">
                            {cat.is_active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                      <button onClick={() => startEdit(cat)} aria-label="Edit" className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(cat.id)} aria-label="Delete" className="p-1.5 rounded text-[#6B7A8D] hover:text-[#C0392B] hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete category"
        description={`Delete "${deleteTarget?.name}"? The articles themselves are kept, but they will no longer be linked to this category${canOrganise ? '. To keep the links, hide the category instead' : ''}.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
