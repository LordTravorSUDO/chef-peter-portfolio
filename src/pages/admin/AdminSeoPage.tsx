/**
 * /admin/seo — SEO health, redirects, sitemap and indexing.
 *
 *  - Article checks: duplicate / missing / over-long titles and descriptions,
 *    missing share images and alt text, very long slugs, noindex articles.
 *  - Redirect manager: the Edge middleware answers active rules with real
 *    HTTP 301/302 responses. Slug changes on published articles create rules
 *    automatically.
 *  - Sitemap and robots.txt status (what is included and why).
 *
 * Nothing here submits anything to Google; Search Console stays a manual,
 * owner-approved step.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Search, ArrowRightLeft, Plus, Trash2, Power } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkArticles, type ArticleSeoIssue, type SeoCheckArticle } from '../../lib/seo/articleChecks';
import { createRedirect, deleteRedirect, getAllRedirects, updateRedirect } from '../../lib/services/redirects';
import type { Redirect } from '../../types/article';
import Button from '../../components/admin/ui/Button';
import Spinner from '../../components/admin/ui/Spinner';
import ConfirmDialog from '../../components/admin/ui/ConfirmDialog';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

const SITE = 'https://www.chefpetertheteacher.com';
const PATH = /^\/[a-z0-9\-/._~%]*$/i;

const LEVEL: Record<ArticleSeoIssue['level'], { label: string; cls: string; icon: React.ReactNode }> = {
  problem: { label: 'Fix', cls: 'text-[#C0392B]', icon: <AlertTriangle className="w-4 h-4 text-[#C0392B]" /> },
  improve: { label: 'Improve', cls: 'text-[#8A5A12]', icon: <Info className="w-4 h-4 text-[#8A5A12]" /> },
  note: { label: 'Note', cls: 'text-[#5F6E80]', icon: <Info className="w-4 h-4 text-[#5F6E80]" /> },
};

const field = 'mt-1 block w-full rounded-lg border border-[#DDE3EA] px-3 py-2 text-sm font-mono focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15';

export default function AdminSeoPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const [articles, setArticles] = useState<SeoCheckArticle[] | null>(null);
  const [redirects, setRedirects] = useState<Redirect[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error: e } = await supabase
        .from('articles')
        .select('id, title, slug, status, excerpt, seo_title, meta_description, noindex, featured_image_id, social_image_id, featured_image:media!articles_featured_image_id_fkey ( alt_text )')
        .in('status', ['published', 'scheduled'])
        .order('published_at', { ascending: false });
      if (e) throw new Error(e.message);
      setArticles((data ?? []) as unknown as SeoCheckArticle[]);
      setRedirects(await getAllRedirects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load SEO data');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const issues = useMemo(() => (articles ? checkArticles(articles) : []), [articles]);
  const grouped = useMemo(() => {
    const m = new Map<string, ArticleSeoIssue[]>();
    for (const i of issues) m.set(i.articleId, [...(m.get(i.articleId) ?? []), i]);
    return [...m.entries()].sort(([, a], [, b]) => Number(b.some((x) => x.level === 'problem')) - Number(a.some((x) => x.level === 'problem')));
  }, [issues]);
  const problems = issues.filter((i) => i.level === 'problem').length;

  const addRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = from.trim();
    const t = to.trim();
    if (!PATH.test(f) || !PATH.test(t) || f.startsWith('//') || t.startsWith('//')) { showToast('Both addresses must start with / and stay on this website (e.g. /articles/old-name).', 'error'); return; }
    if (f === t) { showToast('The old and new addresses are the same.', 'error'); return; }
    if (f === '/' || f.startsWith('/admin') || f.startsWith('/api')) { showToast('That address cannot be redirected.', 'error'); return; }
    if (redirects?.some((r) => r.is_active && r.from_path === t && r.to_path === f)) { showToast('This would create a redirect loop with an existing rule.', 'error'); return; }
    if (redirects?.some((r) => r.from_path === f)) { showToast('A rule for this old address already exists — edit or delete it first.', 'error'); return; }
    setSaving(true);
    try {
      await createRedirect({ from_path: f, to_path: t, status_code: 301, article_id: null, is_active: true });
      setFrom(''); setTo('');
      showToast('Redirect added. Visitors and search engines will be sent to the new address.', 'success');
      setRedirects(await getAllRedirects());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add the redirect', 'error');
    } finally { setSaving(false); }
  };

  const toggle = async (r: Redirect) => {
    try {
      await updateRedirect(r.id, { is_active: !r.is_active });
      setRedirects(await getAllRedirects());
    } catch (err) { showToast(err instanceof Error ? err.message : 'Could not update', 'error'); }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await deleteRedirect(deleteId);
      setDeleteId(null);
      setRedirects(await getAllRedirects());
      showToast('Redirect deleted.', 'success');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Could not delete', 'error'); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <title>SEO | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div>
        <h1 className="text-2xl font-bold text-[#1B365D]">SEO health</h1>
        <p className="text-sm text-[#5F6E80] mt-0.5">
          Checks for published and scheduled articles, redirects for moved pages, and what search engines are told to crawl.
        </p>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

      {/* Article checks */}
      <section aria-labelledby="seo-checks" className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EA] flex items-center gap-2">
          <Search className="w-4 h-4 text-[#4A777A]" />
          <h2 id="seo-checks" className="text-sm font-semibold text-[#1A2B40]">Article checks</h2>
          {articles && (
            <span className="ml-auto text-xs text-[#5F6E80]" data-testid="seo-summary">
              {articles.length} public article{articles.length === 1 ? '' : 's'} · {problems} to fix · {issues.length - problems} suggestions
            </span>
          )}
        </div>
        {!articles ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : grouped.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#2F6B3F] flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Every public article has a unique title and description, a share image and alt text.</p>
        ) : (
          <ul className="divide-y divide-[#DDE3EA]">
            {grouped.map(([id, list]) => (
              <li key={id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm text-[#1A2B40]">{list[0].title}</p>
                  <Link to={`/admin/articles/${id}/edit`} className="text-xs text-[#4A777A] hover:text-[#1B365D] font-medium shrink-0">Edit</Link>
                </div>
                <ul className="mt-1 space-y-1">
                  {list.map((i) => (
                    <li key={i.message} className={`flex items-start gap-2 text-sm ${LEVEL[i.level].cls}`}>
                      {LEVEL[i.level].icon}
                      <span><span className="font-medium">{LEVEL[i.level].label}:</span> {i.message}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Redirects */}
      <section aria-labelledby="seo-redirects" className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EA] flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-[#4A777A]" />
          <h2 id="seo-redirects" className="text-sm font-semibold text-[#1A2B40]">Redirects</h2>
        </div>
        <div className="px-5 py-4 text-sm text-[#5F6E80] space-y-1">
          <p>When a page moves, a redirect sends visitors and search engines from the old address to the new one (HTTP 301), so links and rankings are not lost.</p>
          <p>Changing the URL slug of a published article creates a redirect automatically.</p>
        </div>
        <form onSubmit={addRedirect} className="px-5 pb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label htmlFor="redirect-from" className="block text-xs font-medium text-[#1A2B40]">Old address</label>
            <input id="redirect-from" className={field} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/articles/old-name" />
          </div>
          <div>
            <label htmlFor="redirect-to" className="block text-xs font-medium text-[#1A2B40]">New address</label>
            <input id="redirect-to" className={field} value={to} onChange={(e) => setTo(e.target.value)} placeholder="/articles/new-name" />
          </div>
          <Button type="submit" loading={saving} icon={<Plus className="w-4 h-4" />} disabled={!from.trim() || !to.trim()}>Add redirect</Button>
        </form>
        {!redirects ? (
          <div className="p-6 flex justify-center"><Spinner /></div>
        ) : redirects.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[#5F6E80]">No redirects yet.</p>
        ) : (
          <div className="overflow-x-auto border-t border-[#DDE3EA]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F8] text-left text-xs uppercase tracking-wide text-[#5F6E80]">
                  <th scope="col" className="px-5 py-2 font-medium">Old address</th>
                  <th scope="col" className="px-5 py-2 font-medium">New address</th>
                  <th scope="col" className="px-5 py-2 font-medium">Status</th>
                  <th scope="col" className="px-5 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3EA]">
                {redirects.map((r) => (
                  <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                    <td className="px-5 py-2 font-mono text-xs break-all">{r.from_path}</td>
                    <td className="px-5 py-2 font-mono text-xs break-all">{r.to_path}</td>
                    <td className="px-5 py-2 text-xs">{r.is_active ? `Active (${r.status_code})` : 'Off'}</td>
                    <td className="px-5 py-2">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => toggle(r)} aria-label={`${r.is_active ? 'Turn off' : 'Turn on'} redirect from ${r.from_path}`} title={r.is_active ? 'Turn off' : 'Turn on'} className="p-1.5 rounded text-[#5F6E80] hover:text-[#1B365D]"><Power className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteId(r.id)} aria-label={`Delete redirect from ${r.from_path}`} className="p-1.5 rounded text-[#5F6E80] hover:text-[#C0392B]"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sitemap and robots */}
      <section aria-labelledby="seo-crawl" className="bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#4A777A]" />
          <h2 id="seo-crawl" className="text-sm font-semibold text-[#1A2B40]">Sitemap and indexing</h2>
        </div>
        <ul className="text-sm text-[#5F6E80] space-y-2">
          <li>
            <a href={`${SITE}/sitemap.xml`} target="_blank" rel="noopener noreferrer" className="text-[#4A777A] underline">{SITE}/sitemap.xml</a> lists the
            homepage, the library, the service and profile pages, categories with published articles, and every published article. It updates automatically.
          </li>
          <li>Drafts, scheduled, archived and “noindex” articles, topic (tag) pages, search results and admin pages are never listed.</li>
          <li><span className="font-mono">robots.txt</span> blocks <span className="font-mono">/admin/</span> and <span className="font-mono">/api/</span> but allows the sitemap.</li>
          <li>A sitemap tells search engines what exists; it does not guarantee indexing. Check coverage in Google Search Console (owner access required).</li>
        </ul>
      </section>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete redirect"
        description="Delete this redirect? Anyone using the old address will reach a “not found” page instead. To pause it, turn it off."
        confirmLabel="Delete redirect"
        onConfirm={remove}
        onCancel={() => setDeleteId(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
