/**
 * ArticleForm — production article editor with rich-text, autosave, preview,
 * publish/unpublish/schedule workflow, revision history and unsaved-change guards.
 *
 * Key safety guarantees:
 *   - Drafts are NEVER visible to the public (RLS enforces this server-side)
 *   - Scheduled articles remain private until their publication time
 *   - published_at is preserved when unpublishing and re-publishing
 *   - Destructive actions (archive, delete, unpublish, restore) require confirmation
 *   - Unsaved changes trigger a browser beforeunload warning
 *   - Autosave only runs on existing articles (never creates phantom drafts)
 *   - Slug uniqueness is checked with debounced API calls
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, Globe, Eye, EyeOff, Send, Clock,
  Archive, CheckCircle, AlertCircle, FileText, Image as ImageIcon,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  createArticle, updateArticle, slugify, isSlugAvailable, isValidSlug,
  publishArticle, unpublishArticle, scheduleArticle, cancelSchedule,
  archiveArticle, sanitiseHtml, type ArticleServerState,
} from '../../lib/services/articles';
import { setArticleCategories, setArticleTags, getCategories, getTags } from '../../lib/services/taxonomy';
import { getMediaUrl } from '../../lib/services/media';
import { utcToKampalaInput, kampalaInputToUtc, formatKampala } from '../../lib/time';
import { useAuth } from '../../hooks/useAuth';
import { useAutosave, type AutosaveStatus } from '../../hooks/useAutosave';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import type { ArticleWithRelations, Category, Tag, Media } from '../../types/article';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Badge from './ui/Badge';
import ConfirmDialog from './ui/ConfirmDialog';
import RichTextEditor from './RichTextEditor';
import MediaPickerModal from './MediaPickerModal';
import RevisionHistory from './RevisionHistory';
import SeoQualityPanel from './seo/SeoQualityPanel';
import { runSeoChecks } from '../../lib/seo/quality';
import { ToastContainer, useToast } from './ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageInfo { id: string; storage_path: string; alt_text: string | null; }

interface Props {
  article?: ArticleWithRelations;
  /**
   * Called after every confirmed write with the state the database stored.
   * The parent merges it in place — it must NOT reload/remount the form.
   */
  onServerState?: (state: ArticleServerState) => void;
  /** Ask the parent to reload the article from the DB (e.g. after a revision restore). */
  onReloadRequest?: () => void;
}

type ConfirmKind = null | 'publish' | 'unpublish' | 'archive';
type BusyAction  = null | 'save' | 'publish' | 'unpublish' | 'schedule' | 'cancel' | 'archive' | 'preview';

/** Taxonomy key used to skip rewriting category/tag links when nothing changed. */
function taxonomyKey(catIds: string[], primary: string, tagIds: string[]) {
  return JSON.stringify([[...catIds].sort(), primary, [...tagIds].sort()]);
}

