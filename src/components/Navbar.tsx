import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { btn } from './site/ui';

interface NavbarProps {
  onOpenConsultationModal: (serviceTitle?: string) => void;
}

/** Links use "/#…" so they also work from other pages. */
const NAV_LINKS = [
  { name: 'About', href: '/#story' },
  { name: 'Experience', href: '/#experience' },
  { name: 'Services', href: '/#services' },
  { name: 'Gallery', href: '/#gallery' },
  { name: 'Books', href: '/#books' },
  { name: 'Articles', href: '/articles' },
  { name: 'Contact', href: '/#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenConsultationModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        isScrolled || menuOpen ? 'border-sand bg-cream/95 backdrop-blur-sm' : 'border-transparent bg-cream'
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[80] focus:rounded focus:bg-charcoal focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8 md:h-[4.5rem]">
        {/* Wordmark */}
        <a href="/" className="group flex flex-col leading-none" aria-label="Chef Peter the Teacher — home">
          <span className="font-serif text-[1.3rem] font-semibold text-ink sm:text-[1.4rem]">
            Chef Peter <em className="font-normal italic text-gold-deep">the Teacher</em>
          </span>
          <span className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">
            Chef · Educator · Consultant
          </span>
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="rounded px-3 py-2 text-[0.9375rem] font-medium text-ink-soft transition-colors hover:text-ink hover:underline hover:decoration-gold hover:decoration-2 hover:underline-offset-8"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <button type="button" onClick={() => onOpenConsultationModal()} className={`${btn.primary} !px-4 !py-2.5`}>
              Make an enquiry
            </button>
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink ring-1 ring-sand transition-colors hover:bg-paper lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-sand bg-cream lg:hidden">
          <ul className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-sand/70 py-3.5 font-serif text-[1.2rem] text-ink last:border-0"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          <div className="mx-auto max-w-6xl px-5 pb-5 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenConsultationModal();
              }}
              className={`${btn.primary} w-full`}
            >
              Make an enquiry
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
