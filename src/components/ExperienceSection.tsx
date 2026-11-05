import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CAREER } from '../data/siteContent';
import { CHEF_PROFILE } from '../data/chefProfile';
import { Container, Section, SectionHeader, stripEmoji } from './site/ui';
import { ReviewNote } from './site/ReviewNote';

/**
 * Professional experience — a readable career record grouped by sector,
 * followed by country-by-country detail (anchor #journey, kept for old links).
 */
export const ExperienceSection: React.FC = () => {
  return (
    <Section id="experience" tone="cream" labelledBy="experience-title">
      <Container>
        <SectionHeader
          id="experience-title"
          eyebrow="Professional experience"
          title="Kitchens, clients and classrooms"
          intro="Hotel kitchens, in-flight and high-volume catering, lodges, private households and international assignments — and, through De’Chosen Events Consultants, consultancy and teaching."
        />
        <ReviewNote>
          Dates are not yet shown because they are missing from the profile. Please supply start and end years for each role.
        </ReviewNote>

        <ol className="mt-12 border-t border-sand">
          {CAREER.map((entry) => (
            <li key={entry.id} className="grid gap-4 border-b border-sand py-8 md:grid-cols-12 md:gap-8">
              <div className="md:col-span-4">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">{entry.sector}</p>
                <h3 className="mt-2 font-serif text-[1.375rem] font-semibold leading-snug text-ink">{entry.role}</h3>
              </div>
              <div className="md:col-span-8">
                <ul className="space-y-1">
                  {entry.organisations.map((org) => (
                    <li key={org.name} className="text-[1rem]">
                      <span className="font-semibold text-ink">{org.name}</span>
                      <span className="text-muted"> · {org.location}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 leading-relaxed text-ink-soft">{entry.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {entry.responsibilities.map((item) => (
                    <li key={item} className="flex gap-3 text-[0.975rem] leading-relaxed text-ink-soft">
                      <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {entry.review && <ReviewNote>{entry.review}</ReviewNote>}
              </div>
            </li>
          ))}
        </ol>

        {/* Country detail — preserves the International Journey content */}
        <div id="journey" className="mt-20 scroll-mt-24">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h3 className="font-serif text-[1.75rem] font-semibold leading-tight text-ink">Experience by country</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Seven locations across East and Central Africa, the Horn of Africa and the Gulf. Select a country for details.
              </p>
            </div>
            <div className="lg:col-span-8">
              <ul className="divide-y divide-sand border-y border-sand">
                {CHEF_PROFILE.locations.map((loc) => (
                  <li key={loc.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                        <span>
                          <span className="font-serif text-[1.2rem] text-ink">{stripEmoji(loc.country)}</span>
                          <span className="ml-3 text-[0.875rem] text-muted">{loc.region}</span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 text-gold-deep transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <div className="pb-6">
                        <p className="leading-relaxed text-ink-soft">{loc.summary}</p>
                        <ul className="mt-3 space-y-1.5">
                          {loc.highlights.map((h) => (
                            <li key={h} className="flex gap-3 text-[0.975rem] leading-relaxed text-ink-soft">
                              <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[0.875rem] text-muted">
                          <span className="font-semibold text-ink-soft">Roles: </span>
                          {loc.roles.join(' · ')}
                        </p>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <ReviewNote>Confirm the role titles listed for each country.</ReviewNote>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
