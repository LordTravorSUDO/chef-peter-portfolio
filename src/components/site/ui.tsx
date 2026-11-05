/**
 * Shared presentation primitives for the public site.
 *
 * These keep spacing, headings, buttons and cards consistent across the
 * homepage and SEO landing pages. They are plain components (no browser APIs),
 * so they are safe to use in the build-time prerender.
 */
import React from 'react';

type Tone = 'cream' | 'paper' | 'charcoal';

const toneClass: Record<Tone, string> = {
  cream: 'bg-cream text-ink',
  paper: 'bg-paper text-ink',
  charcoal: 'bg-charcoal text-cream',
};

export function Container({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Section({
  id,
  tone = 'cream',
  className = '',
  labelledBy,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${toneClass[tone]} py-20 md:py-28 ${className}`}>
      {children}
    </section>
  );
}

/** Small uppercase label that sits above a heading. */
export function Eyebrow({ children, onDark = false, className = '' }: { children: React.ReactNode; onDark?: boolean; className?: string }) {
  return (
    <p className={`text-[0.8125rem] font-semibold uppercase tracking-[0.14em] ${onDark ? 'text-gold-light' : 'text-gold-deep'} ${className}`}>
      {children}
    </p>
  );
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  intro,
  onDark = false,
  align = 'left',
  className = '',
}: {
  id?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  intro?: React.ReactNode;
  onDark?: boolean;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <header className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
      <h2
        id={id}
        className={`mt-3 font-serif text-[2rem] font-semibold leading-[1.15] sm:text-[2.5rem] ${onDark ? 'text-cream' : 'text-ink'}`}
      >
        {title}
      </h2>
      <span aria-hidden="true" className={`mt-5 block h-px w-14 bg-gold ${align === 'center' ? 'mx-auto' : ''}`} />
      {intro && (
        <p className={`mt-5 text-[1.0625rem] leading-relaxed ${onDark ? 'text-cream-soft' : 'text-ink-soft'}`}>{intro}</p>
      )}
    </header>
  );
}

/* ----------------------------------------------------------------------------
   Buttons — exported as class strings so they can be applied to <a>, <button>
   or router links without wrapper components.
---------------------------------------------------------------------------- */
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[0.9375rem] font-semibold leading-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60';

export const btn = {
  /** Dark solid — main action on light backgrounds */
  primary: `${btnBase} bg-charcoal text-cream hover:bg-ink-soft`,
  /** Outline — secondary action on light backgrounds */
  secondary: `${btnBase} border border-ink/25 text-ink hover:border-ink hover:bg-card`,
  /** Gold solid — accent action (used sparingly) */
  accent: `${btnBase} bg-gold text-ink hover:bg-gold-light`,
  /** Light solid — main action on charcoal */
  light: `${btnBase} bg-cream text-charcoal hover:bg-gold-light`,
  /** Outline on charcoal */
  lightOutline: `${btnBase} border border-cream/35 text-cream hover:border-cream hover:bg-charcoal-soft`,
  /** WhatsApp */
  whatsapp: `${btnBase} bg-whatsapp text-ink hover:bg-[#3ee07a]`,
  /** Underlined text link with arrow */
  text: 'inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-gold decoration-2 underline-offset-[6px] transition-colors hover:text-gold-deep',
  textOnDark:
    'inline-flex items-center gap-1.5 font-semibold text-cream underline decoration-gold decoration-2 underline-offset-[6px] transition-colors hover:text-gold-light',
};

export const card = 'rounded-[var(--radius-card)] border border-sand bg-card';

/** Removes emoji (e.g. flag characters) from data labels for cleaner captions. */
export function stripEmoji(value: string): string {
  return value
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
