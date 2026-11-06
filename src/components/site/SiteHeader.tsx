/**
 * Lightweight header for the SEO landing pages and the articles section.
 * It needs no JavaScript (the mobile menu uses <details>), so it renders
 * correctly in the build-time prerender and before hydration.
 */
import React from 'react';
import { Menu } from 'lucide-react';

const LINKS = [
  { name: 'About', href: '/#story' },
  { name: 'Services', href: '/#services' },
  { name: 'Books', href: '/#books' },
  { name: 'Articles', href: '/articles' },
  { name: 'Contact', href: '/#contact' },
];

export function SiteHeader({ current }: { current?: 'articles' }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur-sm">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[80] focus:rounded focus:bg-charcoal focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <a href="/" className="font-serif text-[1.25rem] font-semibold leading-none text-ink sm:text-[1.35rem]" aria-label="Chef Peter the Teacher — home">
          Chef Peter <em className="font-normal italic text-gold-deep">the Teacher</em>
        </a>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active = current === 'articles' && l.href === '/articles';
              return (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded px-3 py-2 text-[0.9375rem] font-medium transition-colors hover:text-ink hover:underline hover:decoration-gold hover:decoration-2 hover:underline-offset-8 ${
                      active ? 'text-ink underline decoration-gold decoration-2 underline-offset-8' : 'text-ink-soft'
                    }`}
                  >
                    {l.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <details className="relative md:hidden">
          <summary
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-ink ring-1 ring-sand [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </summary>
          <nav aria-label="Main" className="absolute right-0 top-14 w-56 rounded-md border border-sand bg-cream p-2 shadow-[0_16px_40px_-16px_rgba(28,26,23,0.35)]">
            <ul>
              {[{ name: 'Home', href: '/' }, ...LINKS].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="block rounded px-3 py-2.5 text-[1rem] text-ink hover:bg-paper">
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
