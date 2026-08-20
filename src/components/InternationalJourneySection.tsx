import React, { useState } from 'react';
import { CHEF_PROFILE, LocationJourney } from '../data/chefProfile';
import { Globe, MapPin, CheckCircle, ChevronRight, Compass } from 'lucide-react';

export const InternationalJourneySection: React.FC = () => {
  const { locations } = CHEF_PROFILE;
  const [selectedLocation, setSelectedLocation] = useState<LocationJourney>(locations[0]);

  return (
    <section id="journey" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Glow background */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-flex items-center gap-2 mb-3">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Footprint</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            A Culinary Journey Across Borders
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            Click on any country or region below to explore Chef Peter's operational impact across Africa and the Gulf.
          </p>
        </div>

        {/* Location Selector Tabs (Mobile Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
          {locations.map((loc) => {
            const isSelected = selectedLocation.id === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20 scale-105'
                    : 'bg-[#1A1A1A] text-[#EAE7E2]/80 border border-[#C5A059]/20 hover:border-[#C5A059]/50 hover:text-white'
                }`}
              >
                <span>{loc.flag}</span>
                <span>{loc.country}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Location Main Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Interactive Map Visual Panel (Left) */}
          <div className="lg:col-span-5 bg-[#161616] rounded-2xl border border-[#C5A059]/30 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-mono">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedLocation.region}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedLocation.flag}</span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#EAE7E2]">
                  {selectedLocation.country}
                </h3>
              </div>

              <p className="text-sm text-[#A09E98] font-light leading-relaxed pt-2">
                {selectedLocation.summary}
              </p>
            </div>

            {/* Roles Performed */}
            <div className="relative z-10 pt-6 mt-6 border-t border-[#C5A059]/20">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] block mb-2">
                Roles & Positions
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedLocation.roles.map((role, rIdx) => (
                  <span
                    key={rIdx}
                    className="px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#C5A059]/20 text-xs text-[#EAE7E2] font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Location Key Highlights & Operational Details (Right) */}
          <div className="lg:col-span-7 bg-[#161616] rounded-2xl border border-[#C5A059]/30 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#C5A059]/20 mb-6">
                <div className="flex items-center gap-2 text-[#C5A059]">
                  <Compass className="w-5 h-5" />
                  <h4 className="text-base font-serif font-bold text-[#EAE7E2] uppercase tracking-[0.2em]">
                    Operational Impact & Achievements
                  </h4>
                </div>
                <span className="text-xs text-[#A09E98] font-mono">
                  {selectedLocation.country} Division
                </span>
              </div>

              <ul className="space-y-4">
                {selectedLocation.highlights.map((highlight, hIdx) => (
                  <li
                    key={hIdx}
                    className="flex items-start gap-3.5 p-4 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 hover:border-[#C5A059]/50 transition-colors"
                  >
                    <div className="p-1.5 rounded bg-[#C5A059]/10 text-[#C5A059] shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-[#EAE7E2]/90 font-light leading-relaxed">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Country Switcher Bar */}
            <div className="pt-6 mt-6 border-t border-[#C5A059]/20 flex items-center justify-between text-xs text-[#A09E98]">
              <span>Selected Territory: <strong className="text-[#EAE7E2]">{selectedLocation.country}</strong></span>
              <span className="font-mono text-[#C5A059]">Verified Experience</span>
            </div>
          </div>

        </div>

        {/* Global Overview Grid Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedLocation.id === loc.id
                  ? 'bg-[#1A1A1A] border-[#C5A059]'
                  : 'bg-[#161616] border-[#C5A059]/20 hover:border-[#C5A059]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{loc.flag}</span>
                <div>
                  <h4 className="text-sm font-semibold text-[#EAE7E2]">{loc.country}</h4>
                  <span className="text-[11px] text-[#A09E98] font-mono">{loc.region}</span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${selectedLocation.id === loc.id ? 'text-[#C5A059]' : 'text-[#A09E98]'}`} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
