/**
 * BlogLayout — header + footer wrapper for the public articles pages.
 *
 * Uses the same lightweight header and footer as the SEO landing pages so
 * the articles section matches the rest of the site.
 */

import React, { useLayoutEffect } from 'react';
import { SiteHeader } from '../site/SiteHeader';
import { Footer } from '../Footer';
import { ReviewBanner } from '../site/ReviewNote';

interface Props {
  children: React.ReactNode;
}

/**
 * Each library page renders its own <title>, description, canonical and social
 * tags (React 19 document metadata). The homepage defaults from index.html
 * (data-default-seo) and any tags injected by the Edge middleware
 * (data-seo-injected) are removed while a library page is shown, so the
 * document never contains two titles or two canonical links. The defaults are
 * put back when the visitor navigates to a non-library page.
 */
function useReplaceDefaultHeadTags() {
  useLayoutEffect(() => {
    const nodes = Array.from(document.head.querySelectorAll<HTMLElement>('[data-default-seo], [data-seo-injected]'));
    nodes.forEach((n) => n.remove());
    return () => {
      nodes.filter((n) => n.hasAttribute('data-default-seo')).forEach((n) => document.head.appendChild(n));
    };
  }, []);
}

export default function BlogLayout({ children }: Props) {
  useReplaceDefaultHeadTags();
  return (
    <div className="min-h-screen bg-cream font-sans text-ink antialiased">
      <ReviewBanner />
      <SiteHeader current="articles" />
      <main id="main">{children}</main>
      <div className="mt-20">
        <Footer />
      </div>
    </div>
  );
}
