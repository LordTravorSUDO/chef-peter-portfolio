import React from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';

const EXPLORE = [
  { label: 'About Chef Peter', href: '/#story' },
  { label: 'Professional experience', href: '/#experience' },
  { label: 'Services', href: '/#services' },
  { label: 'Culinary gallery', href: '/#gallery' },
  { label: 'Published books', href: '/#books' },
  { label: 'Articles', href: '/articles' },
  { label: 'Contact', href: '/#contact' },
];

const SERVICES = [
  { label: 'Private chef in Uganda', href: '/private-chef-uganda' },
  { label: 'Cooking classes in Kampala', href: '/cooking-classes-kampala' },
  { label: 'Baking & pastry classes', href: '/baking-pastry-classes' },
  { label: 'Culinary consultancy', href: '/culinary-consultant-uganda' },
  { label: 'Hospitality consultancy', href: '/hospitality-consultancy' },
  { label: 'Full professional profile', href: '/about-chef-peter' },
  { label: 'Culinary books', href: '/culinary-books' },
];

export const Footer: React.FC = () => {
  const { contactDetails, companyName } = CHEF_PROFILE;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-cream-soft">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-[1.5rem] font-semibold text-cream">
              Chef Peter <em className="font-normal italic text-gold-light">the Teacher</em>
            </p>
            <p className="mt-3 max-w-sm leading-relaxed">
              Professional chef, culinary educator and hospitality consultant. Founder of {companyName}, Kampala, Uganda.
            </p>
            <ul className="mt-6 space-y-1.5 text-[0.975rem]">
              <li>
                <a href={`tel:${contactDetails.phoneRaw}`} className="text-cream hover:text-gold-light hover:underline">
                  {contactDetails.phoneDisplay}
                </a>{' '}
                <span className="text-cream-soft/80">(phone &amp; WhatsApp)</span>
              </li>
              <li>
                <a href={`mailto:${contactDetails.email}`} className="break-all text-cream hover:text-gold-light hover:underline">
                  {contactDetails.email}
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/yiga-edward-peter-49b09b433/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cream hover:text-gold-light hover:underline"
                >
                  LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>

          <nav aria-label="Explore" className="md:col-span-3">
            <h2 className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-light">Explore</h2>
            <ul className="mt-4 space-y-2 text-[0.975rem]">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-cream hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Services" className="md:col-span-4">
            <h2 className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-gold-light">Services &amp; information</h2>
            <ul className="mt-4 space-y-2 text-[0.975rem]">
              {SERVICES.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-cream hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/15 pt-6 text-[0.875rem] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Chef Peter the Teacher · {companyName}</p>
          <a href="#" className="hover:text-cream hover:underline">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
};
