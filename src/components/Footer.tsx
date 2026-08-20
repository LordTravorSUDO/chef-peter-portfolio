import React from 'react';
import { Award, ArrowUp, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0C0C0C] text-[#A09E98] border-t border-[#C5A059]/20 pt-16 pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#C5A059]/20">
          
          {/* Brand Info */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C5A059] p-[1px]">
                <div className="w-full h-full bg-[#0C0C0C] rounded-full flex items-center justify-center text-[#C5A059]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <span className="font-serif text-xl font-bold text-[#EAE7E2]">
                Chef Peter <span className="text-[#C5A059]">the Teacher</span>
              </span>
            </div>

            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059]">
              Executive Hospitality Consultant | Culinary Innovator | Master Educator
            </p>

            <p className="text-xs text-[#A09E98] font-light max-w-md leading-relaxed">
              Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa. Dedicated to culinary excellence, strategic hospitality advisory, technical publishing, and master mentorship across Uganda, Africa, and the Gulf.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] mb-4">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#story" className="hover:text-[#C5A059] transition-colors">The Story</a></li>
              <li><a href="#journey" className="hover:text-[#C5A059] transition-colors">International Journey</a></li>
              <li><a href="#expertise" className="hover:text-[#C5A059] transition-colors">Core Expertise</a></li>
              <li><a href="#experience" className="hover:text-[#C5A059] transition-colors">Professional Experience</a></li>
              <li><a href="#gallery" className="hover:text-[#C5A059] transition-colors">Culinary Gallery</a></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] mb-4">
              Publications & Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#books" className="hover:text-[#C5A059] transition-colors">Published Works</a></li>
              <li><a href="#credentials" className="hover:text-[#C5A059] transition-colors">Academic Background</a></li>
              <li><a href="#services" className="hover:text-[#C5A059] transition-colors">Advisory Offerings</a></li>
              <li><a href="#contact" className="hover:text-[#C5A059] transition-colors">Direct Contact</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#A09E98]">
          <p>
            © 2026 Chef Peter the Teacher. All Rights Reserved.
          </p>

          <button
            onClick={scrollToTop}
            className="p-2.5 rounded-full bg-[#1A1A1A] hover:bg-[#C5A059] text-[#A09E98] hover:text-black border border-[#C5A059]/30 transition-all flex items-center gap-2 group"
          >
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Top</span>
            <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

      </div>
    </footer>
  );
};
