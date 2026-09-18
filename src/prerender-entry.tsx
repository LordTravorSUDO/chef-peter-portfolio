import React from 'react';
import { renderToString } from 'react-dom/server';
import { SeoLandingPage } from './components/SeoLandingPage';
import { SEO_PAGES } from './data/seoPages';

export const prerenderRoutes = SEO_PAGES.map(page => page.path);

export function renderSeoPage(pathname: string) {
  const page = SEO_PAGES.find(item => item.path === pathname);
  if (!page) throw new Error(`Unknown SEO route: ${pathname}`);

  return {
    html: renderToString(<SeoLandingPage page={page} />),
    page
  };
}
