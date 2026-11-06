import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { Container, btn } from './site/ui';
import { ReviewNote } from './site/ReviewNote';

/** Education — compact band between Experience and Services (anchor #credentials). */
export const EducationCredentialsSection: React.FC = () => {
  const { education } = CHEF_PROFILE;

  return (
    <section id="credentials" aria-labelledby="credentials-title" className="border-y border-sand bg-paper py-14 md:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">Education</p>
            <h2 id="credentials-title" className="mt-2 font-serif text-[1.75rem] font-semibold leading-tight text-ink">
              {education.degree}
            </h2>
            <p className="mt-1 text-ink-soft">{education.institution}</p>
            <ReviewNote>Confirm the full degree title, field of study and year of graduation.</ReviewNote>
          </div>
          <div className="lg:col-span-8">
            <h3 className="font-sans text-[1rem] font-semibold text-ink">Professional focus areas</h3>
            <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {education.specializations.map((spec) => (
                <li key={spec} className="flex gap-3 text-[0.975rem] leading-relaxed text-ink-soft">
                  <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
            <ReviewNote>
              Confirm which of these areas were part of the MUBS degree and which come from professional practice.
            </ReviewNote>
            <a href="/about-chef-peter#credentials-heading" className={`${btn.text} mt-6`}>
              Certificates, recognition and professional standing
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
};
