/**
 * /admin/categories — Create and manage content categories.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
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
          <p className="text-sm text-[#6B7A8D] mt-0.5">{categories.length} categories</p>
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
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EA]">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#F4F6F8] transition">
                  <td className="px-4 py-3 font-medium text-[#1A2B40]">
                    {cat.name}
                    {cat.description && <p className="text-xs text-[#6B7A8D] font-normal mt-0.5">{cat.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7A8D] font-mono text-xs hidden sm:table-cell">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
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
        description={`Delete "${deleteTarget?.name}"? Articles in this category will become uncategorised.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
