import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { ImageWithFallback } from './ImageWithFallback';
import { Quote, Sparkles } from 'lucide-react';

export const PhilosophySection: React.FC = () => {
  const { philosophyQuote, philosophySub } = CHEF_PROFILE;

  return (
    <section className="relative py-28 bg-[#0C0C0C] overflow-hidden border-t border-[#C5A059]/20">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 opacity-20">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80"
          alt="Luxury Commercial Kitchen Atmosphere"
          fallbackText="KITCHEN ATMOSPHERE BANNER"
          className="w-full h-full object-cover filter grayscale contrast-125 scale-105 animate-pulse duration-10000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0C0C] via-[#0C0C0C]/90 to-[#0C0C0C]"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Quote Icon */}
        <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#C5A059] mb-8 shadow-2xl">
          <Quote className="w-8 h-8" />
        </div>

        {/* Philosophy Main Quote */}
        <blockquote className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#EAE7E2] tracking-tight leading-[1.15] max-w-4xl mx-auto">
          "{philosophyQuote}"
        </blockquote>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-[#A09E98] font-light max-w-2xl mx-auto mt-6 leading-relaxed">
          {philosophySub}
        </p>

        {/* Signature Label */}
        <div className="mt-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30">
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span className="font-serif italic text-sm text-[#C5A059]">
            Chef Peter Kirigwajjo Zimwanguyizza Mulindwa
          </span>
        </div>

      </div>
    </section>
  );
};
