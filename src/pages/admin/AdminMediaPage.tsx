/**
 * /admin/media — Full media library with drag-and-drop, upload progress,
 * search, pagination, metadata editing and reference-aware deletion.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Image as ImageIcon, Search, Trash2, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMediaLibrary, uploadMedia, deleteMedia, getMediaUrl, getResponsiveMediaUrl } from '../../lib/services/media';
import type { Media } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import EmptyState from '../../components/admin/ui/EmptyState';
import Spinner from '../../components/admin/ui/Spinner';
import DragDropZone from '../../components/admin/DragDropZone';
import MediaMetadataEditor from '../../components/admin/MediaMetadataEditor';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

// ---------------------------------------------------------------------------
// Upload progress item
// ---------------------------------------------------------------------------

interface UploadItem {
  id:       string;
  filename:  string;
  progress:  number;  // 0–100
  status:   'uploading' | 'done' | 'failed';
  error?:   string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminMediaPage() {
  const { toasts, showToast, dismissToast } = useToast();

  // Grid data
  const [items,       setItems]       = useState<Media[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [total,       setTotal]       = useState(0);

  // Search + filter
  const [search,      setSearch]      = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showFilters,  setShowFilters]  = useState(false);

  // Upload state
  const [uploads,     setUploads]     = useState<UploadItem[]>([]);

  // Selected item (detail panel)
  const [selected,    setSelected]    = useState<Media | null>(null);

  // Refresh trigger
  const [refreshTick, setRefreshTick] = useState(0);

  // ── Load media ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMediaLibrary({
        page,
        pageSize: 24,
        search:   search   || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load media', 'error');
    } finally { setLoading(false); }
  }, [page, search, dateFrom, dateTo, showToast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  // ── Handle uploaded files ───────────────────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    // Create upload progress entries
    const newUploads: UploadItem[] = files.map((f) => ({
      id: `${Date.now()}-${f.name}-${Math.random()}`,
      filename: f.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploads((prev) => [...newUploads, ...prev]);

    // Upload each file sequentially
    let succeeded = 0;
    let failed    = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadId = newUploads[i].id;

      try {
        await uploadMedia({
          file,
          folder: 'articles',
          onProgress: (uploaded, total) => {
            const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
            setUploads((prev) =>
              prev.map((u) => u.id === uploadId ? { ...u, progress: pct } : u)
            );
          },
        });

        setUploads((prev) =>
          prev.map((u) => u.id === uploadId ? { ...u, status: 'done', progress: 100 } : u)
        );
        succeeded++;
      } catch (err) {
        failed++;
        setUploads((prev) =>
          prev.map((u) => u.id === uploadId
            ? { ...u, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
            : u
          )
        );
      }
    }

    // Refresh the grid
    setRefreshTick((t) => t + 1);
    const plural = (n: number) => `${n} file${n === 1 ? '' : 's'}`;
    if (failed === 0) {
      showToast(`${plural(succeeded)} uploaded.`, 'success');
    } else if (succeeded === 0) {
      showToast(`Upload failed for ${plural(failed)}. See the error under each file.`, 'error');
    } else {
      showToast(`${plural(succeeded)} uploaded, ${failed} failed. See the error under each failed file.`, 'warning');
    }
  }, [showToast]);

  // Clear successful uploads after a delay. Failed uploads stay visible so the
  // administrator can read the error.
  useEffect(() => {
    const timer = setTimeout(() => {
      setUploads((prev) => (prev.some((u) => u.status === 'done') ? prev.filter((u) => u.status !== 'done') : prev));
    }, 5000);
    return () => clearTimeout(timer);
  }, [uploads]);

  // ── Handle metadata update / delete ─────────────────────────────────────
  const handleMetadataUpdated = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMedia(id);
      showToast('Image deleted.', 'success');
      setSelected(null);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }, [showToast]);

  // ── Search / filter handlers ────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = search || dateFrom || dateTo;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-6xl">
      <title>Media | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B365D]">Media library</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{total} file{total !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <DragDropZone onFiles={handleFiles} />

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-xl border border-[#DDE3EA] p-4 space-y-2">
          <p className="text-xs font-medium text-[#6B7A8D] uppercase tracking-wide">Uploads</p>
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs text-[#1A2B40] truncate">{u.filename}</p>
                  <span className={`text-xs font-medium ml-2 shrink-0 ${
                    u.status === 'done' ? 'text-emerald-600' :
                    u.status === 'failed' ? 'text-[#C0392B]' :
                    'text-[#4A777A]'
                  }`}>
                    {u.status === 'done' ? '✓ Done' : u.status === 'failed' ? '✗ Failed' : `${u.progress}%`}
                  </span>
                </div>
                <div className="h-1.5 bg-[#F4F6F8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      u.status === 'failed' ? 'bg-[#C0392B]' :
                      u.status === 'done' ? 'bg-emerald-500' :
                      'bg-[#4A777A]'
                    }`}
                    style={{ width: `${u.status === 'done' ? 100 : u.progress}%` }}
                  />
                </div>
                {u.status === 'failed' && u.error && (
                  <p className="text-xs text-[#C0392B] mt-0.5">{u.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-3 flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#DDE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition"
            />
          </div>
          <Button type="submit" size="sm" variant="ghost">Search</Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<Calendar className="w-3.5 h-3.5" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[#C0392B] hover:underline"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Date filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-[#DDE3EA] p-4 flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 text-sm text-[#1A2B40]">
            <span className="text-xs font-medium whitespace-nowrap">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-[#DDE3EA] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1A2B40]">
            <span className="text-xs font-medium whitespace-nowrap">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="border border-[#DDE3EA] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30"
            />
          </label>
        </div>
      )}

      {/* Main grid + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grid */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="w-6 h-6" />}
              title={hasFilters ? 'No matching files' : 'No media files yet'}
              description={hasFilters
                ? 'Try adjusting your search or date filters.'
                : 'Upload images using the drop zone above. They will appear here as thumbnails.'
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item === selected ? null : item)}
                    className={`relative group bg-white rounded-lg border overflow-hidden transition text-left ${
                      selected?.id === item.id
                        ? 'border-[#1B365D] ring-2 ring-[#1B365D]/20'
                        : 'border-[#DDE3EA] hover:border-[#4A777A]'
                    }`}
                  >
                    <div className="aspect-square bg-[#F4F6F8] flex items-center justify-center overflow-hidden">
                      {item.mime_type.startsWith('image/') ? (
                        <img
                          src={getResponsiveMediaUrl(item.storage_path, { width: 300, quality: 70 })}
                          alt={item.alt_text ?? item.original_filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          width={item.width_px ?? undefined}
                          height={item.height_px ?? undefined}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-[#6B7A8D]" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-[#1A2B40] truncate" title={item.original_filename}>{item.original_filename}</p>
                      <p className="text-[10px] text-[#6B7A8D]">{formatBytes(item.file_size_bytes)}</p>
                    </div>
                    {/* Alt text indicator dot */}
                    <div
                      className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                        item.alt_text ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                      title={item.alt_text ? 'Alt text set' : 'Missing alt text'}
                    />
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-[#6B7A8D]">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail / metadata panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#1A2B40]">Image details</h3>
                <button onClick={() => setSelected(null)} aria-label="Close panel" className="text-[#6B7A8D] hover:text-[#1A2B40]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <MediaMetadataEditor
                media={selected}
                onUpdated={handleMetadataUpdated}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="bg-[#F4F6F8] rounded-xl border border-[#DDE3EA] p-8 text-center">
              <ImageIcon className="w-8 h-8 text-[#6B7A8D] mx-auto mb-3" />
              <p className="text-sm text-[#6B7A8D]">Select an image to edit its metadata, alt text, caption and credit.</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
