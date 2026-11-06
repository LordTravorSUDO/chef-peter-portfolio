import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';

/**
 * Specialist knowledge — every competency area and item from the profile,
 * shown as compact reference lists inside the Services section (anchor #expertise).
 */
export const ExpertiseSection: React.FC = () => {
  const { competencies } = CHEF_PROFILE;

  return (
    <div id="expertise" className="mt-20 scroll-mt-24 rounded-[var(--radius-card)] bg-paper p-6 sm:p-10">
      <h3 className="font-serif text-[1.5rem] font-semibold text-ink">Specialist knowledge</h3>
      <p className="mt-2 max-w-2xl text-[0.975rem] leading-relaxed text-ink-soft">
        The skills behind the services, from wedding-cake construction to commercial kitchen workflow.
      </p>
      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {competencies.map((area) => (
          <div key={area.id}>
            <h4 className="font-sans text-[1rem] font-semibold text-ink">{area.title}</h4>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{area.shortDesc}</p>
            <ul className="mt-3 space-y-1.5">
              {area.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-snug text-ink-soft">
                  <span aria-hidden="true" className="mt-[0.6em] h-px w-2.5 shrink-0 bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
