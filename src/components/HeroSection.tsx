import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { CHEF_PROFILE } from '../data/chefProfile';
import { HERO } from '../data/siteContent';
import { btn } from './site/ui';

interface HeroSectionProps {
  /** Kept for API compatibility with App.tsx; the hero links to #contact instead. */
  onOpenConsultationModal?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 md:pt-12 lg:grid-cols-12 lg:gap-14 lg:pb-24 lg:pt-16">
        {/* Text */}
        <div className="lg:col-span-7">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">{HERO.eyebrow}</p>

          <h1
            id="hero-title"
            className="mt-4 font-serif text-[2.6rem] font-semibold leading-[1.05] text-ink sm:text-[3.4rem] lg:text-[3.75rem]"
          >
            Chef Peter <span className="block font-normal italic text-gold-deep">the Teacher</span>
          </h1>

          <p className="mt-6 max-w-xl text-[1.125rem] leading-relaxed text-ink-soft sm:text-[1.1875rem]">{HERO.lead}</p>

          <ul className="mt-6 space-y-2 text-[0.975rem] text-ink-soft">
            {HERO.trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-gold" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="#story" className={btn.primary}>
              Discover Chef Peter’s Journey
            </a>
            <a href="#services" className={btn.secondary}>
              Explore Professional Services
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-[0.975rem]">
            <a href="/articles" className={btn.text}>
              Explore Culinary Articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#contact" className={btn.text}>
              Contact Chef Peter <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Portrait */}
        <div className="lg:col-span-5">
          <figure className="relative max-w-[20rem] sm:mx-auto sm:max-w-[24rem] lg:max-w-none">
            <div className="relative">
              <span aria-hidden="true" className="absolute -bottom-3 -right-3 h-full w-full rounded-lg border border-gold/70" />
              <ImageWithFallback
              src={CHEF_PROFILE.chefImages.heroPortrait}
              alt="Chef Peter the Teacher smiling in his chef’s whites and toque"
              fallbackText="Portrait of Chef Peter"
              priority
              width={1365}
              height={768}
              className="relative aspect-[4/5] rounded-lg"
              imgClassName="object-[51%_center]"
              />
            </div>
            <figcaption className="mt-6 text-[0.875rem] leading-snug text-muted">
              <span className="font-semibold text-ink">{toTitleCase(CHEF_PROFILE.fullName)}</span>
              <br />
              Founder, {CHEF_PROFILE.companyName}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
