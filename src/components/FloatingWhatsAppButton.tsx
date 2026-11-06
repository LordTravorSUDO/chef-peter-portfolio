import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { WhatsAppIcon } from './WhatsAppIcon';

/**
 * A single, quiet WhatsApp shortcut in the corner of the screen.
 * Opens WhatsApp directly with Chef Peter's default greeting.
 */
export const FloatingWhatsAppButton: React.FC = () => {
  const { contactDetails } = CHEF_PROFILE;
  const whatsappUrl = `https://wa.me/${contactDetails.whatsappNumber}?text=${encodeURIComponent(
    contactDetails.whatsappDefaultMessage,
  )}`;

  return (
    // A top-level landmark, so screen-reader users can find it (it sits outside <main>)
    <aside aria-label="Quick contact">
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-whatsapp px-4 text-ink shadow-[0_10px_30px_-10px_rgba(28,26,23,0.5)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden text-[0.9375rem] font-semibold md:inline">WhatsApp Chef Peter</span>
      <span className="sr-only md:hidden">Chat with Chef Peter on WhatsApp</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
    </aside>
  );
};
