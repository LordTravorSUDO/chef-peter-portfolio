/**
 * BlogLayout — minimal header + footer wrapper for public CMS pages.
 *
 * Matches the site's dark luxury design.
 * The portfolio homepage has its own full Navbar/Footer; the blog pages
 * use this lighter shell so they remain visually consistent without
 * importing the heavy portfolio Navbar.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function BlogLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0C0C0C]/90 backdrop-blur-md border-b border-[#C5A059]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C5A059] to-[#735722] flex items-center justify-center">
              <Award className="w-4 h-4 text-[#0C0C0C]" />
            </div>
            <div>
              <p className="text-sm font-serif font-bold text-[#EAE7E2] group-hover:text-[#C5A059] transition leading-none">
                Chef Peter <span className="text-[#C5A059]">the Teacher</span>
              </p>
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#A09E98]">
                De'Chosen Events Consultants
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-5 text-sm" aria-label="Blog navigation">
            <Link
              to="/articles"
              className="text-[#A09E98] hover:text-[#C5A059] transition text-xs font-medium uppercase tracking-wide"
            >
              Articles
            </Link>
            <Link
              to="/#contact"
              className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#C5A059]/10 mt-20 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6A6A6A]">
          <p>© 2026 Chef Peter the Teacher. All Rights Reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/articles" className="hover:text-[#C5A059] transition">Articles</Link>
            <Link to="/" className="hover:text-[#C5A059] transition">Portfolio</Link>
            <Link to="/#contact" className="hover:text-[#C5A059] transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
