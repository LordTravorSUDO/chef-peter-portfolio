import React, { useState } from 'react';
import { CHEF_PROFILE, CompetencyArea } from '../data/chefProfile';
import { Briefcase, Utensils, GraduationCap, BookOpen, Check, ArrowRight, X } from 'lucide-react';

export const ExpertiseSection: React.FC = () => {
  const { competencies } = CHEF_PROFILE;
  const [activeCompetency, setActiveCompetency] = useState<CompetencyArea | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase':
        return <Briefcase className="w-6 h-6 text-[#d4af37]" />;
      case 'Utensils':
        return <Utensils className="w-6 h-6 text-[#d4af37]" />;
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6 text-[#d4af37]" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-[#d4af37]" />;
      default:
        return <Briefcase className="w-6 h-6 text-[#d4af37]" />;
    }
  };

  return (
    <section id="expertise" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Glow background */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-96 bg-[#C5A059]/5 blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-block mb-3">
            Core Competencies
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            Expertise & Culinary Mastery
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            Combining international culinary technique, strategic hospitality consulting, structured mentorship, and technical publishing.
          </p>
        </div>

        {/* 4 Competency Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {competencies.map((comp) => (
            <div
              key={comp.id}
              className="bg-[#161616] rounded-2xl p-6 border border-[#C5A059]/20 hover:border-[#C5A059]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 flex items-center justify-center mb-6 group-hover:border-[#C5A059] group-hover:bg-[#C5A059]/10 transition-colors">
                  {getIcon(comp.iconName)}
                </div>

                <h3 className="text-lg font-serif font-bold text-[#EAE7E2] mb-2 group-hover:text-[#C5A059] transition-colors">
                  {comp.title}
                </h3>

                <p className="text-xs text-[#A09E98] font-light leading-relaxed mb-6">
                  {comp.shortDesc}
                </p>

                <ul className="space-y-2.5 mb-6">
                  {comp.items.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#EAE7E2]/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setActiveCompetency(comp)}
                className="w-full py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#C5A059] text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A059] hover:text-black border border-[#C5A059]/30 hover:border-[#C5A059] transition-all flex items-center justify-center gap-2"
              >
                <span>View Full Scope</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Modal / Popover Detail Drawer */}
        {activeCompetency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#161616] border border-[#C5A059]/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              
              <button
                onClick={() => setActiveCompetency(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#1A1A1A] text-[#A09E98] hover:text-white border border-[#C5A059]/30"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                  {getIcon(activeCompetency.iconName)}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059]">
                    Master Competency
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#EAE7E2]">
                    {activeCompetency.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-[#A09E98] font-light leading-relaxed mb-6 border-b border-[#C5A059]/20 pb-4">
                {activeCompetency.shortDesc}
              </p>

              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] mb-3">
                Key Deliverables & Methodologies
              </h4>

              <ul className="space-y-3 mb-8">
                {activeCompetency.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#1A1A1A] border border-[#C5A059]/20">
                    <Check className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#EAE7E2] font-medium leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setActiveCompetency(null)}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black bg-[#C5A059] hover:brightness-110 transition-all"
              >
                Close Drawer
              </button>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
