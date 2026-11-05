import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SERVICE_PATHWAYS, type ServicePathway } from '../data/siteContent';
import { ExpertiseSection } from './ExpertiseSection';
import { Container, Section, SectionHeader, btn, card } from './site/ui';

interface ServicesSectionProps {
  onOpenConsultationModal: (serviceTitle?: string) => void;
}

const GROUPS: Array<{ id: ServicePathway['group']; title: string; intro: string }> = [
  {
    id: 'learn',
    title: 'Learn with Chef Peter',
    intro: 'Practical classes for individuals, private chefs and kitchen or bakery teams.',
  },
  {
    id: 'work',
    title: 'Work with Chef Peter',
    intro: 'Private dining, menu development, kitchen consultancy and hospitality advice.',
  },
];

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenConsultationModal }) => {
  return (
    <Section id="services" tone="cream" labelledBy="services-title">
      <Container>
        <SectionHeader
          id="services-title"
          eyebrow="Professional services"
          title="How Chef Peter can help"
          intro="Six clearly defined services, available in Kampala, across Uganda and — by arrangement — internationally."
        />

        {GROUPS.map((group) => {
          const items = SERVICE_PATHWAYS.filter((s) => s.group === group.id);
          return (
            <div key={group.id} className="mt-14">
              <div className="flex flex-col gap-1 border-b border-sand pb-4 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-serif text-[1.5rem] font-semibold text-ink">{group.title}</h3>
                <p className="text-[0.975rem] text-muted">{group.intro}</p>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {items.map((service) => (
                  <article key={service.id} className={`${card} flex flex-col border-t-2 border-t-gold p-6`}>
                    <h4 className="font-serif text-[1.25rem] font-semibold leading-snug text-ink">{service.title}</h4>
                    <p className="mt-3 text-[0.975rem] leading-relaxed text-ink-soft">{service.summary}</p>
                    <p className="mt-4 text-[0.875rem] leading-snug text-muted">
                      <span className="font-semibold text-ink-soft">For: </span>
                      {service.forWhom}
                    </p>
                    <ul className="mt-4 space-y-1.5 border-t border-sand pt-4">
                      {service.includes.map((item) => (
                        <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-snug text-ink-soft">
                          <span aria-hidden="true" className="mt-[0.6em] h-px w-2.5 shrink-0 bg-gold" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-3 pt-6">
                      <button
                        type="button"
                        onClick={() => onOpenConsultationModal(service.enquiry)}
                        className={`${btn.primary} w-full`}
                      >
                        Enquire<span className="sr-only"> about {service.title.toLowerCase()}</span>
                      </button>
                      <a href={service.href} className={`${btn.text} text-[0.9375rem]`}>
                        {service.linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}

        <ExpertiseSection />
      </Container>
    </Section>
  );
};
