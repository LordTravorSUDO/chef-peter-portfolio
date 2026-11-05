import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { SEO_PAGES } from '../data/seoPages';
import { Container, Eyebrow, btn } from './site/ui';
import { ReviewNote } from './site/ReviewNote';

/**
 * "The Teacher" — how Chef Peter teaches. Replaces the former Philosophy
 * section and keeps its quotation and supporting statement.
 * Class steps and audiences come from the existing cooking-classes page.
 */
export const TeachingSection: React.FC = () => {
  const classesPage = SEO_PAGES.find((p) => p.path === '/cooking-classes-kampala');
  const steps = classesPage?.process ?? [];
  const audience = classesPage?.audience ?? [];

  return (
    <section id="teaching" aria-labelledby="teaching-title" className="bg-charcoal py-20 text-cream md:py-28">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow onDark>The Teacher</Eyebrow>
            <h2 id="teaching-title" className="mt-3 font-serif text-[2rem] font-semibold leading-[1.15] text-cream sm:text-[2.5rem]">
              Learning by doing, with the reasons explained
            </h2>
            <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold" />
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-cream-soft">
              More than a title, “the Teacher” reflects a long commitment to mentorship — training hotel kitchen brigades and
              household private chefs, setting up commercial bakery systems, and writing technical manuals so that good
              practice outlasts any single class.
            </p>

            <figure className="mt-10 border-l-2 border-gold pl-6">
              <blockquote>
                <p className="font-serif text-[1.6rem] italic leading-snug text-cream">“{CHEF_PROFILE.philosophyQuote}”</p>
              </blockquote>
              <figcaption className="mt-3 text-[0.9375rem] leading-relaxed text-cream-soft">{CHEF_PROFILE.philosophySub}</figcaption>
            </figure>
            <ReviewNote>Confirm that this quotation and statement are in your own words.</ReviewNote>

            {audience.length > 0 && (
              <div className="mt-10">
                <h3 className="font-sans text-[1rem] font-semibold text-cream">Who the classes are for</h3>
                <ul className="mt-3 space-y-1.5">
                  {audience.map((a) => (
                    <li key={a} className="flex gap-3 text-[0.975rem] text-cream-soft">
                      <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <h3 className="font-serif text-[1.5rem] font-semibold text-cream">How a course works</h3>
            <ol className="mt-6 space-y-0">
              {steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-cream/15 py-6">
                  <span className="font-serif text-[1.75rem] leading-none text-gold">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h4 className="font-sans text-[1.0625rem] font-semibold text-cream">{step.title}</h4>
                    <p className="mt-1.5 text-[0.975rem] leading-relaxed text-cream-soft">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ReviewNote>
              Add class practicalities: levels, duration, group sizes, location, fees (or “from” prices) and whether a
              certificate is issued.
            </ReviewNote>
            <div className="mt-6 flex flex-col gap-3 border-t border-cream/15 pt-8 sm:flex-row sm:flex-wrap">
              <a href="/cooking-classes-kampala" className={btn.light}>
                Cooking classes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="/baking-pastry-classes" className={btn.lightOutline}>
                Baking &amp; pastry classes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
