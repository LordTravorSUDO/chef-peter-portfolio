import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import { SEO_PAGES } from './data/seoPages';

export const prerenderRoutes = SEO_PAGES.map(page => page.path);

/**
 * Renders an SEO landing page at build time.
 *
 * The full <App /> route tree is rendered (not the page component on its own)
 * so the static HTML has exactly the same structure — including the root
 * <Suspense> boundary — that the browser hydrates. Rendering the page alone
 * caused a hydration mismatch, which made React discard and re-render the
 * prerendered HTML on every visit.
 */
export function renderSeoPage(pathname: string) {
  const page = SEO_PAGES.find(item => item.path === pathname);
  if (!page) throw new Error(`Unknown SEO route: ${pathname}`);

  return {
    html: renderToString(
      <React.StrictMode>
        <StaticRouter location={pathname}>
          <App />
        </StaticRouter>
      </React.StrictMode>
    ),
    page
  };
}
