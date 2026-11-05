/**
 * MediaPickerModal — select an existing media item from the library,
 * or upload new ones directly from the picker.
 *
 * Features:
 *   - Search by filename
 *   - Drag-and-drop upload
 *   - Upload progress bars
 *   - Alt text indicator (green = set, amber = missing)
 *   - Pagination
 *   - Reuse existing images without uploading duplicates
 *   - Inline alt text editor on the selected item (before inserting)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediaLibrary, uploadMedia, getMediaUrl, getResponsiveMediaUrl, updateMediaMetadata } from '../../lib/services/media';
import type { Media } from '../../types/article';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import DragDropZone from './DragDropZone';
import Textarea from './ui/Textarea';
import { useToast } from './ui/Toast';

interface UploadItem {
  id:       string;
  filename:  string;
  progress:  number;
  status:   'uploading' | 'done' | 'failed';
  error?:   string;
}

interface Props {
  open:         boolean;
  onClose:      () => void;
  onSelect:     (media: Media) => void;
  title?:       string;
  /** When true, require alt text before allowing confirmation */
  requireAltText?: boolean;
}

export default function MediaPickerModal({ open, onClose, onSelect, title = 'Select image', requireAltText = true }: Props) {
  const { showToast } = useToast();

  const [items,       setItems]      = useState<Media[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected,    setSelected]    = useState<Media | null>(null);
  const [page,        setPage]       = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);

  const [uploads,     setUploads]     = useState<UploadItem[]>([]);

  // Alt text editing for the selected item
  const [editAlt,     setEditAlt]     = useState('');
  const [savingAlt,   setSavingAlt]   = useState(false);

  // ── Load media ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMediaLibrary({ page, pageSize: 24, search: debouncedSearch || undefined });
      setItems(res.items);
      setTotalPages(res.totalPages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  // Debounce typing so the library is not queried on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset when the picker opens
  useEffect(() => {
    if (open) { setSelected(null); setUploads([]); setPage(1); setSearch(''); setDebouncedSearch(''); }
  }, [open]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Sync alt text when selection changes
  useEffect(() => {
    setEditAlt(selected?.alt_text ?? '');
  }, [selected?.id]);

  // ── Handle drag-and-drop uploads ────────────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    const newUploads: UploadItem[] = files.map((f) => ({
      id: `${Date.now()}-${f.name}-${Math.random()}`,
      filename: f.name, progress: 0, status: 'uploading',
    }));
    setUploads((prev) => [...newUploads, ...prev]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uid  = newUploads[i].id;
      try {
        const media = await uploadMedia({
          file,
          folder: 'articles',
          onProgress: (up, total) => {
            const pct = total > 0 ? Math.round((up / total) * 100) : 0;
            setUploads((prev) => prev.map((u) => u.id === uid ? { ...u, progress: pct } : u));
          },
        });
        setUploads((prev) => prev.map((u) => u.id === uid ? { ...u, status: 'done', progress: 100 } : u));
        // Auto-select the first uploaded image
        if (i === 0) setSelected(media);
      } catch (err) {
        setUploads((prev) => prev.map((u) =>
          u.id === uid ? { ...u, status: 'failed', error: err instanceof Error ? err.message : 'Failed' } : u
        ));
      }
    }
    load(); // Refresh grid
  }, [load]);

  // ── Save alt text on selected image ─────────────────────────────────────
  const handleSaveAlt = useCallback(async () => {
    if (!selected) return;
    setSavingAlt(true);
    try {
      await updateMediaMetadata(selected.id, { alt_text: editAlt.trim() || null });
      showToast('Alt text saved.', 'success');
      setSelected({ ...selected, alt_text: editAlt.trim() || null });
      load(); // refresh grid to update indicator dot
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setSavingAlt(false); }
  }, [selected, editAlt, showToast, load]);

  // ── Confirm selection ───────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!selected) return;
    if (requireAltText && !selected.alt_text && !editAlt.trim()) {
      showToast('Please add alt text before inserting this image, or mark it as decorative.', 'warning');
      return;
    }
    // If alt text was edited but not saved, save first
    if (editAlt !== (selected.alt_text ?? '')) {
      handleSaveAlt();
    }
    onSelect({ ...selected, alt_text: editAlt.trim() || null });
    onClose();
  };

  if (!open) return null;

  // Search runs on the server (file name, alt text, caption, credit) across all pages
  const filtered = items;

  // Alt text indicator
  const altOk = selected ? (!!selected.alt_text || !!editAlt.trim()) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3EA]">
          <h2 id="media-picker-title" className="text-sm font-semibold text-[#1A2B40]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#5F6E80] hover:text-[#1A2B40] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: grid ─────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b border-[#DDE3EA]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5F6E80]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by filename…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#DDE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition"
                />
              </div>
            </div>

            {/* Upload zone (compact) */}
            <div className="px-4 py-3 border-b border-[#DDE3EA]">
              <DragDropZone onFiles={handleFiles} compact />

              {/* Upload progress */}
              {uploads.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploads.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-[#1A2B40] truncate">{u.filename}</span>
                          <span className={`text-[10px] font-medium ml-1 ${u.status === 'done' ? 'text-emerald-700' : u.status === 'failed' ? 'text-[#C0392B]' : 'text-[#4A777A]'}`}>
                            {u.status === 'done' ? '✓' : u.status === 'failed' ? '✗' : `${u.progress}%`}
                          </span>
                        </div>
                        <div className="h-1 bg-[#F4F6F8] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${u.status === 'failed' ? 'bg-[#C0392B]' : u.status === 'done' ? 'bg-emerald-500' : 'bg-[#4A777A]'}`}
                            style={{ width: `${u.status === 'done' ? 100 : u.progress}%` }}
                          />
                        </div>
                        {u.status === 'failed' && u.error && (
                          <p className="text-[10px] text-[#C0392B] mt-0.5 leading-snug" role="alert">{u.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-[#5F6E80]">
                  {search ? 'No matching files. Try a different search or upload a new image.' : 'No media yet. Drag images above to upload.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                        className={`relative rounded-lg border overflow-hidden transition group text-left ${
                          selected?.id === item.id
                            ? 'border-[#1B365D] ring-2 ring-[#1B365D]/20'
                            : 'border-[#DDE3EA] hover:border-[#4A777A]'
                        }`}
                      >
                        <div className="aspect-square bg-[#F4F6F8] flex items-center justify-center overflow-hidden">
                          {item.mime_type.startsWith('image/') ? (
                            <img
                              src={getResponsiveMediaUrl(item.storage_path, { width: 200, quality: 60 })}
                              alt={item.alt_text ?? item.original_filename}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs text-[#5F6E80]">No preview</span>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] text-[#1A2B40] truncate">{item.original_filename}</p>
                        </div>
                        {/* Alt text indicator */}
                        <div
                          className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                            item.alt_text ? 'bg-emerald-500' : 'bg-amber-400'
                          }`}
                          title={item.alt_text ? 'Alt text set' : 'Missing alt text'}
                        />
                        {selected?.id === item.id && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#1B365D] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="p-1.5 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-[#5F6E80]">{page} / {totalPages}</span>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="p-1.5 rounded border border-[#DDE3EA] disabled:opacity-40 hover:bg-[#F4F6F8] transition"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right: selection detail + alt text ──────────────────────── */}
          {selected && (
            <div className="w-64 border-l border-[#DDE3EA] flex flex-col overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <p className="text-xs font-medium text-[#5F6E80] uppercase tracking-wide">Selected</p>

                {/* Preview */}
                <div className="rounded-lg overflow-hidden bg-[#F4F6F8] border border-[#DDE3EA]">
                  {selected.mime_type.startsWith('image/') && (
                    <img
                      src={getResponsiveMediaUrl(selected.storage_path, { width: 256, quality: 70 })}
                      alt={selected.alt_text ?? selected.original_filename}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Filename */}
                <p className="text-xs text-[#1A2B40] truncate" title={selected.original_filename}>
                  {selected.original_filename}
                </p>

                {/* Alt text editor */}
                <div>
                  <Textarea
                    label="Alt text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Describe this image for screen readers…"
                    rows={3}
                    hint={altOk ? undefined : 'Required for editorial images. Leave empty for decorative images only.'}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveAlt}
                    loading={savingAlt}
                    className="mt-1.5"
                    disabled={editAlt === (selected.alt_text ?? '')}
                  >
                    Save alt text
                  </Button>
                </div>

                {/* Alt status indicator */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
                  altOk
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {altOk ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full bg-amber-400" />}
                  {altOk ? 'Alt text set' : 'Missing alt text'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#DDE3EA]">
          <p className="text-xs text-[#5F6E80]">
            {selected ? `Selected: ${selected.original_filename}` : 'Select an image from the library or upload a new one'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleConfirm} disabled={!selected} icon={<Check className="w-3.5 h-3.5" />}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
