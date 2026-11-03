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
  Save, Globe, Eye, EyeOff, Send, Clock, RotateCcw,
  Archive, CheckCircle, AlertCircle, FileText, Image as ImageIcon,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  createArticle, updateArticle, slugify, isSlugAvailable,
  publishArticle, unpublishArticle, scheduleArticle, cancelSchedule,
  archiveArticle, sanitiseHtml,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeaturedImageInfo { id: string; storage_path: string; alt_text: string | null; }

interface Props {
  article?: ArticleWithRelations;
  onSaved?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Autosave status indicator
// ---------------------------------------------------------------------------

function SaveStatusIndicator({ status }: { status: AutosaveStatus }) {
  const config: Record<AutosaveStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    idle:   { label: 'All changes saved', icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    dirty:  { label: 'Unsaved changes…',  icon: <FileText   className="w-3.5 h-3.5" />, cls: 'text-[#D99B26]' },
    saving: { label: 'Saving…',            icon: <FileText   className="w-3.5 h-3.5 animate-pulse" />, cls: 'text-[#4A777A]' },
    saved:  { label: 'Saved',              icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-emerald-600' },
    failed: { label: 'Save failed',        icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'text-[#C0392B]' },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${c.cls}`} role="status" aria-live="polite">
      {c.icon}
      {c.label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArticleForm({ article, onSaved }: Props) {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();
  const isEdit            = !!article;

  // ── Featured image info (resolved from article relations) ──────────────
  const initialFeatured: FeaturedImageInfo | null = article?.featured_image
    ? { id: article.featured_image.id, storage_path: article.featured_image.storage_path, alt_text: article.featured_image.alt_text }
    : null;
  const initialSocial: FeaturedImageInfo | null = null;

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [title,            setTitle]            = useState(article?.title             ?? '');
  const [slug,             setSlug]             = useState(article?.slug             ?? '');
  const [excerpt,          setExcerpt]          = useState(article?.excerpt         ?? '');
  const [body,             setBody]             = useState(article?.body             ?? '');
  const [status,           setStatus]           = useState<ArticleStatus>(article?.status ?? 'draft');
  const [scheduledFor,     setScheduledFor]     = useState(article?.scheduled_for    ? article.scheduled_for.slice(0, 16) : '');
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

  // ── Destructive action confirm state ──────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<null | 'unpublish' | 'archive' | 'restore'>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        const available = await isSlugAvailable(slug, article?.id);
        setSlugError(available ? undefined : 'This slug is already in use. Choose another.');
      } catch { /* non-fatal */ }
      finally { setSlugChecking(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [slug, article?.id]);

  // ── Build the save payload ─────────────────────────────────────────────
  const buildPayload = useCallback(() => {
    if (!user) return null;
    return {
      title:               title.trim(),
      slug:                slug.trim(),
      excerpt:             excerpt.trim(),
      body:                sanitiseHtml(body),
      status,
      author_id:           user.id,
      author_display_name: profile?.display_name ?? 'Chef Peter the Teacher',
      featured_image_id:   featuredImage?.id ?? null,
      social_image_id:     socialImage?.id ?? null,
      published_at:        article?.published_at ?? null,    // preserve existing
      scheduled_for:       status === 'scheduled' ? new Date(scheduledFor).toISOString() : null,
      seo_title:           seoTitle.trim()     || null,
      meta_description:    metaDesc.trim()     || null,
      canonical_url:       canonicalUrl.trim() || null,
      noindex,
    };
  }, [user, profile, title, slug, excerpt, body, status, featuredImage, socialImage, article, scheduledFor, seoTitle, metaDesc, canonicalUrl, noindex]);

  // ── Save function (shared by manual save and autosave) ────────────────
  const performSave = useCallback(async () => {
    if (!user) { showToast('Not authenticated.', 'error'); throw new Error('Not authenticated'); }
    if (!title.trim()) { showToast('Title is required.', 'error'); throw new Error('Title required'); }
    if (!slug.trim())  { showToast('Slug is required.', 'error'); throw new Error('Slug required'); }
    if (slugError) throw new Error('Slug conflict');

    const payload = buildPayload();
    if (!payload) throw new Error('Not authenticated');

    let articleId: string;
    if (isEdit && article) {
      await updateArticle(article.id, payload);
      articleId = article.id;
    } else {
      articleId = await createArticle(payload);
      // For new articles, navigate to edit URL (replace, not push)
      navigate(`/admin/articles/${articleId}/edit`, { replace: true });
    }

    // Taxonomy assignments
    const catAssignments = selectedCatIds.map((id) => ({ categoryId: id, isPrimary: id === primaryCatId }));
    await setArticleCategories(articleId, catAssignments);
    await setArticleTags(articleId, selectedTagIds);

    onSaved?.(articleId);
  }, [user, title, slug, slugError, buildPayload, isEdit, article, navigate, selectedCatIds, primaryCatId, selectedTagIds, onSaved, showToast]);

  // ── Autosave hook (only for existing articles) ─────────────────────────
  // The "data" is a JSON-serializable snapshot of the form fields
  const autosaveData = useMemo(() => ({
    title, slug, excerpt, body, status, scheduledFor,
    seoTitle, metaDesc, canonicalUrl, noindex,
    featuredImageId: featuredImage?.id ?? null,
    socialImageId: socialImage?.id ?? null,
    selectedCatIds, primaryCatId, selectedTagIds,
  }), [title, slug, excerpt, body, status, scheduledFor, seoTitle, metaDesc, canonicalUrl, noindex, featuredImage, socialImage, selectedCatIds, primaryCatId, selectedTagIds]);

  const { status: autosaveStatus, saveNow } = useAutosave({
    data: autosaveData,
    onSave: performSave,
    interval: 4000,
    enabled: isEdit,
  });

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
  const isDirty = autosaveStatus === 'dirty' || autosaveStatus === 'failed';
  useUnsavedChanges(isDirty);

  // ── Manual save ─────────────────────────────────────────────────────────
  const [manualSaving, setManualSaving] = useState(false);
  const handleManualSave = async () => {
    setManualSaving(true);
    try {
      const ok = await saveNow();
      if (ok) showToast('Article saved.', 'success');
      else showToast('Save failed. Please try again.', 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setManualSaving(false); }
  };

  // ── Publish / unpublish / schedule / archive ───────────────────────────
  const handlePublish = async () => {
    if (!article) { showToast('Save the article first.', 'warning'); return; }
    setActionLoading(true);
    try {
      // Save content changes first
      if (isDirty) await performSave();
      await publishArticle(article.id);
      showToast('Article published.', 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Publish failed', 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  };

  const handleUnpublish = async () => {
    if (!article) return;
    setActionLoading(true);
    try {
      await unpublishArticle(article.id);
      showToast('Article unpublished. It is now a draft (published_at preserved).', 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unpublish failed', 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  };

  const handleSchedule = async () => {
    if (!article) { showToast('Save the article first.', 'warning'); return; }
    if (!scheduledFor) { showToast('Set a scheduled date/time first.', 'error'); return; }
    setActionLoading(true);
    try {
      if (isDirty) await performSave();
      await scheduleArticle(article.id, new Date(scheduledFor).toISOString());
      showToast(`Article scheduled for ${new Date(scheduledFor).toLocaleString('en-GB')}.`, 'success');
      onSaved?.(article.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Schedule failed', 'error');
    } finally { setActionLoading(false); }
  };

  const handleArchive = async () => {
    if (!article) return;
    setActionLoading(true);
    try {
      await archiveArticle(article.id);
      showToast('Article archived.', 'success');
      navigate('/admin/articles');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Archive failed', 'error');
    } finally { setActionLoading(false); setConfirmAction(null); }
  };

  // ── Inline image insertion from the rich text editor ────────────────────
  const handleInsertImage = useCallback((editor: Editor) => {
    setMediaPicker('inline');
    // Store editor reference for later use when media is selected
    editorRef.current = editor;
  }, []);
  const editorRef = useRef<Editor | null>(null);

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
  const currentStatus = article?.status ?? status;

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
          {isEdit && <SaveStatusIndicator status={autosaveStatus} />}
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
            <RevisionHistory articleId={article.id} onRestored={() => { /* parent will re-fetch */ }} />
          )}
        </div>

        {/* ── Right: sidebar controls ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4">
            {/* Save button */}
            <Button className="w-full" loading={manualSaving || autosaveStatus === 'saving'} icon={<Save className="w-4 h-4" />} onClick={handleManualSave}>
              {isEdit ? 'Save changes' : 'Create draft'}
            </Button>

            {/* Preview (edit only) */}
            {isEdit && (
              <Button variant="ghost" className="w-full" icon={<Eye className="w-4 h-4" />} onClick={handlePreview}>
                Preview
              </Button>
            )}

            {/* Publish / Unpublish / Schedule */}
            {isEdit && currentStatus !== 'published' && (
              <Button variant="secondary" className="w-full" icon={<Send className="w-4 h-4" />} onClick={() => setConfirmAction('publish')} loading={actionLoading}>
                Publish now
              </Button>
            )}
            {isEdit && currentStatus === 'published' && (
              <Button variant="ghost" className="w-full" icon={<EyeOff className="w-4 h-4" />} onClick={() => setConfirmAction('unpublish')} loading={actionLoading}>
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
                  {/* Show both local and UTC so there is never ambiguity */}
                  {scheduledFor && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-[#6B7A8D]">
                        Your time: {new Date(scheduledFor).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          timeZoneName: 'short',
                        })}
                      </p>
                      <p className="text-xs text-[#6B7A8D]">
                        UTC: {new Date(scheduledFor).toUTCString()}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-[#6B7A8D]">
                    The article publishes at this time in your local timezone.
                    The server stores and compares times in UTC.
                  </p>
                </div>
                <Button variant="ghost" className="w-full" icon={<Clock className="w-4 h-4" />} onClick={handleSchedule} loading={actionLoading} disabled={!scheduledFor}>
                  Schedule publication
                </Button>
                {currentStatus === 'scheduled' && (
                  <button
                    type="button"
                    onClick={async () => { await cancelSchedule(article.id); showToast('Schedule cancelled.', 'success'); }}
                    className="w-full text-xs text-[#6B7A8D] hover:text-[#C0392B] hover:underline transition"
                  >
                    Cancel schedule
                  </button>
                )}
              </>
            )}

            {/* Archive */}
            {isEdit && currentStatus !== 'archived' && (
              <Button variant="ghost" className="w-full" icon={<Archive className="w-4 h-4" />} onClick={() => setConfirmAction('archive')} loading={actionLoading}>
                Archive
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => navigate('/admin/articles')} disabled={manualSaving}>
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
              <p>Reading time: {article.reading_time_minutes} min</p>
              {/* Live word count from current editor state */}
              <p>Words: {body.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</p>
            </div>
          )}

          {/* Scheduling status banner */}
          {isEdit && currentStatus === 'scheduled' && article?.scheduled_for && (
            <div className="bg-[#1B365D]/5 border border-[#1B365D]/20 rounded-lg p-3 text-xs text-[#1B365D] space-y-1">
              <p className="font-semibold">🕐 Scheduled for publication</p>
              <p>
                Local: {new Date(article.scheduled_for).toLocaleString('en-GB', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
              <p className="text-[#4A777A]">
                UTC: {new Date(article.scheduled_for).toUTCString()}
              </p>
              <p className="text-[#6B7A8D] pt-1">
                The Vercel Cron job checks every minute and publishes this article automatically when its time arrives. No browser tab needs to remain open.
                <br />See docs/scheduling.md if the cron endpoint is not yet configured.
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
        description="Archived articles are hidden from the public and from article listings. You can restore them later. Are you sure?"
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
