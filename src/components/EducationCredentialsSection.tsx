import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { GraduationCap, Award, CheckCircle2, ShieldCheck } from 'lucide-react';

export const EducationCredentialsSection: React.FC = () => {
  const { education } = CHEF_PROFILE;

  return (
    <section id="credentials" className="py-20 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-flex items-center gap-2 mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Rigor</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            Education & Academic Background
          </h2>
          <p className="text-sm text-[#A09E98] mt-2 font-light">
            Rooted in business leadership, gastronomy theory, and specialized hospitality training.
          </p>
        </div>

        {/* Credentials Card */}
        <div className="max-w-4xl mx-auto bg-[#161616] rounded-2xl border border-[#C5A059]/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#C5A059]/20">
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#C5A059]/30">
                  {education.degree}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#EAE7E2] mt-1">
                  {education.institution}
                </h3>
                <p className="text-xs text-[#A09E98] font-mono mt-0.5">
                  Makerere University Business School (MUBS)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-xs text-[#C5A059] font-mono">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Verified Institutional Qualification</span>
            </div>

          </div>

          {/* Specializations Grid */}
          <div className="mt-8">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] mb-4">
              Core Academic & Practical Specializations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {education.specializations.map((spec, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <span className="text-xs text-[#EAE7E2] font-medium leading-relaxed">
                    {spec}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
