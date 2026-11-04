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
 *   - Content saves never write status / published_at / scheduled_for — those
 *     are owned by the publish, unpublish and schedule actions
 *   - Existing featured and social images are loaded and preserved on save;
 *     they change only when the editor selects or removes an image
 *   - One save at a time; a created article is never inserted twice
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Save, Globe, Eye, EyeOff, Send, Clock, RotateCcw,
  Archive, CheckCircle, AlertCircle, FileText, Image as ImageIcon,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  createArticle, updateArticle, slugify, isSlugAvailable,
  publishArticle, unpublishArticle, scheduleArticle, cancelSchedule,
  archiveArticle, sanitiseHtml, estimateReadingTimeMinutes,
} from '../../lib/services/articles';
import { setArticleCategories, setArticleTags, getCategories, getTags } from '../../lib/services/taxonomy';
import { getMediaUrl } from '../../lib/services/media';
import { useAuth } from '../../hooks/useAuth';
import { useAutosave, type AutosaveStatus } from '../../hooks/useAutosave';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import type { ArticleWithRelations, Category, Tag, Media, ArticleStatus } from '../../types/article';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Select from './ui/Select';
import Badge from './ui/Badge';
import ConfirmDialog from './ui/ConfirmDialog';
import RichTextEditor from './RichTextEditor';
import MediaPickerModal from './MediaPickerModal';
import RevisionHistory from './RevisionHistory';
import SeoQualityPanel from './seo/SeoQualityPanel';
import { runSeoChecks } from '../../lib/seo/quality';
import { ToastContainer, useToast } from './ui/Toast';
import { utcIsoToZonedInput, zonedInputToUtcIso, formatInZone } from '../../lib/datetime';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeaturedImageInfo { id: string; storage_path: string; alt_text: string | null; }

interface Props {
  article?: ArticleWithRelations;
  /** Called after a save or workflow action so the parent can refresh server-side fields */
  onSaved?: (id: string) => void;
  /** Called when the stored content was replaced elsewhere (revision restore) and the form must reload */
  onReloadRequested?: () => void;
}

/** Mirrors the articles_slug_format CHECK constraint in the database */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Autosave status indicator
// ---------------------------------------------------------------------------

