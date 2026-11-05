import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { STORY } from '../data/siteContent';
import { ImageWithFallback } from './ImageWithFallback';
import { Container, Section, SectionHeader, btn } from './site/ui';
import { ReviewNote } from './site/ReviewNote';

export const StorySection: React.FC = () => {
  const { aboutStory } = CHEF_PROFILE;

  return (
    <Section id="story" tone="paper" labelledBy="story-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Narrative */}
          <div className="lg:col-span-7">
            <SectionHeader id="story-title" eyebrow={STORY.eyebrow} title={STORY.title} />
            <ReviewNote>{STORY.reviewIntro}</ReviewNote>

            <p className="mt-8 font-serif text-[1.375rem] italic leading-snug text-ink">{STORY.intro}</p>

            <div className="mt-8 space-y-7">
              {STORY.paragraphs.map((p) => (
                <div key={p.theme} className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
                  <p className="pt-1 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">{p.theme}</p>
                  <div>
                    <p className="text-[1.0625rem] leading-[1.75] text-ink-soft">{p.text}</p>
                    {p.review && <ReviewNote>{p.review}</ReviewNote>}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 font-serif text-[1.5rem] italic text-ink">— Chef Peter</p>
          </div>

          {/* Portrait, facts and current work */}
          <aside className="lg:col-span-5" aria-label="Chef Peter at a glance">
            <figure>
              <ImageWithFallback
                src={CHEF_PROFILE.chefImages.storyPortrait}
                alt="Chef Peter teaching a baking class in front of a whiteboard of lesson notes"
                fallbackText="Chef Peter teaching"
                loading="lazy"
                width={720}
                height={900}
                className="aspect-[4/5] rounded-lg"
              />
              <figcaption className="mt-3 text-[0.875rem] text-muted">Chef Peter leading a practical baking class.</figcaption>
            </figure>
            <ReviewNote>Confirm the photo caption (where and when this class took place).</ReviewNote>

            <dl className="mt-8 divide-y divide-sand border-y border-sand">
              {STORY.facts.map((fact) => (
                <div key={fact.label} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3.5">
                  <dt className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">{fact.label}</dt>
                  <dd className="text-[0.975rem] text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <ReviewNote>{STORY.factsReview}</ReviewNote>

            <blockquote className="mt-8 border-l-2 border-gold pl-5">
              <p className="font-serif text-[1.25rem] italic leading-snug text-ink">“{STORY.pullQuote}”</p>
              <footer className="mt-2 text-[0.875rem] text-muted">Chef Peter</footer>
            </blockquote>
            <ReviewNote>{STORY.pullQuoteReview}</ReviewNote>
          </aside>
        </div>

        {/* What Chef Peter does today — existing "pillars" */}
        <div className="mt-16 border-t border-sand pt-12">
          <h3 className="font-serif text-[1.5rem] font-semibold text-ink">My work today</h3>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {aboutStory.pillars.map((pillar) => (
              <div key={pillar.title}>
                <h4 className="font-sans text-[1rem] font-semibold text-ink">{pillar.title}</h4>
                <p className="mt-2 text-[0.975rem] leading-relaxed text-ink-soft">{pillar.desc}</p>
              </div>
            ))}
          </div>
          <a href="/about-chef-peter" className={`${btn.text} mt-8`}>
            Read the full professional profile
          </a>
        </div>
      </Container>
    </Section>
  );
};
