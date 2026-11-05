/**
 * /admin/author — Author profile (biography and photo shown on every article).
 *
 * Saved in public.author_profiles (proposed migration). Until that table
 * exists, this page shows the approved default profile used by the website
 * (src/data/authorProfile.ts) and explains that editing becomes available
 * after the database upgrade.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ImageIcon, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getMediaUrl } from '../../lib/services/media';
import {
  getAuthorProfileRow, hasAuthorProfilesTable, listAuthors, saveAuthorProfile,
} from '../../lib/services/authors';
import { DEFAULT_AUTHOR, type AuthorProfileView } from '../../data/authorProfile';
import type { Media } from '../../types/article';
import { AuthorBio } from '../../components/knowledge/ArticleParts';
import Button from '../../components/admin/ui/Button';
import Spinner from '../../components/admin/ui/Spinner';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

const field =
  'mt-1 block w-full rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 text-sm text-[#1A2B40] focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15';
const label = 'block text-sm font-medium text-[#1A2B40]';

interface FormState {
  display_name: string;
  job_title: string;
  short_bio: string;
  long_bio: string;
  profile_url: string;
  photo: { id: string; storage_path: string; alt_text: string | null } | null;
}

const LIMITS = { display_name: 120, job_title: 160, short_bio: 600, long_bio: 4000 };

export default function AdminAuthorPage() {
  const { profile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const [ready, setReady] = useState(false);
  const [tableExists, setTableExists] = useState(false);
  const [authors, setAuthors] = useState<Array<{ id: string; display_name: string }>>([]);
  const [authorId, setAuthorId] = useState<string>('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await hasAuthorProfilesTable();
      setTableExists(exists);
      try {
        const list = await listAuthors();
        setAuthors(list.filter((a) => a.role === 'admin'));
      } catch { /* list is optional */ }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!authorId && profile?.id) setAuthorId(profile.id);
  }, [profile?.id, authorId]);

  // Load the selected author's saved profile
  useEffect(() => {
    if (!ready || !tableExists || !authorId) return;
    let cancelled = false;
    setForm(null);
    getAuthorProfileRow(authorId)
      .then((row) => {
        if (cancelled) return;
        const next: FormState = row
          ? {
              display_name: row.display_name,
              job_title: row.job_title ?? '',
              short_bio: row.short_bio ?? '',
              long_bio: row.long_bio ?? '',
              profile_url: row.profile_url ?? '',
              photo: row.photo_media_id && row.photo ? { id: row.photo_media_id, storage_path: row.photo.storage_path, alt_text: row.photo.alt_text } : null,
            }
          : {
              display_name: authors.find((a) => a.id === authorId)?.display_name || '',
              job_title: '', short_bio: '', long_bio: '', profile_url: '', photo: null,
            };
        setForm(next);
        setSaved(JSON.stringify(next));
      })
      .catch((e) => showToast(e instanceof Error ? e.message : 'Could not load the profile', 'error'));
    return () => { cancelled = true; };
  }, [ready, tableExists, authorId, authors, showToast]);

  const dirty = form !== null && JSON.stringify(form) !== saved;

  const preview: AuthorProfileView = useMemo(() => {
    if (!tableExists || !form) return DEFAULT_AUTHOR;
    return {
      name: form.display_name || 'Author name',
      jobTitle: form.job_title || null,
      shortBio: form.short_bio || null,
      longBio: form.long_bio || null,
      photoUrl: form.photo ? getMediaUrl(form.photo.storage_path) : null,
      photoAlt: form.photo?.alt_text || form.display_name,
      profileUrl: form.profile_url || null,
      source: 'cms',
    };
  }, [tableExists, form]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  const useApproved = () =>
    setForm((f) => f && {
      ...f,
      display_name: DEFAULT_AUTHOR.name,
      job_title: DEFAULT_AUTHOR.jobTitle ?? '',
      short_bio: DEFAULT_AUTHOR.shortBio ?? '',
      long_bio: DEFAULT_AUTHOR.longBio ?? '',
      profile_url: DEFAULT_AUTHOR.profileUrl ?? '',
    });

  const handleSave = async () => {
    if (!form || !authorId) return;
    if (!form.display_name.trim()) { showToast('A display name is required.', 'error'); return; }
    if (form.profile_url && !/^(\/|https:\/\/)/.test(form.profile_url.trim())) {
      showToast('The profile link must start with / (a page on this site) or https://', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveAuthorProfile({
        profile_id: authorId,
        display_name: form.display_name.trim(),
        job_title: form.job_title.trim() || null,
        short_bio: form.short_bio.trim() || null,
        long_bio: form.long_bio.trim() || null,
        profile_url: form.profile_url.trim() || null,
        photo_media_id: form.photo?.id ?? null,
      });
      setSaved(JSON.stringify(form));
      showToast('Author profile saved. Article pages now show this profile.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <title>Author profile | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div>
        <h1 className="text-2xl font-bold text-[#1B365D]">Author profile</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">
          The biography and photo shown under every article and in the library. Edit it here once — every page updates.
        </p>
      </div>

      {!ready ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : !tableExists ? (
        <div className="space-y-4">
          <div className="bg-[#1B365D]/5 border border-[#1B365D]/15 rounded-lg p-4 text-sm text-[#1A2B40]">
            Editing the author profile becomes available after the author-profile database upgrade
            (<code>supabase/proposed/20261107000000_author_profiles.sql</code>, awaiting approval).
            Until then the website shows the approved profile below on every article.
          </div>
          <AuthorBio profile={DEFAULT_AUTHOR} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4">
            {authors.length > 1 && (
              <div>
                <label htmlFor="author-select" className={label}>Author</label>
                <select id="author-select" className={field} value={authorId} disabled={dirty} onChange={(e) => setAuthorId(e.target.value)}>
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.display_name || 'Unnamed admin'}</option>)}
                </select>
                {dirty && <p className="text-xs text-[#6B7A8D] mt-1">Save or discard your changes before switching author.</p>}
              </div>
            )}

            {!form ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#6B7A8D]">Fields marked * are required.</p>
                  <button type="button" onClick={useApproved} className="text-sm text-[#1B365D] hover:underline">
                    Fill in the approved Chef Peter profile
                  </button>
                </div>
                <div>
                  <label htmlFor="ap-name" className={label}>Display name *</label>
                  <input id="ap-name" className={field} maxLength={LIMITS.display_name} value={form.display_name} onChange={set('display_name')} />
                </div>
                <div>
                  <label htmlFor="ap-title" className={label}>Professional title</label>
                  <input id="ap-title" className={field} maxLength={LIMITS.job_title} value={form.job_title} onChange={set('job_title')} placeholder="e.g. Professional chef and culinary educator" />
                </div>
                <div>
                  <label htmlFor="ap-short" className={label}>Short biography <span className="font-normal text-[#6B7A8D]">(under each article)</span></label>
                  <textarea id="ap-short" rows={3} className={field} maxLength={LIMITS.short_bio} value={form.short_bio} onChange={set('short_bio')} />
                  <p className="text-xs text-[#6B7A8D] mt-0.5">{form.short_bio.length}/{LIMITS.short_bio}</p>
                </div>
                <div>
                  <label htmlFor="ap-long" className={label}>Longer biography <span className="font-normal text-[#6B7A8D]">(library page)</span></label>
                  <textarea id="ap-long" rows={6} className={field} maxLength={LIMITS.long_bio} value={form.long_bio} onChange={set('long_bio')} />
                  <p className="text-xs text-[#6B7A8D] mt-0.5">{form.long_bio.length}/{LIMITS.long_bio}</p>
                </div>
                <div>
                  <label htmlFor="ap-url" className={label}>Profile link</label>
                  <input id="ap-url" className={field} value={form.profile_url} onChange={set('profile_url')} placeholder="/about-chef-peter" />
                </div>
                <div>
                  <p className={label}>Author photo</p>
                  <div className="mt-2 flex items-center gap-4">
                    {form.photo ? (
                      <img src={getMediaUrl(form.photo.storage_path)} alt={form.photo.alt_text ?? ''} className="w-20 h-20 rounded-full object-cover border border-[#DDE3EA]" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#F4F6F8] border border-[#DDE3EA] flex items-center justify-center text-[#6B7A8D]"><UserRound className="w-8 h-8" /></div>
                    )}
                    <div className="space-x-2">
                      <Button size="sm" variant="ghost" icon={<ImageIcon className="w-4 h-4" />} onClick={() => setPicker(true)}>
                        {form.photo ? 'Change photo' : 'Choose from media library'}
                      </Button>
                      {form.photo && (
                        <button type="button" onClick={() => setForm((f) => f && { ...f, photo: null })} className="text-xs text-[#C0392B] hover:underline">Remove</button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7A8D] mt-1">Upload the portrait in Media first. Without a photo, no image is shown.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE3EA]">
                  <Button variant="ghost" disabled={!dirty || saving} onClick={() => setForm(JSON.parse(saved))}>Discard changes</Button>
                  <Button loading={saving} disabled={!dirty} onClick={handleSave}>Save profile</Button>
                </div>
              </>
            )}
          </div>

          <div className="xl:col-span-2 space-y-2">
            <p className="text-sm font-medium text-[#1A2B40]">Preview (as shown under articles)</p>
            <div className="bg-cream rounded-xl p-2 [&>aside]:mt-0">
              <AuthorBio profile={preview} />
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={picker}
        onClose={() => setPicker(false)}
        title="Choose the author photo"
        onSelect={(m: Media) => {
          setForm((f) => f && { ...f, photo: { id: m.id, storage_path: m.storage_path, alt_text: m.alt_text } });
          setPicker(false);
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
