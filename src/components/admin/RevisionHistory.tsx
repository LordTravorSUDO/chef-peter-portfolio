/**
 * RevisionHistory — collapsible panel showing article revision history
 * interleaved with publication lifecycle events.
 *
 * Shows:
 *   - Content revisions (created by DB trigger on title/body/excerpt change)
 *   - Publication events (published, unpublished, archived, scheduled, etc.)
 *
 * Allows the admin to:
 *   - View all past revisions with timestamps
 *   - Preview a revision's content
 *   - Restore a revision (writes it back, creating a new revision)
 *
 * Security: only admins can read article_revisions and article_events (RLS).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Eye, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { getArticleRevisions, restoreRevision, getRevisionFull } from '../../lib/services/articles';
import { getArticleEvents, type ArticleEvent } from '../../lib/services/scheduler';
import ConfirmDialog from './ui/ConfirmDialog';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import { useToast } from './ui/Toast';

interface Props {
  articleId:  string;
  onRestored: () => void;
}

interface RevisionRow {
  id:          string;
  revision_no: number;
  title:       string;
  excerpt:     string;
  change_note: string | null;
  saved_by:    string;
  created_at:  string;
}

// Merged timeline entry
type TimelineEntry =
  | { kind: 'revision'; data: RevisionRow }
  | { kind: 'event';    data: ArticleEvent };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Kampala',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  published:          { label: '✓ Published',          color: 'text-emerald-600' },
  unpublished:        { label: '✕ Unpublished',        color: 'text-amber-600' },
  archived:           { label: '⊘ Archived',           color: 'text-red-500' },
  scheduled:          { label: '🕐 Scheduled',          color: 'text-[#1B365D]' },
  schedule_cancelled: { label: '✕ Schedule cancelled', color: 'text-amber-600' },
  restored:           { label: '↩ Restored',           color: 'text-[#4A777A]' },
  deleted:            { label: '⊗ Deleted',            color: 'text-red-600' },
};

export default function RevisionHistory({ articleId, onRestored }: Props) {
  const [revisions,  setRevisions]  = useState<RevisionRow[]>([]);
  const [events,     setEvents]     = useState<ArticleEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState(false);
  const [restoreId,  setRestoreId]  = useState<string | null>(null);
  const [restoring,  setRestoring]  = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revData, evData] = await Promise.all([
        getArticleRevisions(articleId),
        getArticleEvents(articleId).catch(() => []),  // non-fatal if events table doesn't exist yet
      ]);
      setRevisions(revData as RevisionRow[]);
      setEvents(evData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [articleId]);

  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoring(true);
    try {
      await restoreRevision(articleId, restoreId);
      showToast('Revision restored. A new revision was created.', 'success');
      setRestoreId(null);
      load();
      onRestored();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Restore failed', 'error');
    } finally { setRestoring(false); }
  };

  const handlePreview = async (revId: string) => {
    try {
      const full = await getRevisionFull(articleId, revId);
      setPreviewBody(full.body);
      setPreviewTitle(full.title);
    } catch { /* silent */ }
  };

  // Build a merged, chronologically-sorted timeline
  const timeline: TimelineEntry[] = [
    ...revisions.map((r): TimelineEntry => ({ kind: 'revision', data: r })),
    ...events.map((e): TimelineEntry => ({ kind: 'event', data: e })),
  ].sort((a, b) => {
    const dateA = a.kind === 'revision' ? a.data.created_at : a.data.created_at;
    const dateB = b.kind === 'revision' ? b.data.created_at : b.data.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const restoreTarget = revisions.find((r) => r.id === restoreId);
  const totalCount    = revisions.length + events.length;

  return (
    <div className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#1A2B40] hover:bg-[#F4F6F8] transition"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#4A777A]" />
          Revision history &amp; events
          {totalCount > 0 && (
            <span className="text-xs text-[#6B7A8D] font-normal">({totalCount})</span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-[#6B7A8D]" />
          : <ChevronDown className="w-4 h-4 text-[#6B7A8D]" />}
      </button>

      {expanded && (
        <div className="border-t border-[#DDE3EA]">
          {loading ? (
            <div className="p-6 flex justify-center"><Spinner size="sm" /></div>
          ) : timeline.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6B7A8D]">
              No history yet. Revisions are created automatically when you save changes to the title or content.
            </div>
          ) : (
            <div className="divide-y divide-[#DDE3EA] max-h-96 overflow-y-auto">
              {timeline.map((entry) => {
                if (entry.kind === 'event') {
                  const ev = entry.data;
                  const label = EVENT_LABELS[ev.event_type];
                  const scheduledFor = (ev.payload?.scheduled_for as string | undefined);
                  return (
                    <div key={`ev-${ev.id}`} className="px-4 py-3 bg-[#FAFBFC] flex items-start gap-3">
                      <Radio className="w-3.5 h-3.5 text-[#6B7A8D] mt-0.5 shrink-0" />
                      <div>
                        <p className={`text-xs font-semibold ${label?.color ?? 'text-[#1A2B40]'}`}>
                          {label?.label ?? ev.event_type}
                        </p>
                        {scheduledFor && (
                          <p className="text-[10px] text-[#6B7A8D] mt-0.5">
                            For: {new Date(scheduledFor).toLocaleString('en-GB', { timeZone: 'Africa/Kampala',
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                            })}
                          </p>
                        )}
                        <p className="text-[10px] text-[#6B7A8D] mt-0.5">{formatDateTime(ev.created_at)}</p>
                      </div>
                    </div>
                  );
                }

                // Revision entry
                const rev = entry.data;
                return (
                  <div key={`rev-${rev.id}`} className="px-4 py-3 flex items-start gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A2B40] truncate">
                        Rev #{rev.revision_no}: {rev.title}
                      </p>
                      <p className="text-xs text-[#6B7A8D] mt-0.5">{formatDateTime(rev.created_at)}</p>
                      {rev.change_note && (
                        <p className="text-xs text-[#6B7A8D] mt-0.5 italic">"{rev.change_note}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreview(rev.id)}
                        aria-label={`Preview revision #${rev.revision_no}`}
                        className="p-1.5 rounded text-[#6B7A8D] hover:text-[#4A777A] hover:bg-[#F4F6F8] transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestoreId(rev.id)}
                        aria-label={`Restore revision #${rev.revision_no}`}
                        className="p-1.5 rounded text-[#6B7A8D] hover:text-[#1B365D] hover:bg-[#F4F6F8] transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Revision preview modal */}
      {previewBody !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${previewTitle}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setPreviewBody(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3EA]">
              <div>
                <h2 className="text-sm font-semibold text-[#1A2B40]">Revision preview</h2>
                {previewTitle && <p className="text-xs text-[#6B7A8D] mt-0.5">{previewTitle}</p>}
              </div>
              <button onClick={() => setPreviewBody(null)} aria-label="Close preview" className="text-[#6B7A8D] hover:text-[#1A2B40]">✕</button>
            </div>
            <div className="overflow-y-auto p-5">
              <div
                className="prose-editor text-[#1A2B40] text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Restore confirm */}
      <ConfirmDialog
        open={!!restoreId}
        title="Restore revision"
        description={`Restore revision #${restoreTarget?.revision_no}: "${restoreTarget?.title}"? The current content will be saved as a new revision before restoring.`}
        confirmLabel="Restore"
        onConfirm={handleRestore}
        onCancel={() => setRestoreId(null)}
        loading={restoring}
      />
    </div>
  );
}
