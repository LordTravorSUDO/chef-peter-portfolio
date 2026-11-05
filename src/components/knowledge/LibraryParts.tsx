/**
 * Building blocks for the culinary knowledge library pages.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Category } from '../../types/article';
import { btn } from '../site/ui';

export const SITE_URL = 'https://www.chefpetertheteacher.com';
export const LIBRARY_NAME = 'The Culinary Library';

// ---------------------------------------------------------------------------
// Page metadata (React 19 hoists these tags into <head>)
// ---------------------------------------------------------------------------
export function PageMeta({
  title,
  description,
  path,
  image = `${SITE_URL}/images/chef-peter.jpg`,
  type = 'website',
  noindex = false,
  jsonLd,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const url = `${SITE_URL}${path}`;
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Chef Peter the Teacher" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export function SearchBox({
  value,
  onSearch,
  size = 'large',
  placeholder = 'Search by dish, ingredient, technique or topic',
}: {
  value: string;
  onSearch: (term: string) => void;
  size?: 'large' | 'small';
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
      className="relative"
    >
      <label htmlFor="library-search" className="sr-only">
        Search the culinary library
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id="library-search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className={`w-full rounded-md border border-sand-strong bg-card pl-12 text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-2 focus:ring-gold/40 ${
          size === 'large' ? 'py-4 pr-32 text-[1.0625rem]' : 'py-3 pr-28 text-[1rem]'
        }`}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('');
            onSearch('');
          }}
          aria-label="Clear search"
          className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <button type="submit" className={`${btn.primary} absolute right-1.5 top-1/2 -translate-y-1/2 !px-4 !py-2.5`}>
        Search
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={`${btn.secondary} !px-3 !py-2.5`}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
      </button>
      {pages.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <button
            type="button"
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`h-10 min-w-10 rounded-md px-3 text-[0.9375rem] font-semibold ${
              p === page ? 'bg-charcoal text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            {p}
          </button>
        </React.Fragment>
      ))}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className={`${btn.secondary} !px-3 !py-2.5`}
      >
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Category tiles
// ---------------------------------------------------------------------------
export function CategoryTiles({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat, i) => {
        const n = counts[cat.id] ?? 0;
        return (
          <li key={cat.id}>
            <Link
              to={`/category/${cat.slug}`}
              className="group flex h-full flex-col rounded-[var(--radius-card)] border border-sand bg-card p-6 transition-colors hover:border-gold hover:bg-gold-wash/50"
            >
              <span className="font-serif text-[1.5rem] leading-none text-gold">{String(i + 1).padStart(2, '0')}</span>
              <span className="mt-3 font-serif text-[1.25rem] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
                {cat.name}
              </span>
              {cat.description && <span className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-soft">{cat.description}</span>}
              <span className="mt-auto pt-4 text-[0.8125rem] font-semibold text-muted">
                {n > 0 ? `${n} article${n === 1 ? '' : 's'}` : 'Articles coming soon'}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Section heading used inside library pages
// ---------------------------------------------------------------------------
export function LibrarySectionHeading({
  id,
  eyebrow,
  title,
  action,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 border-b border-sand pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">{eyebrow}</p>}
        <h2 id={id} className="mt-1 font-serif text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">
          {title}
        </h2>
      </div>
      {action && (
        <Link to={action.href} className={`${btn.text} text-[0.9375rem]`}>
          {action.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The educator behind the library
// ---------------------------------------------------------------------------
export function EducatorPanel() {
  return (
    <section aria-labelledby="educator-title" className="rounded-[var(--radius-card)] bg-charcoal text-cream">
      <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[13rem_1fr]">
        <img
          src="/images/chef-peter.jpg"
          alt="Chef Peter the Teacher"
          loading="lazy"
          width={1365}
          height={768}
          className="aspect-square w-40 rounded-full object-cover object-[51%_30%] ring-2 ring-gold/60 md:w-52"
        />
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-light">The educator</p>
          <h2 id="educator-title" className="mt-2 font-serif text-[1.75rem] font-semibold leading-tight text-cream">
            Written by Chef Peter the Teacher
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cream-soft">
            A professional chef, culinary educator and founder of De’Chosen Events Consultants in Kampala. His experience spans
            hotel kitchens, in-flight and high-volume catering and international assignments, and he is the author of three
            culinary books. This library shares the practical knowledge he teaches in his classes.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="/about-chef-peter" className={btn.light}>
              About Chef Peter
            </a>
            <a href="/cooking-classes-kampala" className={btn.lightOutline}>
              Learn in a class
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
