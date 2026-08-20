import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { ImageWithFallback } from './ImageWithFallback';
import { Sparkles, CheckCircle2, Award, Users, BookOpen, Globe2 } from 'lucide-react';

export const StorySection: React.FC = () => {
  const { aboutStory, metrics } = CHEF_PROFILE;

  return (
    <section id="story" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Ambient lighting */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-block mb-3">
            Heritage & Mission
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            {aboutStory.title}
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            A journey forged across continents, executive kitchens, and dedicated mentorship.
          </p>
        </div>

        {/* Split Layout: Portrait Left / Story Narrative Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">
          
          {/* Left Column: Portrait & Floating Metric Cards */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#C5A059]/30 bg-[#161616] shadow-2xl">
              <ImageWithFallback
                src={CHEF_PROFILE.chefImages.storyPortrait}
                alt="Chef Peter Kirigwajjo Mulindwa — Founder of De'Chosen Events Consultants"
                fallbackText="CHEF PETER STORY PORTRAIT — Place image in /public/images/ or set URL in src/data/chefProfile.ts"
                className="w-full h-[500px] sm:h-[580px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-transparent to-transparent opacity-80"></div>
              
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#161616]/90 border border-[#C5A059]/30 backdrop-blur-md">
                <p className="text-xs font-serif italic text-[#EAE7E2]">
                  "Cooking is an exact discipline. True culinary art lives where tradition meets scientific precision."
                </p>
                <p className="text-[10px] font-mono uppercase text-[#C5A059] font-semibold mt-2 tracking-[0.2em]">
                  — Chef Peter Zimwanguyizza Mulindwa
                </p>
              </div>
            </div>

            {/* Metric Cards Banner Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/20">
                <div className="flex items-center gap-2 text-[#C5A059] mb-1">
                  <Globe2 className="w-4 h-4" />
                  <span className="text-lg font-serif font-bold text-[#EAE7E2]">7+ Regions</span>
                </div>
                <p className="text-[11px] text-[#A09E98]">UG, CD, KE, SS, UAE, CM, Puntland</p>
              </div>

              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/20">
                <div className="flex items-center gap-2 text-[#C5A059] mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-lg font-serif font-bold text-[#EAE7E2]">3 Books</span>
                </div>
                <p className="text-[11px] text-[#A09E98]">Published Technical Manuals</p>
              </div>
            </div>
          </div>

          {/* Right Column: Story Narrative & Pillars */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Story Paragraphs */}
            <div className="space-y-4 text-sm sm:text-base text-[#EAE7E2]/80 leading-relaxed font-light">
              {aboutStory.paragraphs.map((paragraph, index) => (
                <p key={index} className="bg-[#161616] p-5 rounded-2xl border border-[#C5A059]/10 shadow-sm">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Why "Chef Peter the Teacher" Highlight Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#161616] via-[#1A1A1A] to-[#161616] border border-[#C5A059]/40 shadow-xl relative">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#EAE7E2]">
                    The Legacy Behind "Chef Peter the Teacher"
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A09E98] mt-1 leading-relaxed">
                    More than a title, it reflects a lifelong commitment to mentorship — transforming hotel kitchen brigades, training household private chefs, establishing commercial bakery systems, and authoring technical manuals so that culinary excellence endures.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {aboutStory.pillars.map((pillar, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#161616] border border-[#C5A059]/20">
                  <div className="flex items-center gap-2 text-[#C5A059] mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#EAE7E2]">
                      {pillar.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#A09E98]">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Bottom Verified Metrics Section */}
        <div className="mt-20 pt-12 border-t border-[#C5A059]/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#161616] border border-[#C5A059]/20 hover:border-[#C5A059]/50 transition-all group"
              >
                <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#C5A059] group-hover:scale-105 transition-transform">
                  {metric.value}
                </span>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#EAE7E2] mt-1">
                  {metric.label}
                </h4>
                <p className="text-xs text-[#A09E98] mt-2 font-light">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