function SaveStatusIndicator({ status, error }: { status: AutosaveStatus; error?: string | null }) {
  const config: Record<AutosaveStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    idle:   { label: 'All changes saved', icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    dirty:  { label: 'Unsaved changes…',  icon: <FileText   className="w-3.5 h-3.5" />, cls: 'text-[#D99B26]' },
    saving: { label: 'Saving…',            icon: <FileText   className="w-3.5 h-3.5 animate-pulse" />, cls: 'text-[#4A777A]' },
    saved:  { label: 'Saved',              icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    failed: { label: 'Save failed',        icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'text-[#C0392B]' },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${c.cls}`} role="status" aria-live="polite" title={status === 'failed' && error ? error : undefined}>
      {c.icon}
      {c.label}
      {status === 'failed' && <span className="font-normal">— retrying automatically</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArticleForm({ article, onSaved, onReloadRequested }: Props) {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const { toasts, showToast, dismissToast } = useToast();
  const isEdit            = !!article;

  // ── Image info (resolved from article relations) ───────────────────────
  // If a relation could not be resolved but the ID is set, keep the ID so a
  // save never silently clears the stored image.
  const initialFeatured: FeaturedImageInfo | null = article?.featured_image
    ? { id: article.featured_image.id, storage_path: article.featured_image.storage_path, alt_text: article.featured_image.alt_text }
    : article?.featured_image_id
      ? { id: article.featured_image_id, storage_path: '', alt_text: null }
      : null;
  const initialSocial: FeaturedImageInfo | null = article?.social_image
    ? { id: article.social_image.id, storage_path: article.social_image.storage_path, alt_text: article.social_image.alt_text }
    : article?.social_image_id
      ? { id: article.social_image_id, storage_path: '', alt_text: null }
      : null;

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [title,            setTitle]            = useState(article?.title             ?? '');
  const [slug,             setSlug]             = useState(article?.slug             ?? '');
  const [excerpt,          setExcerpt]          = useState(article?.excerpt         ?? '');
  const [body,             setBody]             = useState(article?.body             ?? '');
  // datetime-local value in Kampala wall time (converted from the stored UTC instant)
  const [scheduledFor,     setScheduledFor]     = useState(() => utcIsoToZonedInput(article?.scheduled_for));
  const [seoTitle,         setSeoTitle]         = useState(article?.seo_title        ?? '');
  const [metaDesc,         setMetaDesc]         = useState(article?.meta_description ?? '');
  const [canonicalUrl,     setCanonicalUrl]     = useState(article?.canonical_url   ?? '');
  const [noindex,          setNoindex]          = useState(article?.noindex         ?? false);
  const [featuredImage,   setFeaturedImage]   = useState<FeaturedImageInfo | null>(initialFeatured);
  const [socialImage,     setSocialImage]     = useState<FeaturedImageInfo | null>(initialSocial);
  const [selectedCatIds,   setSelectedCatIds]  = useState<string[]>(() => article?.article_categories?.map((ac) => ac.categories?.id ?? '').filter(Boolean) ?? []);
  const [primaryCatId,     setPrimaryCatId]    = useState<string>(() => article?.article_categories?.find((ac) => ac.is_primary)?.categories?.id ?? '');
  const [selectedTagIds,   setSelectedTagIds]  = useState<string[]>(() => article?.article_tags?.map((at) => at.tags?.id ?? '').filter(Boolean) ?? []);

  // ── Remote data ────────────────────────────────────────────────────────
  const [categories,    setCategories]   = useState<Category[]>([]);
  const [tags,          setTagsList]     = useState<Tag[]>([]);
  const [slugError,     setSlugError]    = useState<string | undefined>();
  const [slugChecking,  setSlugChecking] = useState(false);
  const [showSeo,       setShowSeo]      = useState(false);
  const [mediaPicker,   setMediaPicker]  = useState<null | 'featured' | 'social' | 'inline'>(null);

  // ── Confirm dialogs and busy state ─────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<null | 'publish' | 'savePublish' | 'unpublish' | 'archive'>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualSaving,  setManualSaving]  = useState(false);
  const busyRef = useRef(false); // synchronous double-submit guard

  /** ID of an article created by this form instance (prevents duplicate inserts) */
  const createdIdRef = useRef<string | null>(null);

  /** Taxonomy as last written to the database — avoids rewriting it on every autosave */
  const savedTaxonomyRef = useRef<string | null>(
    isEdit ? JSON.stringify({ c: [...selectedCatIds].sort(), p: primaryCatId, t: [...selectedTagIds].sort() }) : null,
  );

  // ── One-off message carried over from the previous page (e.g. after create)
  useEffect(() => {
    const flash = (location.state as { flash?: { message: string; type: 'success' | 'error' | 'warning' } } | null)?.flash;
    if (flash) {
      showToast(flash.message, flash.type);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load taxonomy ──────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getTags().then(setTagsList).catch(() => {});
  }, []);

  // ── Auto-generate slug from title ──────────────────────────────────────
  const [slugTouched, setSlugTouched] = useState(isEdit);
  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  // ── Slug uniqueness check (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    const t = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const available = await isSlugAvailable(slug, article?.id ?? createdIdRef.current ?? undefined);
        setSlugError(available ? undefined : 'This slug is already in use. Choose another.');
      } catch { /* non-fatal */ }
      finally { setSlugChecking(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [slug, article?.id]);

  // ── Validation shared by every save path ───────────────────────────────
  const validateForSave = useCallback((): void => {
    if (!user) throw new Error('You are not signed in. Sign in again and retry.');
    const t = title.trim();
    const s = slug.trim();
    if (!t) throw new Error('A title is required.');
    if (t.length > 255) throw new Error('The title must be 255 characters or fewer.');
    if (!s) throw new Error('A URL slug is required.');
    if (!SLUG_PATTERN.test(s)) {
      throw new Error('The URL slug may only contain lowercase letters, numbers and single hyphens, and cannot start or end with a hyphen.');
    }
    if (slugError) throw new Error(slugError);
  }, [user, title, slug, slugError]);

  // ── Payloads ───────────────────────────────────────────────────────────
  // Content fields only. Status, published_at and scheduled_for are owned by
  // the publish / unpublish / schedule actions, so a content save can never
  // revert a published or scheduled article.
  const buildContentPayload = useCallback(() => ({
    title:             title.trim(),
    slug:              slug.trim(),
    excerpt:           excerpt.trim(),
    body:              sanitiseHtml(body),
    featured_image_id: featuredImage?.id ?? null,
    social_image_id:   socialImage?.id ?? null,
    seo_title:         seoTitle.trim()     || null,
    meta_description:  metaDesc.trim()     || null,
    canonical_url:     canonicalUrl.trim() || null,
    noindex,
  }), [title, slug, excerpt, body, featuredImage, socialImage, seoTitle, metaDesc, canonicalUrl, noindex]);

  // ── Core save (shared by manual save, autosave and publish actions) ────
  // Returns the article ID. Never navigates and never shows toasts — callers
  // decide how to report the outcome.
  const performSave = useCallback(async (): Promise<string> => {
    validateForSave();
    const content = buildContentPayload();

    const existingId = article?.id ?? createdIdRef.current;
    let articleId: string;
    if (existingId) {
      // Author handling on edit:
      //   - author_id is never changed by an edit (it identifies the original author).
      //   - author_display_name (the public byline) follows the author's current
      //     profile name when the AUTHOR edits — preserving the existing workflow
      //     of renaming yourself in Settings and re-saving.
      //   - When a different admin edits, the original author's byline is kept.
      //   - An empty profile name never blanks the byline.
      const isOwnArticle  = article ? article.author_id === user!.id : true;
      const profileName   = profile?.display_name?.trim();
      const authorUpdate  = isOwnArticle && profileName ? { author_display_name: profileName } : {};
      await updateArticle(existingId, { ...content, ...authorUpdate });
      articleId = existingId;
    } else {
      articleId = await createArticle({
        ...content,
        status:              'draft',
        author_id:           user!.id,
        author_display_name: profile?.display_name?.trim() || 'Chef Peter the Teacher',
        published_at:        null,
        scheduled_for:       null,
      });
      createdIdRef.current = articleId;
    }

    // Taxonomy — only written when it has changed since the last save
    const taxonomyKey = JSON.stringify({ c: [...selectedCatIds].sort(), p: primaryCatId, t: [...selectedTagIds].sort() });
    if (taxonomyKey !== savedTaxonomyRef.current) {
      try {
        const catAssignments = selectedCatIds.map((id) => ({ categoryId: id, isPrimary: id === primaryCatId }));
        await setArticleCategories(articleId, catAssignments);
        await setArticleTags(articleId, selectedTagIds);
        savedTaxonomyRef.current = taxonomyKey;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        throw new Error(`The article was saved, but its categories/tags could not be saved: ${msg}`);
      }
    }

    return articleId;
  }, [validateForSave, buildContentPayload, article, user, profile, selectedCatIds, primaryCatId, selectedTagIds]);

  // ── Autosave (existing articles only) ──────────────────────────────────
  const autosaveData = useMemo(() => ({
    title, slug, excerpt, body,
    seoTitle, metaDesc, canonicalUrl, noindex,
    featuredImageId: featuredImage?.id ?? null,
    socialImageId: socialImage?.id ?? null,
    selectedCatIds, primaryCatId, selectedTagIds,
  }), [title, slug, excerpt, body, seoTitle, metaDesc, canonicalUrl, noindex, featuredImage, socialImage, selectedCatIds, primaryCatId, selectedTagIds]);

  const autosaveSave = useCallback(async () => { await performSave(); }, [performSave]);

  const {
    status: autosaveStatus,
    error: autosaveError,
    saveNow,
    hasUnsavedChanges,
  } = useAutosave({
    data: autosaveData,
    onSave: autosaveSave,
    interval: 4000,
    enabled: isEdit,
  });

  // Report autosave failures once per distinct error (manual saves report their own)
  const lastReportedErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (autosaveStatus === 'failed' && autosaveError && !busyRef.current && autosaveError !== lastReportedErrorRef.current) {
      lastReportedErrorRef.current = autosaveError;
      showToast(`Autosave failed: ${autosaveError}`, 'error');
    }
    if (autosaveStatus === 'saved') lastReportedErrorRef.current = null;
  }, [autosaveStatus, autosaveError, showToast]);

  // ── SEO quality checks (re-computed whenever relevant fields change) ───
  const seoChecks = useMemo(() => {
    const wordCount = body.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
    return runSeoChecks({
      title,
      slug,
      excerpt,
      body,
      seoTitle:           seoTitle   || null,
      metaDescription:    metaDesc   || null,
      hasFeaturedImage:   !!featuredImage,
      featuredImageAlt:   featuredImage?.alt_text ?? null,
      noindex,
      wordCount,
    });
  }, [title, slug, excerpt, body, seoTitle, metaDesc, featuredImage, noindex]);

  // ── Unsaved changes guard ──────────────────────────────────────────────
  const newArticleHasContent = !isEdit && !createdIdRef.current && !!(title.trim() || excerpt.trim() || body.replace(/<[^>]+>/g, '').trim());
  const isDirty = isEdit
    ? hasUnsavedChanges || autosaveStatus === 'saving' || autosaveStatus === 'failed'
    : newArticleHasContent;
  useUnsavedChanges(isDirty);

  /** Runs an action with a synchronous double-submit guard. */
  const runExclusive = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try { await fn(); } finally { busyRef.current = false; }
  };

  const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

  // ── Manual save ────────────────────────────────────────────────────────
  const handleManualSave = () => runExclusive(async () => {
    setManualSaving(true);
    try {
      if (!isEdit) {
        const id = await performSave();
        navigate(`/admin/articles/${id}/edit`, {
          replace: true,
          state: { flash: { message: 'Draft saved.', type: 'success' } },
        });
      } else {
        await saveNow();
        showToast('Article saved.', 'success');
        onSaved?.(article!.id);
      }
    } catch (err) {
      const msg = errMsg(err, 'Save failed. Please try again.');
      if (!isEdit && createdIdRef.current) {
        // The article row exists — continue on its edit page rather than
        // risking a duplicate insert on the next click.
        navigate(`/admin/articles/${createdIdRef.current}/edit`, {
          replace: true,
          state: { flash: { message: msg, type: 'error' } },
        });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setManualSaving(false);
    }
  });

  // ── Save & publish (new articles) ──────────────────────────────────────
  const handleSaveAndPublish = () => runExclusive(async () => {
    setActionLoading(true);
    let id: string | null = null;
    try {
      id = await performSave();
      await publishArticle(id);
      navigate(`/admin/articles/${id}/edit`, {
        replace: true,
        state: { flash: { message: 'Article saved and published.', type: 'success' } },
      });
    } catch (err) {
      const msg = errMsg(err, 'Save & publish failed.');
      const createdId = id ?? createdIdRef.current;
      if (createdId) {
        navigate(`/admin/articles/${createdId}/edit`, {
          replace: true,
          state: { flash: { message: `The draft was saved, but it was not published: ${msg}`, type: 'error' } },
        });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  });

  // ── Publish / unpublish / schedule / archive (existing articles) ───────
  const handlePublish = () => runExclusive(async () => {
    if (!article) { showToast('Save the article first.', 'warning'); return; }
    setActionLoading(true);
    try {
      await saveNow(); // persist pending content first (no-op when clean)
      await publishArticle(article.id);
      showToast('Article published.', 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(errMsg(err, 'Publish failed.'), 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  });

  const handleUnpublish = () => runExclusive(async () => {
    if (!article) return;
    setActionLoading(true);
    try {
      await unpublishArticle(article.id);
      showToast('Article unpublished. It is now a draft (published_at preserved).', 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(errMsg(err, 'Unpublish failed.'), 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  });

  const handleSchedule = () => runExclusive(async () => {
    if (!article) { showToast('Save the article first.', 'warning'); return; }
    if (!scheduledFor) { showToast('Set a scheduled date/time first.', 'error'); return; }
    setActionLoading(true);
    try {
      const scheduledUtc = zonedInputToUtcIso(scheduledFor);   // Kampala wall time → UTC, exactly once
      await saveNow();
      await scheduleArticle(article.id, scheduledUtc);
      showToast(`Article scheduled for ${formatInZone(scheduledUtc)}.`, 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(errMsg(err, 'Schedule failed.'), 'error');
    } finally { setActionLoading(false); }
  });

  const handleCancelSchedule = () => runExclusive(async () => {
    if (!article) return;
    setActionLoading(true);
    try {
      await cancelSchedule(article.id);
      showToast('Schedule cancelled. The article is a draft again.', 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(errMsg(err, 'Could not cancel the schedule.'), 'error');
    } finally { setActionLoading(false); }
  });

  const handleArchive = () => runExclusive(async () => {
    if (!article) return;
    setActionLoading(true);
    // Persist pending edits first so archiving never discards them. If they
    // cannot be saved, the article is NOT archived and the editor stays open.
    try {
      await saveNow();
    } catch (err) {
      showToast(`Archive cancelled — your latest changes could not be saved: ${errMsg(err, 'unknown error')}`, 'error');
      setActionLoading(false);
      setConfirmAction(null);
      return;
    }
    try {
      await archiveArticle(article.id);
      showToast('Article archived.', 'success');
      navigate('/admin/articles');
    } catch (err) {
      showToast(errMsg(err, 'Archive failed.'), 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  });

  // ── Inline image insertion from the rich text editor ────────────────────
  const editorRef = useRef<Editor | null>(null);
  const handleInsertImage = useCallback((editor: Editor) => {
    setMediaPicker('inline');
    // Store editor reference for later use when media is selected
    editorRef.current = editor;
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
      return [...prev, catId];
    });
  }, [primaryCatId]);

  // ── Preview ────────────────────────────────────────────────────────────
  const handlePreview = () => {
    if (!article) { showToast('Save the article first to preview it.', 'warning'); return; }
    window.open(`/admin/articles/${article.id}/preview`, '_blank');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const currentStatus: ArticleStatus = article?.status ?? 'draft';
  const anyBusy = manualSaving || actionLoading;
  return (
    <div className="space-y-6">
      <title>{isEdit ? 'Edit Article' : 'New Article'} | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Status bar */}
      {isEdit && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-[#DDE3EA] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Badge status={currentStatus} />
            {article?.published_at && (
              <span className="text-xs text-[#6B7A8D]">
                Published: {new Date(article.published_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>
          {isEdit && <SaveStatusIndicator status={autosaveStatus} error={autosaveError} />}
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
              </div>
              {slugError && <p className="text-xs text-[#C0392B]" role="alert">{slugError}</p>}
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
                {featuredImage.storage_path ? (
                  <img
                    src={getMediaUrl(featuredImage.storage_path)}
                    alt={featuredImage.alt_text ?? 'Featured image'}
                    className="w-24 h-24 rounded-lg object-cover border border-[#DDE3EA]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-[#DDE3EA] bg-[#F4F6F8] flex items-center justify-center text-[10px] text-[#6B7A8D] text-center p-1">
                    Image set (preview unavailable)
                  </div>
                )}
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
                      {socialImage.storage_path ? (
                        <img
                          src={getMediaUrl(socialImage.storage_path)}
                          alt={socialImage.alt_text ?? 'Social image'}
                          className="w-24 h-24 rounded-lg object-cover border border-[#DDE3EA]"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg border border-[#DDE3EA] bg-[#F4F6F8] flex items-center justify-center text-[10px] text-[#6B7A8D] text-center p-1">
                          Image set (preview unavailable)
                        </div>
                      )}
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
            <RevisionHistory articleId={article.id} onRestored={() => onReloadRequested?.()} />
          )}
        </div>

        {/* ── Right: sidebar controls ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4">
            {/* Save / Create button */}
            <Button className="w-full" loading={manualSaving || autosaveStatus === 'saving'} disabled={anyBusy} icon={<Save className="w-4 h-4" />} onClick={handleManualSave}>
              {isEdit ? 'Save changes' : 'Save draft'}
            </Button>

            {/* New article: save and publish in one step */}
            {!isEdit && (
              <>
                <Button variant="secondary" className="w-full" icon={<Send className="w-4 h-4" />} onClick={() => setConfirmAction('savePublish')} loading={actionLoading} disabled={anyBusy}>
                  Save &amp; publish
                </Button>
                <p className="text-xs text-[#6B7A8D] text-center leading-snug">
                  Save a draft to keep working on it, or save and publish it to the website now.
                  Scheduling becomes available after the first save.
                </p>
              </>
            )}

            {/* Preview (edit only) */}
            {isEdit && (
              <Button variant="ghost" className="w-full" icon={<Eye className="w-4 h-4" />} onClick={handlePreview}>
                Preview
              </Button>
            )}

            {/* Publish / Unpublish / Schedule */}
            {isEdit && currentStatus !== 'published' && (
              <Button variant="secondary" className="w-full" icon={<Send className="w-4 h-4" />} onClick={() => setConfirmAction('publish')} loading={actionLoading} disabled={anyBusy}>
                Publish now
              </Button>
            )}
            {isEdit && currentStatus === 'published' && (
              <Button variant="ghost" className="w-full" icon={<EyeOff className="w-4 h-4" />} onClick={() => setConfirmAction('unpublish')} loading={actionLoading} disabled={anyBusy}>
                Unpublish (revert to draft)
              </Button>
            )}

            {/* Schedule */}
            {isEdit && currentStatus !== 'published' && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[#1A2B40]">Schedule for</label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full rounded-lg border border-[#DDE3EA] px-3 py-2 text-sm text-[#1A2B40] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D] transition"
                  />
                  {/* Show both Kampala and UTC so there is never ambiguity */}
                  {scheduledFor && (() => {
                    let utcIso: string | null = null;
                    try { utcIso = zonedInputToUtcIso(scheduledFor); } catch { utcIso = null; }
                    return utcIso && (
                      <div className="space-y-0.5" data-testid="schedule-preview">
                        <p className="text-xs text-[#6B7A8D]">Kampala time: {formatInZone(utcIso)}</p>
                        <p className="text-xs text-[#6B7A8D]">UTC: {new Date(utcIso).toUTCString()}</p>
                      </div>
                    );
                  })()}
                  <p className="text-xs text-[#6B7A8D]">
                    Enter the time in Kampala time (EAT, UTC+3), whatever computer you use.
                    The server stores and compares times in UTC.
                  </p>
                </div>
                <Button variant="ghost" className="w-full" icon={<Clock className="w-4 h-4" />} onClick={handleSchedule} loading={actionLoading} disabled={!scheduledFor || anyBusy}>
                  Schedule publication
                </Button>
                {currentStatus === 'scheduled' && (
                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={anyBusy}
                    className="w-full text-xs text-[#6B7A8D] hover:text-[#C0392B] hover:underline transition"
                  >
                    Cancel schedule
                  </button>
                )}
              </>
            )}

            {/* Archive */}
            {isEdit && currentStatus !== 'archived' && (
              <Button variant="ghost" className="w-full" icon={<Archive className="w-4 h-4" />} onClick={() => setConfirmAction('archive')} loading={actionLoading} disabled={anyBusy}>
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
          {isEdit && article && (
            <div className="bg-[#F4F6F8] rounded-xl border border-[#DDE3EA] p-4 text-xs text-[#6B7A8D] space-y-1">
              <p>Created: {new Date(article.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p>Updated: {new Date(article.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              {article.published_at && <p>Published: {new Date(article.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
              {/* Live estimate using the same formula as the database column */}
              <p>Reading time: {estimateReadingTimeMinutes(sanitiseHtml(body))} min</p>
              {/* Live word count from current editor state */}
              <p>Words: {body.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</p>
            </div>
          )}

          {/* Scheduling status banner */}
          {isEdit && currentStatus === 'scheduled' && article?.scheduled_for && (
            <div className="bg-[#1B365D]/5 border border-[#1B365D]/20 rounded-lg p-3 text-xs text-[#1B365D] space-y-1">
              <p className="font-semibold">🕐 Scheduled for publication</p>
              <p>
                Kampala: {formatInZone(article.scheduled_for, undefined, {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="text-[#4A777A]">
                UTC: {new Date(article.scheduled_for).toUTCString()}
              </p>
              <p className="text-[#6B7A8D] pt-1">
                The Vercel Cron job publishes this article automatically once daily
                at 03:00 Africa/Kampala (00:00 UTC). No browser tab needs to remain open.
                <br />For more precise scheduling, see docs/scheduling.md.
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
        description="This will make the article immediately visible to the public. Are you sure?"
        confirmLabel="Publish"
        onConfirm={handlePublish}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'savePublish'}
        title="Save and publish article"
        description="This saves the article and makes it immediately visible on the website. Are you sure?"
        confirmLabel="Save & publish"
        onConfirm={handleSaveAndPublish}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'unpublish'}
        title="Unpublish article"
        description="This will hide the article from the public. The original publication date will be preserved. Are you sure?"
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'archive'}
        title="Archive article"
        description="Any unsaved changes will be saved first. Archived articles are hidden from the public and from article listings. You can restore them later. Are you sure?"
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
