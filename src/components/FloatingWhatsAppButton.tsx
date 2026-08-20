// =========================================================================
// FLOATING WHATSAPP BUTTON COMPONENT
// Provides an always-visible quick access WhatsApp chat button with pulsing indicator
// and customized message pre-filled for Chef Peter & De'Chosen Events Consultants.
//
// PERSONALIZATION NOTE:
// You can edit the default message and phone number in `src/data/chefProfile.ts`.
// =========================================================================

import React, { useState } from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { MessageCircle, X, Sparkles, Send } from 'lucide-react';

export const FloatingWhatsAppButton: React.FC = () => {
  const { contactDetails } = CHEF_PROFILE;
  const [isOpen, setIsOpen] = useState(false);

  // Construct direct wa.me link with encoded text
  const whatsappUrl = `https://wa.me/${contactDetails.whatsappNumber}?text=${encodeURIComponent(
    contactDetails.whatsappDefaultMessage
  )}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
      
      {/* Expanded Quick-Chat Card */}
      {isOpen && (
        <div className="w-[320px] sm:w-[350px] p-5 rounded-2xl bg-[#161616] border border-[#25D366]/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 text-[#EAE7E2] relative overflow-hidden">
          {/* Subtle green glow backdrop */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/10 blur-2xl rounded-full pointer-events-none"></div>

          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/20 border border-[#25D366] flex items-center justify-center text-[#25D366]">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-serif font-bold text-[#EAE7E2] leading-tight flex items-center gap-1.5">
                  Chef Peter the Teacher
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                </h4>
                <p className="text-[10px] text-[#25D366] font-mono tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block animate-ping"></span>
                  De'Chosen Events Consultants
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#A09E98] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Message Teaser */}
          <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-white/5 mb-4 space-y-2">
            <p className="text-xs text-[#A09E98] leading-relaxed">
              Inquire about <strong className="text-[#EAE7E2]">Culinary & Baking Classes</strong>, wedding cake bookings, or <strong className="text-[#C5A059]">De'Chosen Events Advisory</strong> directly on WhatsApp.
            </p>
            <div className="text-[11px] font-mono text-[#25D366] bg-[#25D366]/10 p-2 rounded border border-[#25D366]/20 italic">
              "{contactDetails.whatsappDefaultMessage}"
            </div>
          </div>

          {/* Direct Open WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all transform active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp Chat</span>
          </a>
        </div>
      )}

      {/* Main Floating Trigger Icon Button */}
      <div className="relative group">
        {/* Pulsing Outer Ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping opacity-75"></span>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#1EBE55] to-[#25D366] text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/20 group"
          aria-label="Contact on WhatsApp"
          title="Chat with Chef Peter on WhatsApp"
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <MessageCircle className="w-7 h-7 text-white drop-shadow-md group-hover:rotate-12 transition-transform duration-300" />
          )}

          {/* Quick Tooltip Badge on desktop */}
          {!isOpen && (
            <span className="absolute right-16 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161616]/95 border border-[#25D366]/40 text-[#EAE7E2] text-[11px] font-mono whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
              Chat with Chef Peter
            </span>
          )}
        </button>
      </div>

    </div>
  );
};
