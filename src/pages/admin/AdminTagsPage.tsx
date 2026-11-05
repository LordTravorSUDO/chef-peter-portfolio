/**
 * /admin/tags — Create, rename, search and delete tags (specific topics).
 *
 * Each tag shows how many articles use it. Deleting a tag removes it from
 * those articles (the articles themselves are kept); the confirmation states
 * the exact number first.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tag as TagIcon, Trash2, Plus, X, Check, Pencil, Search } from 'lucide-react';
import { getTags, createTag, updateTag, deleteTag, getTagUsage, type TaxonomyUsage } from '../../lib/services/taxonomy';
import { slugify } from '../../lib/services/articles';
import type { Tag } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function AdminTagsPage() {
  const [tags,     setTags]     = useState<Tag[]>([]);
  const [usage,    setUsage]    = useState<Record<string, TaxonomyUsage>>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [query,    setQuery]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [name,     setName]     = useState('');
  const [slug,     setSlug]     = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([getTags(), getTagUsage().catch(() => ({}))]);
      setTags(t);
      setUsage(u);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tags');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeForm = () => { setShowForm(false); setEditId(null); setName(''); setSlug(''); };

  const startEdit = (tag: Tag) => { setEditId(tag.id); setName(tag.name); setSlug(tag.slug); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const s = slug.trim();
    if (!n) { showToast('A tag name is required.', 'error'); return; }
    if (!SLUG_PATTERN.test(s)) { showToast('The URL slug may only contain lowercase letters, numbers and single hyphens.', 'error'); return; }
    if (tags.some((t) => t.slug === s && t.id !== editId)) { showToast('Another tag already uses this URL slug.', 'error'); return; }
    if (tags.some((t) => t.name.toLowerCase() === n.toLowerCase() && t.id !== editId)) { showToast(`A tag called "${n}" already exists.`, 'error'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateTag(editId, { name: n, slug: s });
        showToast('Tag updated.', 'success');
      } else {
        await createTag({ name: n, slug: s });
        showToast('Tag created.', 'success');
      }
      closeForm();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTag(deleteId);
      showToast('Tag deleted.', 'success');
      setDeleteId(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally { setDeleting(false); }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q)) : tags;
  }, [tags, query]);

  const deleteTarget = tags.find((t) => t.id === deleteId);
  const deleteCount = deleteId ? usage[deleteId]?.total ?? 0 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <title>Tags | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Tags</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            {tags.length} tags · specific topics such as an ingredient, dish or technique
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { closeForm(); setShowForm(true); }}>
          Add tag
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#4A777A] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1A2B40]">{editId ? 'Edit tag' : 'New tag'}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-[#6B7A8D] hover:text-[#1A2B40]"><X className="w-4 h-4" /></button>
          </div>
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!editId) setSlug(slugify(e.target.value)); }} required />
          <Input
            label="URL slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            hint={`Topic page address: /tag/${slug || '…'}`}
            required
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving} icon={<Check className="w-4 h-4" />}>{editId ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      )}

      {tags.length > 8 && (
        <div className="relative max-w-sm">
          <label htmlFor="tag-search" className="sr-only">Search tags</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A8D]" />
          <input
            id="tag-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tags"
            className="w-full rounded-lg border border-[#DDE3EA] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15"
          />
        </div>
      )}

      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={<TagIcon className="w-6 h-6" />}
            title="No tags yet"
            description="Tags let readers find articles on a specific topic, such as an ingredient or technique."
            action={{ label: 'Add first tag', onClick: () => setShowForm(true) }}
          />
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6B7A8D]">No tags match “{query}”.</p>
        ) : (
          <ul className="divide-y divide-[#DDE3EA]">
            {visible.map((tag) => {
              const n = usage[tag.id]?.total ?? 0;
              return (
                <li key={tag.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#F4F6F8]">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A2B40]">{tag.name}</p>
                    <p className="text-xs text-[#6B7A8D] font-mono">/tag/{tag.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-[#6B7A8D]">{n === 0 ? 'Not used' : `${n} article${n === 1 ? '' : 's'}`}</span>
                    <button onClick={() => startEdit(tag)} aria-label={`Edit ${tag.name}`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(tag.id)} aria-label={`Delete ${tag.name}`} className="p-1.5 rounded text-[#6B7A8D] hover:text-[#C0392B] hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tag"
        description={
          deleteCount > 0
            ? `Delete "${deleteTarget?.name}"? It will be removed from ${deleteCount} article${deleteCount === 1 ? '' : 's'}. The articles themselves are kept. This cannot be undone.`
            : `Delete "${deleteTarget?.name}"? No articles use it. This cannot be undone.`
        }
        confirmLabel="Delete tag"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
