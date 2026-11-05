/**
 * /admin/editorial — Editorial calendar (Phase 6).
 *
 * Shows the 28-article programme from src/data/editorial/calendar.ts with
 * each proposal's brief and its current state in the CMS (matched by slug).
 *
 * "Create draft" makes a DRAFT article from the proposal — a full draft for
 * the first four, a structured outline for the rest. Nothing is published or
 * scheduled from here: the administrator reviews and edits the draft, Chef
 * Peter confirms anything in his voice, and the article is scheduled in the
 * editor. The editor refuses to publish while bracketed notes remain.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, FileText, ChevronDown, PenLine } from 'lucide-react';
import {
  EDITORIAL_CALENDAR, CATEGORY_NAMES, DRAFTED_SLUGS, suggestedDate,
  type ArticleProposal, type CategorySlug,
} from '../../data/editorial/calendar';
import { resolveLink } from '../../lib/editorial/draftFromProposal';
import { createDraftFromProposal, getCalendarArticles, type CalendarArticleState } from '../../lib/services/editorial';
import { ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/admin/ui/Button';
import Spinner from '../../components/admin/ui/Spinner';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

type Stage = 'not-started' | 'draft' | 'scheduled' | 'published' | 'archived';

const STAGE: Record<Stage, { label: string; cls: string }> = {
  'not-started': { label: 'Not started', cls: 'bg-[#F1F4F8] text-[#4A5A6D]' },
  draft: { label: 'Draft — in review', cls: 'bg-[#FFF4E0] text-[#7A4A0B]' },
  scheduled: { label: 'Scheduled', cls: 'bg-[#E8F0FB] text-[#1B365D]' },
  published: { label: 'Published', cls: 'bg-[#E7F4EA] text-[#2F6B3F]' },
  archived: { label: 'Archived', cls: 'bg-[#F1F4F8] text-[#6B7A8D]' },
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' });

const stageOf = (a?: CalendarArticleState): Stage => (a ? (a.status as Stage) : 'not-started');

export default function AdminEditorialCalendarPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();
  const [cms, setCms] = useState<Record<string, CalendarArticleState> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategorySlug | ''>('');
  const [stage, setStage] = useState<Stage | ''>('');
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCms(await getCalendarArticles(EDITORIAL_CALENDAR.map((p) => p.slug)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the calendar');
      setCms({});
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { 'not-started': 0, draft: 0, scheduled: 0, published: 0, archived: 0 };
    for (const p of EDITORIAL_CALENDAR) c[stageOf(cms?.[p.slug])]++;
    return c;
  }, [cms]);

  const visible = EDITORIAL_CALENDAR
    .filter((p) => !category || p.category === category)
    .filter((p) => !stage || stageOf(cms?.[p.slug]) === stage)
    .sort((a, b) => a.slot - b.slot);

  const create = async (p: ArticleProposal) => {
    if (!user) return;
    setCreating(p.slug);
    try {
      const id = await createDraftFromProposal(p, { id: user.id, displayName: profile?.display_name?.trim() || 'Chef Peter the Teacher' });
      navigate(`/admin/articles/${id}/edit`, {
        state: { flash: { message: 'Draft created from the editorial calendar. Complete the notes in [square brackets] before scheduling.', type: 'success' } },
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create the draft', 'error');
      await load();
    } finally { setCreating(null); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <title>Editorial calendar | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div>
        <h1 className="text-2xl font-bold text-[#1B365D]">Editorial calendar</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5 max-w-3xl">
          The first 28 articles for the Culinary Library — four per category, two a week. Dates are suggestions; nothing here is published automatically.
        </p>
      </div>

      {/* Workflow */}
      <section aria-labelledby="workflow" className="bg-white rounded-xl border border-[#DDE3EA] p-5">
        <h2 id="workflow" className="text-sm font-semibold text-[#1A2B40]">How an article moves from plan to publication</h2>
        <ol className="mt-3 grid gap-3 text-sm text-[#4A5A6D] sm:grid-cols-2 lg:grid-cols-4">
          <li><span className="font-semibold text-[#1B365D]">1. Create the draft.</span> A full draft (first four articles) or an outline with writing notes.</li>
          <li><span className="font-semibold text-[#1B365D]">2. Write and fact-check.</span> Check every figure and reference; add photographs with alt text.</li>
          <li><span className="font-semibold text-[#1B365D]">3. Chef Peter reviews.</span> Only he writes or confirms “Chef Peter’s tip” boxes and any personal story or quotation.</li>
          <li><span className="font-semibold text-[#1B365D]">4. Approve and schedule.</span> When no [square-bracket] notes remain, schedule it in the editor for its date.</li>
        </ol>
        <p className="mt-3 text-xs text-[#6B7A8D]">Full guidance: <code>docs/editorial-strategy.md</code>.</p>
      </section>

      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      {/* Summary and filters */}
      <div className="flex flex-wrap items-end gap-4">
        <p className="w-full text-sm text-[#4A5A6D] sm:w-auto" data-testid="calendar-summary">
          {cms ? `${counts.published} published · ${counts.scheduled} scheduled · ${counts.draft} in review · ${counts['not-started']} not started` : 'Loading…'}
        </p>
        <label className="text-xs font-medium text-[#4A5A6D] sm:ml-auto">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as CategorySlug | '')} className="mt-1 block rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 text-sm">
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_NAMES) as CategorySlug[]).map((c) => <option key={c} value={c}>{CATEGORY_NAMES[c]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-[#4A5A6D]">
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage | '')} className="mt-1 block rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 text-sm">
            <option value="">All stages</option>
            {(Object.keys(STAGE) as Stage[]).map((s) => <option key={s} value={s}>{STAGE[s].label}</option>)}
          </select>
        </label>
      </div>

      {!cms ? (
        <div className="p-8 flex justify-center"><Spinner /></div>
      ) : (
        <ol className="space-y-3" aria-label="Planned articles">
          {visible.length === 0 && <li className="text-sm text-[#6B7A8D]">No articles match these filters.</li>}
          {visible.map((p) => {
            const a = cms[p.slug];
            const st = stageOf(a);
            const full = DRAFTED_SLUGS.includes(p.slug);
            return (
              <li key={p.slug} className="bg-white rounded-xl border border-[#DDE3EA]" data-testid={`proposal-${p.slug}`}>
                <div className="flex flex-wrap items-start gap-4 p-4">
                  <div className="flex w-full shrink-0 items-center gap-3 text-xs text-[#6B7A8D] sm:block sm:w-28">
                    <p className="flex items-center gap-1 font-semibold text-[#1B365D]"><CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> #{p.slot}</p>
                    <p className="sm:mt-0.5">{fmtDate(suggestedDate(p.slot))}</p>
                  </div>
                  <div className="min-w-0 flex-1 basis-60">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#4A777A]">{CATEGORY_NAMES[p.category]} · {ARTICLE_TYPE_MAP[p.articleType]?.label ?? p.articleType}</p>
                    <h2 className="mt-0.5 font-semibold text-[#1A2B40]">{p.title}</h2>
                    <p className="mt-1 text-sm text-[#4A5A6D]">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${STAGE[st].cls}`}>
                        {STAGE[st].label}
                        {st === 'scheduled' && a?.scheduled_for ? ` for ${new Date(a.scheduled_for).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' })}` : ''}
                      </span>
                      {st === 'not-started' && (
                        <span className="rounded-full border border-[#DDE3EA] px-2 py-0.5 text-[#4A5A6D]">{full ? 'Full draft ready' : 'Outline with writing notes'}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full shrink-0 sm:w-auto">
                    {a ? (
                      <Link to={`/admin/articles/${a.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EA] px-3 py-2 text-sm font-medium text-[#1B365D] hover:bg-[#F5F7FA]">
                        <PenLine className="w-4 h-4" aria-hidden="true" /> Open in editor
                      </Link>
                    ) : (
                      <Button size="sm" onClick={() => create(p)} loading={creating === p.slug} disabled={!!creating} icon={<FileText className="w-4 h-4" />}>
                        Create draft
                      </Button>
                    )}
                  </div>
                </div>

                <details className="group border-t border-[#EEF1F5]">
                  <summary className="flex cursor-pointer list-none items-center gap-1 px-4 py-2 text-xs font-medium text-[#4A777A] [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /> Article brief
                  </summary>
                  <dl className="grid gap-x-6 gap-y-3 px-4 pb-4 text-sm sm:grid-cols-2">
                    <Brief term="Target audience">{p.audience}</Brief>
                    <Brief term="Search intent">{p.searchIntent}</Brief>
                    <Brief term="Main keyword">{p.mainKeyword}</Brief>
                    <Brief term="Supporting keywords">{p.supportingKeywords.join(', ')}</Brief>
                    <Brief term="Proposed headings"><ol className="list-decimal pl-5">{p.headings.map((h) => <li key={h}>{h}</li>)}</ol></Brief>
                    <Brief term="Suggested photographs"><ul className="list-disc pl-5">{p.photographs.map((h) => <li key={h}>{h}</li>)}</ul></Brief>
                    <Brief term="Internal links">
                      <ul className="list-disc pl-5">
                        {p.internalLinks.map((r) => {
                          const l = resolveLink(r);
                          return <li key={r}>{l.label} <span className="text-[#6B7A8D]">({l.href}{l.planned ? ' — planned' : ''})</span></li>;
                        })}
                      </ul>
                    </Brief>
                    <Brief term="References to consult">
                      {p.references.length ? <ul className="list-disc pl-5">{p.references.map((r) => <li key={r} className="break-words">{r}</li>)}</ul> : 'Chef Peter’s own guidance — sources only for any factual claims.'}
                    </Brief>
                    {p.reviewNotes.length > 0 && (
                      <Brief term="Before publishing" wide>
                        <ul className="space-y-1">{p.reviewNotes.map((n) => <li key={n} className="flex gap-2"><CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-[#B7791F]" aria-hidden="true" />{n}</li>)}</ul>
                      </Brief>
                    )}
                  </dl>
                </details>
              </li>
            );
          })}
        </ol>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

const Brief: React.FC<{ term: string; wide?: boolean; children: React.ReactNode }> = ({ term, wide, children }) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7A8D]">{term}</dt>
    <dd className="mt-1 text-[#1A2B40]">{children}</dd>
  </div>
);
