/**
 * /admin/tags — Create and manage tags.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Trash2, Plus, X, Check } from 'lucide-react';
import { getTags, createTag, deleteTag } from '../../lib/services/taxonomy';
import { slugify } from '../../lib/services/articles';
import type { Tag } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';
import EmptyState from '../../components/admin/ui/EmptyState';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

export default function AdminTagsPage() {
  const [tags,       setTags]     = useState<Tag[]>([]);
  const [loading,    setLoading]  = useState(true);
  const [showForm,   setShowForm] = useState(false);
  const [name,       setName]     = useState('');
  const [slug,       setSlug]     = useState('');
  const [saving,     setSaving]   = useState(false);
  const [deleteId,   setDeleteId] = useState<string | null>(null);
  const [deleting,   setDeleting] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setTags(await getTags()); }
    catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createTag({ name: name.trim(), slug: slug.trim() });
      showToast('Tag created.', 'success');
      setName(''); setSlug(''); setShowForm(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create failed', 'error');
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

  const deleteTarget = tags.find((t) => t.id === deleteId);

  return (
    <div className="space-y-6 max-w-2xl">
      <title>Tags | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Tags</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>Add tag</Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-[#4A777A] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1A2B40]">New tag</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-[#6B7A8D] hover:text-[#1A2B40]"><X className="w-4 h-4" /></button>
          </div>
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} required />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving} icon={<Check className="w-4 h-4" />}>Create</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-[#DDE3EA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={<TagIcon className="w-6 h-6" />}
            title="No tags yet"
            description="Tags allow fine-grained filtering of articles by topic."
            action={{ label: 'Add first tag', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="flex flex-wrap gap-2 p-5">
            {tags.map((tag) => (
              <div key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F6F8] border border-[#DDE3EA] text-sm text-[#1A2B40]">
                <span>{tag.name}</span>
                <button
                  onClick={() => setDeleteId(tag.id)}
                  aria-label={`Delete tag ${tag.name}`}
                  className="text-[#6B7A8D] hover:text-[#C0392B] transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tag"
        description={`Delete tag "${deleteTarget?.name}"? It will be removed from all articles.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
