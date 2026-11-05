import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { Dialog } from './site/Dialog';
import { EnquiryForm } from './site/EnquiryForm';

interface ConsultationModalProps {
  isOpen: boolean;
  initialService?: string;
  onClose: () => void;
}

/** Enquiry dialog opened from the header, service cards and book entries. */
export const ConsultationModal: React.FC<ConsultationModalProps> = ({ isOpen, initialService, onClose }) => {
  const { contactDetails } = CHEF_PROFILE;
  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="enquiry-dialog-title" size="max-w-2xl" closeLabel="Close enquiry form">
      <div className="p-6 sm:p-9">
        <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">Enquiry</p>
        <h2 id="enquiry-dialog-title" className="mt-2 pr-10 font-serif text-[1.75rem] font-semibold leading-tight text-ink">
          How can Chef Peter help?
        </h2>
        <p className="mt-2 text-[0.975rem] leading-relaxed text-ink-soft">
          Send a short message, or call / WhatsApp{' '}
          <a href={`tel:${contactDetails.phoneRaw}`} className="font-semibold text-ink underline decoration-gold underline-offset-4">
            {contactDetails.phoneDisplay}
          </a>
          .
        </p>
        <div className="mt-7">
          {/* key resets the form when a different service opens the dialog */}
          <EnquiryForm
            key={initialService ?? 'general'}
            initialService={initialService}
            source="Enquiry dialog"
            showTimeframe
            onDone={onClose}
            doneLabel="Close"
          />
        </div>
      </div>
    </Dialog>
  );
};
