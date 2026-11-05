/**
 * BlogLayout — header + footer wrapper for the public articles pages.
 *
 * Uses the same lightweight header and footer as the SEO landing pages so
 * the articles section matches the rest of the site.
 */

import React from 'react';
import { SiteHeader } from '../site/SiteHeader';
import { Footer } from '../Footer';
import { ReviewBanner } from '../site/ReviewNote';

interface Props {
  children: React.ReactNode;
}

export default function BlogLayout({ children }: Props) {
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
