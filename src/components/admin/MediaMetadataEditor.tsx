/**
 * MediaMetadataEditor — inline panel for editing media metadata.
 *
 * Features:
 *   - Edit alt text, caption, credit
 *   - Alt text accessibility indicator (required / decorative / missing)
 *   - Shows file dimensions, size, type
 *   - Copy public URL to clipboard
 *   - Shows which articles reference this image
 *   - Delete with reference warning
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Trash2, Copy, Check, AlertTriangle, Link2, FileText } from 'lucide-react';
import {
  updateMediaMetadata, checkMediaReferences,
  getMediaUrl, getResponsiveMediaUrl,
  type MediaReference,
} from '../../lib/services/media';
import type { Media } from '../../types/article';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
import Input from './ui/Input';
import ConfirmDialog from './ui/ConfirmDialog';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface Props {
  media:    Media;
  onUpdated?: () => void;
  onDelete?: (id: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MediaMetadataEditor({ media, onUpdated, onDelete }: Props) {
  const { showToast } = useToast();

  // Editable fields
  const [altText,   setAltText]  = useState(media.alt_text ?? '');
  const [caption,    setCaption]  = useState(media.caption ?? '');
  const [credit,     setCredit]   = useState(media.credit ?? '');
  const [saving,    setSaving]   = useState(false);
  const [copied,    setCopied]   = useState(false);

  // Reference checking
  const [references, setReferences] = useState<MediaReference[]>([]);
  const [checkingRefs, setCheckingRefs] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync when media changes
  useEffect(() => {
    setAltText(media.alt_text ?? '');
    setCaption(media.caption ?? '');
    setCredit(media.credit ?? '');
  }, [media.id, media.alt_text, media.caption, media.credit]);

  // Check references on mount
  useEffect(() => {
    let cancelled = false;
    setCheckingRefs(true);
    checkMediaReferences(media.id)
      .then((refs) => { if (!cancelled) setReferences(refs); })
      .catch(() => { if (!cancelled) setReferences([]); })
      .finally(() => { if (!cancelled) setCheckingRefs(false); });
    return () => { cancelled = true; };
  }, [media.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMediaMetadata(media.id, {
        alt_text: altText.trim() || null,
        caption:  caption.trim()  || null,
        credit:   credit.trim()   || null,
      });
      showToast('Metadata saved.', 'success');
      onUpdated?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getMediaUrl(media.storage_path));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      onDelete?.(media.id);
    } finally { setDeleting(false); setDeleteConfirm(false); }
  };

  // Alt text accessibility indicator
  const altStatus = altText.trim()
    ? { label: 'Descriptive alt text set', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    : { label: 'Missing alt text — set for editorial images or leave empty for decorative images', cls: 'text-amber-700 bg-amber-50 border-amber-200' };

  const hasChanges =
    altText !== (media.alt_text ?? '') ||
    caption  !== (media.caption ?? '') ||
    credit   !== (media.credit ?? '');

  return (
    <div className="space-y-5">
      {/* Preview image */}
      <div className="flex gap-4">
        <div className="w-32 h-32 rounded-lg overflow-hidden bg-[#F4F6F8] border border-[#DDE3EA] shrink-0">
          <img
            src={getResponsiveMediaUrl(media.storage_path, { width: 256, quality: 70 })}
            alt={media.alt_text ?? media.original_filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 space-y-1 text-xs text-[#6B7A8D] min-w-0">
          <p className="font-medium text-[#1A2B40] text-sm truncate">{media.original_filename}</p>
          <p>{formatBytes(media.file_size_bytes)} · {media.mime_type.split('/')[1].toUpperCase()}</p>
          {media.width_px && <p>{media.width_px} × {media.height_px}px</p>}
          <p>Uploaded {formatDate(media.created_at)}</p>
          <p className="font-mono text-[10px] text-[#6B7A8D] truncate" title={media.storage_path}>
            {media.storage_path}
          </p>
        </div>
      </div>

      {/* Public URL copy */}
      <div>
        <p className="text-xs font-medium text-[#1A2B40] mb-1">Public URL</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={getMediaUrl(media.storage_path)}
            className="flex-1 text-xs font-mono bg-[#F4F6F8] border border-[#DDE3EA] rounded-lg px-2.5 py-1.5 text-[#6B7A8D] focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyUrl}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Alt text status indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${altStatus.cls}`}>
        {altText.trim()
          ? <Check className="w-3.5 h-3.5 shrink-0" />
          : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        }
        {altStatus.label}
      </div>

      {/* Editable metadata */}
      <Textarea
        label="Alt text"
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        placeholder="Describe the image for screen readers and SEO (e.g. 'Chef Peter plating a Wagyu beef dish')"
        rows={2}
        hint="Required for meaningful editorial images. Leave empty for decorative images only."
      />

      <Textarea
        label="Caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption displayed below the image (e.g. 'Wagyu beef carpaccio, plated at De'Chosen HQ, 2025')"
        rows={2}
        hint="Displayed to readers beneath the image. Separate from alt text."
      />

      <Input
        label="Credit / source"
        value={credit}
        onChange={(e) => setCredit(e.target.value)}
        placeholder="Photo by [photographer name] or source attribution"
        hint="Preserve original image credits. Do not invent credits."
      />

      {/* Save button */}
      <Button onClick={handleSave} loading={saving} disabled={!hasChanges} icon={<Save className="w-4 h-4" />} className="w-full">
        {hasChanges ? 'Save metadata' : 'No changes'}
      </Button>

      {/* Reference warnings */}
      {references.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              Used by {references.length} article{references.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-1">
            {references.map((ref) => (
              <div key={`${ref.article_id}-${ref.reference_type}`} className="flex items-center gap-2 text-xs text-amber-700">
                {ref.reference_type === 'featured_image' && <Link2 className="w-3 h-3" />}
                {ref.reference_type === 'social_image'   && <Link2 className="w-3 h-3" />}
                {ref.reference_type === 'inline_body'    && <FileText className="w-3 h-3" />}
                <span className="truncate">{ref.article_title}</span>
                <Badge status={ref.article_status} className="ml-auto shrink-0" />
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 pt-1">
            Deleting this image will remove it from the articles above. Replace or unassign it first to avoid broken images in published content.
          </p>
        </div>
      )}

      {/* Delete */}
      <div className="pt-4 border-t border-[#DDE3EA]">
        <Button
          variant="danger"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => setDeleteConfirm(true)}
          className="w-full"
        >
          Delete image{references.length > 0 ? ` (used by ${references.length} article${references.length > 1 ? 's' : ''})` : ''}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete image"
        description={
          references.length > 0
            ? `This image is used by ${references.length} article${references.length > 1 ? 's' : ''}. Deleting it will cause broken images in that content. Are you sure?`
            : `Permanently delete "${media.original_filename}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        loading={deleting}
      />
    </div>
  );
}