function wordCountOf(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

function SaveStatusIndicator({ status }: { status: AutosaveStatus }) {
  const config: Record<AutosaveStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    idle:   { label: 'All changes saved', icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    dirty:  { label: 'Unsaved changes…',  icon: <FileText   className="w-3.5 h-3.5" />, cls: 'text-[#D99B26]' },
    saving: { label: 'Saving…',            icon: <FileText   className="w-3.5 h-3.5 animate-pulse" />, cls: 'text-[#4A777A]' },
    saved:  { label: 'Saved',              icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    failed: { label: 'Not saved',          icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'text-[#C0392B]' },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${c.cls}`} role="status" aria-live="polite" data-testid="save-status">
      {c.icon}
      {c.label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArticleForm({ article, onServerState, onReloadRequest }: Props) {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();

  // ── Server state: what the database last confirmed ─────────────────────
  // Null for a brand-new article until the first insert succeeds.
  const [server, setServer] = useState<ArticleServerState | null>(() => article ? {
    id: article.id, slug: article.slug, status: article.status,
    published_at: article.published_at, scheduled_for: article.scheduled_for,
    updated_at: article.updated_at, reading_time_minutes: article.reading_time_minutes,
  } : null);
  const isEdit    = !!article;
  const articleId = server?.id ?? null;

  const applyServerState = useCallback((state: ArticleServerState) => {
    setServer(state);
    onServerState?.(state);
  }, [onServerState]);

  // ---------------------------------------------------------------------------
  // Form state (initialised once from the loaded article)
  // ---------------------------------------------------------------------------
  const toImage = (m?: { id: string; storage_path: string; alt_text: string | null } | null): ImageInfo | null =>
    m ? { id: m.id, storage_path: m.storage_path, alt_text: m.alt_text } : null;

  const [title,          setTitle]          = useState(article?.title             ?? '');
  const [slug,           setSlug]           = useState(article?.slug              ?? '');
  const [excerpt,        setExcerpt]        = useState(article?.excerpt           ?? '');
  const [body,           setBody]           = useState(article?.body              ?? '');
  const [scheduledFor,   setScheduledFor]   = useState(utcToKampalaInput(article?.scheduled_for));
  const [seoTitle,       setSeoTitle]       = useState(article?.seo_title         ?? '');
  const [metaDesc,       setMetaDesc]       = useState(article?.meta_description  ?? '');
  const [canonicalUrl,   setCanonicalUrl]   = useState(article?.canonical_url     ?? '');
  const [noindex,        setNoindex]        = useState(article?.noindex           ?? false);
  const [featuredImage,  setFeaturedImage]  = useState<ImageInfo | null>(() => toImage(article?.featured_image));
  const [socialImage,    setSocialImage]    = useState<ImageInfo | null>(() => toImage(article?.social_image));
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(() => article?.article_categories?.map((ac) => ac.categories?.id ?? '').filter(Boolean) ?? []);
  const [primaryCatId,   setPrimaryCatId]   = useState<string>(() => article?.article_categories?.find((ac) => ac.is_primary)?.categories?.id ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => article?.article_tags?.map((at) => at.tags?.id ?? '').filter(Boolean) ?? []);

  // Category/tag links as last stored in the DB. A new article starts with
  // none stored, so it only writes links when some are selected.
  const savedTaxonomyKey = useRef<string>(taxonomyKey(selectedCatIds, primaryCatId, selectedTagIds));

  // ── Remote data ────────────────────────────────────────────────────────
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [tags,         setTagsList]     = useState<Tag[]>([]);
  const [slugError,    setSlugError]    = useState<string | undefined>();
  const [slugChecking, setSlugChecking] = useState(false);
  const [showSeo,      setShowSeo]      = useState(false);
  const [mediaPicker,  setMediaPicker]  = useState<null | 'featured' | 'social' | 'inline'>(null);

  // ── Action state ───────────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<ConfirmKind>(null);
  const [busy,          setBusy]          = useState<BusyAction>(null);
  const busyRef = useRef<BusyAction>(null);       // synchronous double-submit guard
  const [actionError,   setActionError]   = useState<string | null>(null);

  // ── Load taxonomy ──────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setCategories).catch((e) => showToast(`Could not load categories: ${e.message}`, 'error'));
    getTags().then(setTagsList).catch((e) => showToast(`Could not load tags: ${e.message}`, 'error'));
  }, [showToast]);

  // ── Auto-generate slug from title (new articles, until edited by hand) ──
  const [slugTouched, setSlugTouched] = useState(isEdit);
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // ── Slug uniqueness check (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!slug || !isValidSlug(slug)) { setSlugError(undefined); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const available = await isSlugAvailable(slug, articleId ?? undefined);
        if (!cancelled) setSlugError(available ? undefined : 'This slug is already in use. Choose another.');
      } catch { /* non-fatal — the database unique constraint is the final check */ }
      finally { if (!cancelled) setSlugChecking(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug, articleId]);

  // ── Validation shared by every save path ───────────────────────────────
  const validate = useCallback((): string | null => {
    if (!user)                              return 'You are not signed in. Sign in again, then save.';
    if (!title.trim())                      return 'Title is required.';
    if (title.trim().length > 255)          return 'Title must be 255 characters or fewer.';
    if (!slug.trim())                       return 'URL slug is required.';
    if (!isValidSlug(slug.trim()))          return 'URL slug may only contain lowercase letters, numbers and single hyphens, and cannot start or end with a hyphen.';
    if (slugError)                          return slugError;
    if (seoTitle.trim().length > 70)        return 'SEO title must be 70 characters or fewer.';
    if (metaDesc.trim().length > 160)       return 'Meta description must be 160 characters or fewer.';
    return null;
  }, [user, title, slug, slugError, seoTitle, metaDesc]);

  // ── Content payload — never includes status/publication fields ─────────
  // Status changes only through the explicit Publish/Schedule/Unpublish
  // actions, so an autosave can never undo a publish.
  const contentPayload = useCallback(() => ({
    title:            title.trim(),
    slug:             slug.trim(),
    excerpt:          excerpt.trim(),
    body:             sanitiseHtml(body),
    featured_image_id: featuredImage?.id ?? null,
    social_image_id:  socialImage?.id ?? null,
    seo_title:        seoTitle.trim()     || null,
    meta_description: metaDesc.trim()     || null,
    canonical_url:    canonicalUrl.trim() || null,
    noindex,
  }), [title, slug, excerpt, body, featuredImage, socialImage, seoTitle, metaDesc, canonicalUrl, noindex]);

  /** Write category/tag links only when they differ from what is stored. */
  const saveTaxonomy = useCallback(async (id: string) => {
    const key = taxonomyKey(selectedCatIds, primaryCatId, selectedTagIds);
    if (key === savedTaxonomyKey.current) return;
    const primary = selectedCatIds.includes(primaryCatId) ? primaryCatId : (selectedCatIds[0] ?? '');
    await setArticleCategories(id, selectedCatIds.map((cid) => ({ categoryId: cid, isPrimary: cid === primary })));
    await setArticleTags(id, selectedTagIds);
    savedTaxonomyKey.current = key;
  }, [selectedCatIds, primaryCatId, selectedTagIds]);

  /**
   * Save the current form to the database.
   * - Existing article → UPDATE (never a second insert).
   * - New article      → INSERT once; a retry after a partial failure
   *                      updates the row that was already created.
   * Resolves only after the database confirmed every write.
   */
  const performSave = useCallback(async (): Promise<ArticleServerState> => {
    const problem = validate();
    if (problem) throw new Error(problem);

    let state: ArticleServerState;
    if (articleId) {
      state = await updateArticle(articleId, contentPayload());
    } else {
      state = await createArticle({
        ...contentPayload(),
        status:              'draft',
        author_id:           user!.id,
        author_display_name: profile?.display_name || 'Chef Peter the Teacher',
        published_at:        null,
        scheduled_for:       null,
      });
    }
    applyServerState(state);          // from here on, saves update this row
    await saveTaxonomy(state.id);
    return state;
  }, [validate, articleId, contentPayload, user, profile, applyServerState, saveTaxonomy]);

  // ── Autosave (existing articles only) ──────────────────────────────────
  const autosaveData = useMemo(() => ({
    title, slug, excerpt, body,
    seoTitle, metaDesc, canonicalUrl, noindex,
    featuredImageId: featuredImage?.id ?? null,
    socialImageId:   socialImage?.id ?? null,
    selectedCatIds, primaryCatId, selectedTagIds,
  }), [title, slug, excerpt, body, seoTitle, metaDesc, canonicalUrl, noindex, featuredImage, socialImage, selectedCatIds, primaryCatId, selectedTagIds]);

  const onAutosave = useCallback(async () => { await performSave(); }, [performSave]);

  const { status: autosaveStatus, error: autosaveError, saveNow, isDirty: editDirty } = useAutosave({
    data:     autosaveData,
    onSave:   onAutosave,
    interval: 4000,
    enabled:  isEdit,
  });

  // ── SEO quality checks ─────────────────────────────────────────────────
  const seoChecks = useMemo(() => runSeoChecks({
    title, slug, excerpt, body,
    seoTitle:         seoTitle || null,
    metaDescription:  metaDesc || null,
    hasFeaturedImage: !!featuredImage,
    featuredImageAlt: featuredImage?.alt_text ?? null,
    noindex,
    wordCount:        wordCountOf(body),
  }), [title, slug, excerpt, body, seoTitle, metaDesc, featuredImage, noindex]);

  // ── Unsaved changes guard ──────────────────────────────────────────────
  const newHasContent = !isEdit && !articleId && !!(title.trim() || wordCountOf(body) || excerpt.trim());
  const isDirty = isEdit ? (editDirty || autosaveStatus === 'saving') : newHasContent;
  useUnsavedChanges(isDirty);

  /**
   * Run one action at a time. Prevents double submission and guarantees the
   * button state is always reset, success or failure.
   */
  const runAction = useCallback(async (kind: Exclude<BusyAction, null>, fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = kind;
    setBusy(kind);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      busyRef.current = null;
      setBusy(null);
      setConfirmAction(null);
    }
  }, [showToast]);

  /** Ensure the latest content is stored. Returns the article's server state. */
  const flushSave = useCallback(async (): Promise<ArticleServerState> => {
    if (isEdit) {
      await saveNow();                      // no-op when nothing changed
      const problem = validate();
      if (problem) throw new Error(problem);
      return server!;
    }
    return performSave();
  }, [isEdit, saveNow, validate, server, performSave]);

  /** After a new article is stored, move to its edit URL (replace history). */
  const goToEdit = useCallback((id: string) => {
    navigate(`/admin/articles/${id}/edit`, { replace: true });
  }, [navigate]);

  // ── Save draft ─────────────────────────────────────────────────────────
  const handleSave = () => runAction('save', async () => {
    if (isEdit) {
      await saveNow();
      showToast('Article saved.', 'success');
    } else {
      const state = await performSave();
      goToEdit(state.id);
    }
  });

  // ── Publish now ────────────────────────────────────────────────────────
  const handlePublish = () => runAction('publish', async () => {
    if (!wordCountOf(body)) throw new Error('Add some article content before publishing.');
    const saved = await flushSave();
    const state = await publishArticle(saved.id);
    applyServerState(state);
    setScheduledFor('');
    showToast('Article published. It is now live on the website.', 'success');
    if (!isEdit) goToEdit(state.id);
  });

  // ── Unpublish ──────────────────────────────────────────────────────────
  const handleUnpublish = () => runAction('unpublish', async () => {
    if (!articleId) return;
    const state = await unpublishArticle(articleId);
    applyServerState(state);
    showToast('Article unpublished. It is now a draft (original publication date kept).', 'success');
  });

  // ── Schedule ───────────────────────────────────────────────────────────
  const handleSchedule = () => runAction('schedule', async () => {
    const utc = kampalaInputToUtc(scheduledFor);
    if (!utc) throw new Error('Choose a date and time to schedule publication.');
    if (new Date(utc) <= new Date()) throw new Error('The scheduled time must be in the future (Kampala time).');
    if (!wordCountOf(body)) throw new Error('Add some article content before scheduling.');
    const saved = await flushSave();
    const state = await scheduleArticle(saved.id, utc);
    applyServerState(state);
    setScheduledFor(utcToKampalaInput(state.scheduled_for));
    showToast(`Article scheduled for ${formatKampala(state.scheduled_for)}.`, 'success');
    if (!isEdit) goToEdit(state.id);
  });

  const handleCancelSchedule = () => runAction('cancel', async () => {
    if (!articleId) return;
    const state = await cancelSchedule(articleId);
    applyServerState(state);
    showToast('Schedule cancelled. The article is a draft again.', 'success');
  });

  // ── Archive ────────────────────────────────────────────────────────────
  const handleArchive = () => runAction('archive', async () => {
    if (!articleId) return;
    await saveNow().catch(() => { /* archiving should not be blocked by a content error */ });
    await archiveArticle(articleId);
    showToast('Article archived.', 'success');
    navigate('/admin/articles');
  });

  // ── Preview ────────────────────────────────────────────────────────────
  const handlePreview = () => {
    // Open the tab synchronously (inside the click) so popup blockers allow it,
    // then point it at the preview once the latest content is saved.
    const win = window.open('about:blank', '_blank');
    runAction('preview', async () => {
      try {
        const saved = await flushSave();
        const url = `/admin/articles/${saved.id}/preview`;
        if (win) win.location.href = url; else window.open(url, '_blank');
        if (!isEdit) goToEdit(saved.id);
      } catch (e) {
        win?.close();
        throw e;
      }
    });
  };

  // ── Inline image insertion from the rich text editor ────────────────────
  const editorRef = useRef<Editor | null>(null);
  const handleInsertImage = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setMediaPicker('inline');
  }, []);

  const handleMediaSelect = useCallback((media: Media) => {
    const url = getMediaUrl(media.storage_path);
    if (mediaPicker === 'featured') {
      setFeaturedImage({ id: media.id, storage_path: media.storage_path, alt_text: media.alt_text });
    } else if (mediaPicker === 'social') {
      setSocialImage({ id: media.id, storage_path: media.storage_path, alt_text: media.alt_text });
    } else if (mediaPicker === 'inline' && editorRef.current) {
      editorRef.current.chain().focus().setImage({ src: url, alt: media.alt_text ?? media.original_filename }).run();
    }
  }, [mediaPicker]);

  // ── Toggle helpers ─────────────────────────────────────────────────────
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setSelectedCatIds((prev) => {
      if (prev.includes(catId)) {
        const next = prev.filter((id) => id !== catId);
        if (primaryCatId === catId) setPrimaryCatId(next[0] ?? '');
        return next;
      }
      if (!primaryCatId) setPrimaryCatId(catId);
      return [...prev, catId];
    });
  }, [primaryCatId]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const currentStatus = server?.status ?? 'draft';
  const saveError     = actionError ?? (autosaveStatus === 'failed' ? autosaveError : null);
  const anyBusy       = busy !== null;
  const saving        = busy === 'save' || autosaveStatus === 'saving';
  const minSchedule   = utcToKampalaInput(new Date(Date.now() + 60_000).toISOString());

  return (
    <div className="space-y-6">
      <title>{isEdit ? 'Edit Article' : 'New Article'} | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-[#DDE3EA] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span data-testid="article-status"><Badge status={currentStatus} /></span>
          {server?.published_at && currentStatus === 'published' && (
            <span className="text-xs text-[#6B7A8D]">Published: {formatKampala(server.published_at)}</span>
          )}
          {server?.scheduled_for && currentStatus === 'scheduled' && (
            <span className="text-xs text-[#6B7A8D]">Scheduled: {formatKampala(server.scheduled_for)}</span>
          )}
          {!isEdit && <span className="text-xs text-[#6B7A8D]">Not saved yet</span>}
        </div>
        {isEdit && <SaveStatusIndicator status={busy === 'save' ? 'saving' : autosaveStatus} />}
      </div>

      {/* Persistent error — stays until the next successful action */}
      {saveError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert" data-testid="save-error">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Your changes have not been saved to the database.</p>
            <p>{saveError}</p>
            <p className="text-xs text-red-600 mt-1">Your content is still in the editor. Fix the problem and save again.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left: main content ─────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Title + slug + excerpt */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title…"
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#1A2B40]">
                URL slug <span className="text-[#C0392B]" aria-hidden>*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7A8D] shrink-0">/articles/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugTouched(true); }}
                  placeholder="article-slug"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm text-[#1A2B40] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition ${slugError ? 'border-[#C0392B]' : 'border-[#DDE3EA]'}`}
                />
                {slugChecking && <span className="text-xs text-[#6B7A8D]">Checking…</span>}
                <button
                  type="button"
                  onClick={() => { setSlug(slugify(title)); setSlugTouched(true); }}
                  disabled={!title.trim()}
                  className="text-xs text-[#4A777A] hover:underline disabled:opacity-40 shrink-0"
                >
                  Generate from title
                </button>
              </div>
              {slugError && <p className="text-xs text-[#C0392B]" role="alert">{slugError}</p>}
              {!slugError && slug && !isValidSlug(slug) && (
                <p className="text-xs text-[#C0392B]" role="alert">Use lowercase letters, numbers and single hyphens; no hyphen at the start or end.</p>
              )}
              {isEdit && currentStatus === 'published' && server && slug !== server.slug && (
                <p className="text-xs text-[#D99B26]">Changing the slug of a published article changes its public URL.</p>
              )}
            </div>
            <Textarea
              label="Excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A short summary shown on article cards and in search results…"
              rows={3}
              hint="Appears in article cards and as the default meta description."
            />
          </div>

          {/* Rich text editor */}
          <div>
            <label className="block text-sm font-medium text-[#1A2B40] mb-2">
              Article body <span className="text-[#C0392B]" aria-hidden>*</span>
            </label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              onInsertImage={handleInsertImage}
              placeholder="Write your article content here…"
            />
          </div>

          {/* Featured image */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-3">
            <p className="text-sm font-medium text-[#1A2B40]">Featured image</p>
            {featuredImage ? (
              <div className="flex items-start gap-3">
                <img
                  src={getMediaUrl(featuredImage.storage_path)}
                  alt={featuredImage.alt_text ?? 'Featured image'}
                  className="w-24 h-24 rounded-lg object-cover border border-[#DDE3EA]"
                />
                <div className="flex-1">
                  <Button size="sm" variant="ghost" onClick={() => setMediaPicker('featured')}>
                    Change image
                  </Button>
                  <button
                    type="button"
                    onClick={() => setFeaturedImage(null)}
                    className="ml-2 text-xs text-[#C0392B] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" icon={<ImageIcon className="w-4 h-4" />} onClick={() => setMediaPicker('featured')}>
                Select featured image
              </Button>
            )}
          </div>

          {/* SEO panel (collapsible) */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#1A2B40] hover:bg-[#F4F6F8] transition"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#4A777A]" />
                SEO settings
              </div>
              <span className="text-[#6B7A8D]">{showSeo ? '▲' : '▼'}</span>
            </button>
            {showSeo && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#DDE3EA]">
                <Input
                  label="SEO title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || 'Overrides page <title>'}
                  maxLength={70}
                  hint={`${seoTitle.length}/70 characters`}
                />
                <Textarea
                  label="Meta description"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="Short description for search engines…"
                  maxLength={160}
                  rows={3}
                  hint={`${metaDesc.length}/160 characters`}
                />
                <Input
                  label="Canonical URL"
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://www.chefpetertheteacher.com/articles/…"
                  hint="Leave empty to use the default canonical URL."
                />
                {/* Social sharing image */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#1A2B40]">Social sharing image</p>
                  {socialImage ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={getMediaUrl(socialImage.storage_path)}
                        alt={socialImage.alt_text ?? 'Social image'}
                        className="w-24 h-24 rounded-lg object-cover border border-[#DDE3EA]"
                      />
                      <div className="flex-1">
                        <Button size="sm" variant="ghost" onClick={() => setMediaPicker('social')}>Change</Button>
                        <button type="button" onClick={() => setSocialImage(null)} className="ml-2 text-xs text-[#C0392B] hover:underline">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" icon={<ImageIcon className="w-4 h-4" />} onClick={() => setMediaPicker('social')}>
                      Select social image
                    </Button>
                  )}
                  <p className="text-xs text-[#6B7A8D]">Used for og:image and Twitter Card. Falls back to featured image if empty.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} className="w-4 h-4 accent-[#1B365D]" />
                  <span className="text-sm text-[#1A2B40]">Exclude from search engines (noindex)</span>
                </label>
              </div>
            )}
          </div>

          {/* SEO quality checks */}
          <SeoQualityPanel checks={seoChecks} />

          {/* Revision history (edit only) */}
          {isEdit && article && (
            <RevisionHistory articleId={article.id} onRestored={() => onReloadRequest?.()} />
          )}
        </div>

        {/* ── Right: sidebar controls ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4">
            {/* Save draft / Save changes */}
            <Button className="w-full" loading={saving} disabled={anyBusy && busy !== 'save'} icon={<Save className="w-4 h-4" />} onClick={handleSave}>
              {isEdit ? 'Save changes' : 'Save draft'}
            </Button>

            {/* Preview */}
            <Button variant="ghost" className="w-full" icon={<Eye className="w-4 h-4" />} onClick={handlePreview} loading={busy === 'preview'} disabled={anyBusy}>
              Preview
            </Button>

            {/* Publish / Unpublish */}
            {currentStatus !== 'published' && (
              <Button variant="secondary" className="w-full" icon={<Send className="w-4 h-4" />} onClick={() => setConfirmAction('publish')} loading={busy === 'publish'} disabled={anyBusy}>
                Publish now
              </Button>
            )}
            {currentStatus === 'published' && (
              <Button variant="ghost" className="w-full" icon={<EyeOff className="w-4 h-4" />} onClick={() => setConfirmAction('unpublish')} loading={busy === 'unpublish'} disabled={anyBusy}>
                Unpublish (revert to draft)
              </Button>
            )}

            {/* Schedule — times are entered and shown in Africa/Kampala */}
            {currentStatus !== 'published' && (
              <>
                <div className="space-y-1">
                  <label htmlFor="schedule-for" className="block text-sm font-medium text-[#1A2B40]">Schedule for (Kampala time, EAT)</label>
                  <input
                    id="schedule-for"
                    type="datetime-local"
                    value={scheduledFor}
                    min={minSchedule}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full rounded-lg border border-[#DDE3EA] px-3 py-2 text-sm text-[#1A2B40] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition"
                  />
                  {scheduledFor && kampalaInputToUtc(scheduledFor) && (
                    <p className="text-xs text-[#6B7A8D]">
                      Kampala: {formatKampala(kampalaInputToUtc(scheduledFor))} · UTC: {new Date(kampalaInputToUtc(scheduledFor)!).toUTCString()}
                    </p>
                  )}
                  <p className="text-xs text-[#6B7A8D]">
                    Published by the daily job at 03:00 Kampala time on or after this time.
                  </p>
                </div>
                <Button variant="ghost" className="w-full" icon={<Clock className="w-4 h-4" />} onClick={handleSchedule} loading={busy === 'schedule'} disabled={!scheduledFor || anyBusy}>
                  {currentStatus === 'scheduled' ? 'Update schedule' : 'Schedule publication'}
                </Button>
                {currentStatus === 'scheduled' && (
                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={anyBusy}
                    className="w-full text-xs text-[#6B7A8D] hover:text-[#C0392B] hover:underline transition disabled:opacity-50"
                  >
                    Cancel schedule
                  </button>
                )}
              </>
            )}

            {/* Archive */}
            {isEdit && currentStatus !== 'archived' && (
              <Button variant="ghost" className="w-full" icon={<Archive className="w-4 h-4" />} onClick={() => setConfirmAction('archive')} loading={busy === 'archive'} disabled={anyBusy}>
                Archive
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => navigate('/admin/articles')} disabled={anyBusy}>
              Back to articles
            </Button>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-3">
              <p className="text-sm font-medium text-[#1A2B40]">Categories</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedCatIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} className="w-4 h-4 accent-[#1B365D]" />
                    <span className="text-sm text-[#1A2B40]">{cat.name}</span>
                    {selectedCatIds.includes(cat.id) && selectedCatIds.length > 0 && (
                      <button type="button" onClick={() => setPrimaryCatId(cat.id)}
                        className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium transition ${primaryCatId === cat.id ? 'bg-[#1B365D] text-white' : 'text-[#6B7A8D] hover:text-[#1B365D]'}`}>
                        Primary
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-3">
              <p className="text-sm font-medium text-[#1A2B40]">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border transition ${
                      selectedTagIds.includes(tag.id) ? 'bg-[#4A777A] text-white border-[#4A777A]' : 'bg-white text-[#6B7A8D] border-[#DDE3EA] hover:border-[#4A777A]'
                    }`}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article metadata (edit only) */}
          {isEdit && article && server && (
            <div className="bg-[#F4F6F8] rounded-xl border border-[#DDE3EA] p-4 text-xs text-[#6B7A8D] space-y-1">
              <p>Created: {formatKampala(article.created_at)}</p>
              <p>Last saved: {formatKampala(server.updated_at)}</p>
              {server.published_at && <p>First published: {formatKampala(server.published_at)}</p>}
              <p>Reading time: {server.reading_time_minutes} min</p>
              {/* Live word count from current editor state */}
              <p>Words: {wordCountOf(body).toLocaleString()}</p>
            </div>
          )}

          {/* Scheduling status banner */}
          {currentStatus === 'scheduled' && server?.scheduled_for && (
            <div className="bg-[#1B365D]/5 border border-[#1B365D]/20 rounded-lg p-3 text-xs text-[#1B365D] space-y-1">
              <p className="font-semibold">🕐 Scheduled for publication</p>
              <p>Kampala: {formatKampala(server.scheduled_for, { dateStyle: 'long', timeStyle: 'short' })}</p>
              <p className="text-[#4A777A]">UTC: {new Date(server.scheduled_for).toUTCString()}</p>
              <p className="text-[#6B7A8D] pt-1">
                The Vercel Cron job publishes due articles once daily at 03:00 Kampala
                time (00:00 UTC), so the article goes live at the first run on or
                after the scheduled time. No browser tab needs to remain open.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Media picker modal */}
      <MediaPickerModal
        open={mediaPicker !== null}
        onClose={() => setMediaPicker(null)}
        onSelect={handleMediaSelect}
        title={mediaPicker === 'featured' ? 'Select featured image' : mediaPicker === 'social' ? 'Select social sharing image' : 'Insert image'}
      />

      {/* Confirm dialogs for destructive/irreversible actions */}
      <ConfirmDialog
        open={confirmAction === 'publish'}
        title="Publish article"
        description={isEdit ? 'This will make the article immediately visible to the public. Are you sure?' : 'This saves the article and makes it immediately visible to the public. Are you sure?'}
        confirmLabel="Publish"
        onConfirm={handlePublish}
        onCancel={() => setConfirmAction(null)}
        loading={busy === 'publish'}
      />
      <ConfirmDialog
        open={confirmAction === 'unpublish'}
        title="Unpublish article"
        description="This will hide the article from the public. The original publication date will be preserved. Are you sure?"
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setConfirmAction(null)}
        loading={busy === 'unpublish'}
      />
      <ConfirmDialog
        open={confirmAction === 'archive'}
        title="Archive article"
        description="Archived articles are hidden from the public and from article listings. You can restore them later. Are you sure?"
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setConfirmAction(null)}
        loading={busy === 'archive'}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
