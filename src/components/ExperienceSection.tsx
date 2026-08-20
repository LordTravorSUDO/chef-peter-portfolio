import React, { useState } from 'react';
import { CHEF_PROFILE, ExperienceItem } from '../data/chefProfile';
import { Briefcase, Building, CheckCircle2, ChevronRight, Award } from 'lucide-react';

export const ExperienceSection: React.FC = () => {
  const { experiences } = CHEF_PROFILE;
  const [filter, setFilter] = useState<string>('all');

  const filteredExperiences = filter === 'all'
    ? experiences
    : experiences.filter(exp => exp.category === filter);

  return (
    <section id="experience" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Glow background */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-block mb-3">
            Track Record
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            Professional Experience
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            Proven leadership across luxury eco-lodges, international aviation catering, UN bases, marine ports, and luxury hotel groups.
          </p>
        </div>

        {/* Timeline Filter Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'consulting', label: 'Eco Lodges & Advisory' },
            { id: 'international', label: 'International Training' },
            { id: 'aviation', label: 'UN & Aviation Catering' },
            { id: 'luxury', label: 'Luxury Hotel Groups & Ports' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                filter === item.id
                  ? 'bg-[#C5A059] text-black shadow-md shadow-[#C5A059]/20'
                  : 'bg-[#1A1A1A] text-[#EAE7E2]/80 border border-[#C5A059]/20 hover:border-[#C5A059]/50 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Timeline List */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 sm:before:left-1/2 before:-ml-px before:w-0.5 before:bg-[#C5A059]/20">
          {filteredExperiences.map((exp, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div
                key={exp.id}
                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group`}
              >
                {/* Timeline Dot Indicator */}
                <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#C5A059] bg-[#0C0C0C] shadow-lg text-[#C5A059] shrink-0 absolute left-0 sm:left-1/2 -translate-x-1/2 z-10 group-hover:bg-[#C5A059] group-hover:text-black transition-colors">
                  <Briefcase className="w-4 h-4" />
                </div>

                {/* Content Box */}
                <div className="w-[calc(100%-3rem)] sm:w-[calc(50%-2.5rem)] ml-12 sm:ml-0 bg-[#161616] border border-[#C5A059]/20 group-hover:border-[#C5A059]/50 rounded-2xl p-6 sm:p-8 shadow-xl transition-all">
                  
                  {/* Category Pill */}
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-mono uppercase tracking-[0.2em] mb-3">
                    <Building className="w-3 h-3" />
                    <span>{exp.organization}</span>
                  </div>

                  {/* Title & Organization */}
                  <h3 className="text-xl font-serif font-bold text-[#EAE7E2] group-hover:text-[#C5A059] transition-colors">
                    {exp.role}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#A09E98] mt-2 font-light leading-relaxed">
                    {exp.description}
                  </p>

                  {/* Locations if present */}
                  {exp.locations && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {exp.locations.map((loc, lIdx) => (
                        <span key={lIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A1A] text-[#C5A059] border border-[#C5A059]/20">
                          📍 {loc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Key Achievements */}
                  {exp.achievements && (
                    <div className="mt-4 pt-4 border-t border-[#C5A059]/20 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] block">
                        Impact & Deliverables
                      </span>
                      {exp.achievements.map((ach, aIdx) => (
                        <div key={aIdx} className="flex items-start gap-2 text-xs text-[#EAE7E2]/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                          <span>{ach}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
