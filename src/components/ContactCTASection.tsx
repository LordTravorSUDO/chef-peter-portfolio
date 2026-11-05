// =========================================================================
// CONTACT SECTION
// Direct contact options (WhatsApp, phone, email, location) and an enquiry
// form sent through Web3Forms (see src/lib/enquiry.ts).
// Contact details are edited in src/data/chefProfile.ts.
// =========================================================================
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Copy, Check } from 'lucide-react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { WhatsAppIcon } from './WhatsAppIcon';
import { EnquiryForm } from './site/EnquiryForm';
import { Container, Section, SectionHeader, btn, card } from './site/ui';

export const ContactCTASection: React.FC = () => {
  const { contactDetails } = CHEF_PROFILE;
  const [copied, setCopied] = useState<string | null>(null);

  const whatsappUrl = `https://wa.me/${contactDetails.whatsappNumber}?text=${encodeURIComponent(
    contactDetails.whatsappDefaultMessage,
  )}`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      /* clipboard unavailable — no action */
    }
  };

  const CopyButton = ({ value, label }: { value: string; label: string }) => (
    <button
      type="button"
      onClick={() => copy(value, label)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted ring-1 ring-sand transition-colors hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      {copied === label ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );

  return (
    <Section id="contact" tone="cream" labelledBy="contact-title">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              id="contact-title"
              eyebrow="Contact"
              title="Talk to Chef Peter"
              intro="For classes, private dining, consultancy, events, wedding cakes or the books. WhatsApp is usually the quickest way to reach him."
            />

            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btn.whatsapp} mt-8 w-full sm:w-auto`}>
              <WhatsAppIcon className="h-5 w-5" />
              Chat on WhatsApp
              <span className="sr-only">(opens in a new tab)</span>
            </a>

            <ul className="mt-10 divide-y divide-sand border-y border-sand">
              <li className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">Phone &amp; WhatsApp</p>
                    <a href={`tel:${contactDetails.phoneRaw}`} className="text-[1.0625rem] font-semibold text-ink hover:underline">
                      {contactDetails.phoneDisplay}
                    </a>
                  </div>
                </div>
                <CopyButton value={contactDetails.phoneDisplay} label="phone number" />
              </li>
              <li className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">Email</p>
                    <a href={`mailto:${contactDetails.email}`} className="block break-all text-[1.0625rem] font-semibold text-ink hover:underline">
                      {contactDetails.email}
                    </a>
                    {contactDetails.secondaryEmail && (
                      <a href={`mailto:${contactDetails.secondaryEmail}`} className="block break-all text-[0.975rem] text-ink-soft hover:underline">
                        {contactDetails.secondaryEmail}
                      </a>
                    )}
                  </div>
                </div>
                <CopyButton value={contactDetails.email} label="email address" />
              </li>
              <li className="flex items-start gap-3 py-4">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                <div>
                  <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">Based in</p>
                  <p className="text-[1.0625rem] font-semibold text-ink">{contactDetails.locationDisplay}</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{contactDetails.availability}</p>
                </div>
              </li>
            </ul>
            <p className="sr-only" aria-live="polite">
              {copied ? `Copied ${copied}` : ''}
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className={`${card} p-6 sm:p-9`}>
              <h3 className="font-serif text-[1.5rem] font-semibold text-ink">Send an enquiry</h3>
              <p className="mt-1.5 text-[0.975rem] text-ink-soft">Fields marked * are required.</p>
              <div className="mt-6">
                <EnquiryForm source="Homepage contact section" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
