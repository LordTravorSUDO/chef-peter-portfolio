import React, { useState, useEffect } from 'react';
import { Menu, X, Award, ChevronRight, Phone } from 'lucide-react';

interface NavbarProps {
  onOpenConsultationModal: (serviceTitle?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenConsultationModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Story', href: '#story' },
    { name: 'Journey', href: '#journey' },
    { name: 'Expertise', href: '#expertise' },
    { name: 'Experience', href: '#experience' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Books', href: '#books' },
    { name: 'Services', href: '#services' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0C0C0C]/90 backdrop-blur-md border-b border-[#C5A059]/20 py-3.5 shadow-2xl'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Brand */}
          <a href="#" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A059] to-[#735722] p-[1px] shadow-lg shadow-[#C5A059]/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#0C0C0C] rounded-full flex items-center justify-center text-[#C5A059]">
                <Award className="w-5 h-5 text-[#C5A059]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-wide text-[#EAE7E2] group-hover:text-[#C5A059] transition-colors">
                Chef Peter <span className="text-[#C5A059]">the Teacher</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#A09E98] font-mono">
                Executive Consultant
              </span>
            </div>
          </a>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-1.5 text-xs xl:text-sm font-medium tracking-wide text-[#EAE7E2]/70 hover:text-[#C5A059] transition-colors rounded-full hover:bg-[#1A1A1A]"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* CTA Button Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => onOpenConsultationModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs xl:text-sm font-semibold tracking-wider uppercase text-black bg-gradient-to-r from-[#E6C687] via-[#C5A059] to-[#8C6B2D] hover:brightness-110 shadow-md shadow-[#C5A059]/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Consultation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => onOpenConsultationModal()}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-black bg-[#C5A059] sm:hidden"
            >
              Consult
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#1A1A1A] text-[#EAE7E2] hover:text-[#C5A059] border border-[#C5A059]/30 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0C0C0C]/98 border-b border-[#C5A059]/20 backdrop-blur-xl px-4 pt-4 pb-6 mt-3 shadow-2xl transition-all">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-[#EAE7E2]/90 hover:text-[#C5A059] hover:bg-[#1A1A1A] rounded-lg transition-colors flex items-center justify-between"
              >
                <span>{link.name}</span>
                <ChevronRight className="w-4 h-4 text-[#8a8d9b]" />
              </a>
            ))}
            <div className="pt-4 mt-2 border-t border-[#C5A059]/20">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConsultationModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-[#E6C687] via-[#C5A059] to-[#8C6B2D] shadow-lg shadow-[#C5A059]/20"
              >
                <Phone className="w-4 h-4" />
                <span>Book Executive Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
