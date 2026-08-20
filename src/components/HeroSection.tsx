import React from 'react';
import { ArrowDown, Compass, Utensils, BookOpen, Globe, Sparkles, MessageSquare } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { CHEF_PROFILE } from '../data/chefProfile';
import { HeaderMovingMealsBackground } from './HeaderMovingMealsBackground';

interface HeroSectionProps {
  onOpenConsultationModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenConsultationModal }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 overflow-hidden bg-[#0C0C0C]">
      {/* Continuous Moving Gourmet Meals Background */}
      <HeaderMovingMealsBackground />

      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-[#C5A059]/10 via-[#8C6B2D]/5 to-transparent blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#C5A059]/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#C5A0590a_1px,transparent_1px),linear-gradient(to_bottom,#C5A0590a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-8">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1A] border border-[#C5A059]/40 text-[#C5A059] text-xs font-semibold uppercase tracking-[0.25em] animate-float shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Founder, De'Chosen Events Consultants</span>
            </div>

            {/* Main Display Title */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-[#EAE7E2] tracking-tight leading-[1.08]">
                Chef Peter <br />
                <span className="gold-gradient-text italic font-normal">the Teacher</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg font-medium text-[#C5A059] tracking-[0.15em] uppercase font-mono pt-1">
                Founder, De'Chosen Events Consultants | Master Culinary & Baking Trainer
              </p>
            </div>

            {/* Short Intro */}
            <p className="text-base sm:text-lg text-[#A09E98] max-w-2xl font-light leading-relaxed border-l-2 border-[#C5A059] pl-4 sm:pl-6">
              "Founder of De'Chosen Events Consultants and master trainer offering practical classes in culinary and baking arts, commercial kitchen setups, and international hospitality advisory."
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
              {/* WhatsApp Quick CTA Button */}
              <a
                href={`https://wa.me/${CHEF_PROFILE.contactDetails.whatsappNumber}?text=${encodeURIComponent(
                  CHEF_PROFILE.contactDetails.whatsappDefaultMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-[#25D366] hover:bg-[#20bd5a] shadow-xl shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-95 text-center"
              >
                <MessageSquare className="w-4 h-4 fill-black" />
                <span>WhatsApp Chat</span>
              </a>

              <a
                href="#story"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-[#E6C687] via-[#C5A059] to-[#8C6B2D] hover:brightness-110 shadow-xl shadow-[#C5A059]/25 transition-all hover:scale-[1.02] active:scale-95 text-center"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Journey</span>
              </a>

              <a
                href="#gallery"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-[#EAE7E2] bg-[#1A1A1A] hover:bg-[#222222] border border-[#C5A059]/30 hover:border-[#C5A059] transition-all hover:scale-[1.02] active:scale-95 text-center"
              >
                <Utensils className="w-4 h-4 text-[#C5A059]" />
                <span>Culinary Gallery</span>
              </a>
            </div>

            {/* Key Quick Fact Pills */}
            <div className="pt-6 border-t border-[#C5A059]/20 w-full grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-left">
              <div>
                <span className="block font-serif text-xl sm:text-2xl font-bold text-[#C5A059]">7+</span>
                <span className="text-[11px] sm:text-xs text-[#A09E98] uppercase tracking-[0.2em]">Countries</span>
              </div>
              <div>
                <span className="block font-serif text-xl sm:text-2xl font-bold text-[#C5A059]">3</span>
                <span className="text-[11px] sm:text-xs text-[#A09E98] uppercase tracking-[0.2em]">Published Books</span>
              </div>
              <div>
                <span className="block font-serif text-xl sm:text-2xl font-bold text-[#C5A059]">15+ Yrs</span>
                <span className="text-[11px] sm:text-xs text-[#A09E98] uppercase tracking-[0.2em]">Expertise</span>
              </div>
            </div>

          </div>

          {/* Right Image Frame Column */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md lg:max-w-none">
              
              {/* Outer Decorative Frame */}
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-[#C5A059]/30 via-transparent to-[#C5A059]/10 blur-sm pointer-events-none"></div>

              {/* Image Container — Accepts any image format (.jpg, .png, .webp, .avif, .svg or web URL) */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#C5A059]/40 bg-[#161616] shadow-2xl group">
                <ImageWithFallback
                  src={CHEF_PROFILE.chefImages.heroPortrait}
                  alt="Chef Peter the Teacher — Executive Hospitality Consultant"
                  fallbackText="CHEF PETER PHOTO PLACEHOLDER — Upload your photo (.jpg, .png, .webp, .avif) to /public/images/ or edit src/data/chefProfile.ts"
                  className="w-full h-[460px] sm:h-[540px] lg:h-[580px] object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 flex flex-col justify-end">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-mono font-semibold">
                    Executive Profile
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#EAE7E2]">
                    Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa
                  </h3>
                  <p className="text-xs text-[#A09E98] mt-1">
                    Master Educator & Global Hospitality Consultant
                  </p>
                </div>
              </div>

              {/* Floating Quote Card */}
              <div className="absolute -bottom-6 -left-6 sm:-left-8 bg-[#161616]/95 border border-[#C5A059]/40 rounded-xl p-4 shadow-2xl backdrop-blur-md max-w-[260px] hidden sm:block">
                <p className="text-xs text-[#EAE7E2] italic font-serif leading-relaxed">
                  "Precision, patience, and unyielding discipline define true culinary art."
                </p>
                <span className="block text-[10px] text-[#C5A059] font-mono font-semibold uppercase mt-2 tracking-[0.2em]">
                  — Chef Peter the Teacher
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 flex justify-center">
          <a
            href="#story"
            className="group flex flex-col items-center text-xs uppercase tracking-[0.2em] text-[#A09E98] hover:text-[#C5A059] transition-colors"
          >
            <span className="mb-2 text-[10px] font-mono">Scroll To Explore</span>
            <div className="w-8 h-12 rounded-full border border-[#C5A059]/30 group-hover:border-[#C5A059] flex items-center justify-center p-1 transition-colors">
              <div className="w-1.5 h-3 bg-[#C5A059] rounded-full animate-bounce"></div>
            </div>
          </a>
        </div>

      </div>
    </section>
  );
};
