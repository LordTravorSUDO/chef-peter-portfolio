/**
 * Admin page loaders, shared by the router (React.lazy) and the idle-time
 * prefetch in AdminLayout, so both use the same code-split chunks.
 */
export const adminPages = {
  dashboard:  () => import('./AdminDashboard'),
  articles:   () => import('./AdminArticlesPage'),
  newArticle: () => import('./AdminNewArticle'),
  editArticle:() => import('./AdminEditArticle'),
  preview:    () => import('./ArticlePreviewPage'),
  media:      () => import('./AdminMediaPage'),
  categories: () => import('./AdminCategoriesPage'),
  tags:       () => import('./AdminTagsPage'),
  seo:        () => import('./AdminSeoPage'),
  settings:   () => import('./AdminSettingsPage'),
};

let prefetched = false;

/**
 * Download the code for the most-used admin pages in the background once the
 * CMS is idle, so opening the editor or media library does not wait for a
 * download. Skipped on data-saver / very slow connections.
 */
export function prefetchAdminPages(): void {
  if (prefetched || typeof window === 'undefined') return;
  prefetched = true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

  const run = () => {
    const order = [adminPages.articles, adminPages.editArticle, adminPages.newArticle, adminPages.media];
    order.reduce((p, loadPage) => p.then(() => loadPage()).then(() => undefined, () => undefined), Promise.resolve());
  };
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(run, { timeout: 4000 }); else setTimeout(run, 2000);
}
