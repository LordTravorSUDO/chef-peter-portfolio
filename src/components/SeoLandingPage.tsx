import React, { useEffect } from 'react';
import { ArrowRight, Phone, Plus } from 'lucide-react';
import { SeoPage } from '../data/seoPages';
import { WhatsAppIcon } from './WhatsAppIcon';
import { Footer } from './Footer';
import { SiteHeader } from './site/SiteHeader';
import { Container, Eyebrow, btn, card } from './site/ui';
import { ReviewNote, useReviewMode } from './site/ReviewNote';

const SITE_URL = 'https://www.chefpetertheteacher.com';

function setMeta(selector: string, attribute: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    const match = selector.match(/\[(name|property)="([^"]+)"\]/);
    if (match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}


type EvidenceItem = { title: string; detail: string; status: 'verified' | 'confirmation-needed' };

/**
 * Credential entries. The "verified / confirmation needed" status is shown
 * only in content review mode, until supporting documents are supplied.
 */
const EvidenceBlock: React.FC<{ title: string; items: EvidenceItem[] }> = ({ title, items }) => {
  const review = useReviewMode();
  return (
    <div className="break-inside-avoid pb-10">
      <h3 className="font-serif text-[1.375rem] font-semibold text-ink">{title}</h3>
      <dl className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.title} className="border-l-2 border-gold pl-4">
            <dt className="font-semibold text-ink">
              {item.title}
              {review && (
                <span className="ml-2 rounded border border-dashed border-[#B7791F] bg-[#FFF7E6] px-1.5 py-0.5 align-middle text-[0.75rem] font-semibold text-[#7A4A0B]">
                  {item.status === 'verified' ? 'Marked “verified” — documents still to be supplied' : 'Confirmation needed'}
                </span>
              )}
            </dt>
            <dd className="mt-1 text-[0.975rem] leading-relaxed text-ink-soft">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const ListBlock: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="break-inside-avoid pb-10">
    <h3 className="font-serif text-[1.375rem] font-semibold text-ink">{title}</h3>
    <ul className="mt-4 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[0.975rem] leading-relaxed text-ink-soft">
          <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex gap-3 text-[0.975rem] leading-relaxed text-ink-soft">
    <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
    <span>{children}</span>
  </li>
);

export const SeoLandingPage: React.FC<{ page: SeoPage }> = ({ page }) => {
  useEffect(() => {
    const canonicalUrl = SITE_URL + page.path;
    document.title = page.metaTitle;
    setMeta('meta[name="description"]', 'content', page.description);
    setMeta('meta[property="og:title"]', 'content', page.metaTitle);
    setMeta('meta[property="og:description"]', 'content', page.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'content', page.metaTitle);
    setMeta('meta[name="twitter:description"]', 'content', page.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schemaId = 'service-page-schema';
    document.getElementById(schemaId)?.remove();
    const schema = document.createElement('script');
    schema.id = schemaId;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': page.path === '/about-chef-peter' ? 'Person' : 'Service',
      name: page.path === '/about-chef-peter' ? 'Chef Peter the Teacher' : page.title,
      alternateName: page.path === '/about-chef-peter' ? 'Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa' : undefined,
      jobTitle: page.path === '/about-chef-peter' ? 'Professional Consultant Chef and Culinary Educator' : undefined,
      description: page.description,
      url: canonicalUrl,
      image: page.image ? SITE_URL + page.image : undefined,
      provider: page.path !== '/about-chef-peter' ? {
        '@type': 'Person',
        name: 'Chef Peter the Teacher',
        url: SITE_URL,
        areaServed: { '@type': 'Country', name: 'Uganda' }
      } : undefined
    });
    document.head.appendChild(schema);
    window.scrollTo(0, 0);
    return () => document.getElementById(schemaId)?.remove();
  }, [page]);

  const message = encodeURIComponent('Hello Chef Peter, I am interested in ' + page.title + '.');
  const whatsapp = 'https://wa.me/256752345858?text=' + message;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />

      <main id="main">
        {/* Introduction */}
        <section className="border-b border-sand">
          <Container className={`py-16 sm:py-20 ${page.image ? 'grid items-center gap-12 lg:grid-cols-12' : ''}`}>
            <div className={page.image ? 'lg:col-span-7' : 'max-w-3xl'}>
              <nav aria-label="Breadcrumb" className="text-[0.875rem] text-muted">
                <a href="/" className="hover:text-ink hover:underline">Home</a>
                <span aria-hidden="true"> / </span>
                <span aria-current="page">{page.title}</span>
              </nav>
              <Eyebrow className="mt-6">{page.eyebrow}</Eyebrow>
              <h1 className="mt-3 font-serif text-[2.25rem] font-semibold leading-[1.1] text-ink sm:text-[3rem]">{page.title}</h1>
              <p className="mt-6 max-w-2xl text-[1.125rem] leading-relaxed text-ink-soft">{page.introduction}</p>
              {page.experienceNote && (
                <>
                  <p className="mt-5 border-l-2 border-gold pl-4 text-[1rem] font-semibold text-ink">{page.experienceNote}</p>
                  <ReviewNote>Confirm total years of experience (the homepage previously said 15+; this page says 20+).</ReviewNote>
                </>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btn.whatsapp}>
                  <WhatsAppIcon className="h-5 w-5" /> Enquire on WhatsApp
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <a href="tel:+256752345858" className={btn.secondary}>
                  <Phone className="h-4 w-4" aria-hidden="true" /> Call Chef Peter
                </a>
              </div>
            </div>
            {page.image && (
              <figure className="lg:col-span-5">
                <div className="relative mx-auto max-w-[22rem] lg:max-w-none">
                  <span aria-hidden="true" className="absolute -bottom-3 -right-3 h-full w-full rounded-lg border border-gold/70" />
                  <img
                    src={page.image}
                    alt={page.imageAlt ?? page.title}
                    width={1365}
                    height={768}
                    className="relative aspect-[4/5] w-full rounded-lg object-cover object-[51%_center]"
                  />
                </div>
              </figure>
            )}
          </Container>
        </section>

        {/* Highlights */}
        <section aria-label="Highlights" className="bg-paper">
          <Container className="py-10">
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {page.highlights.map((item) => (
                <li key={item} className="flex gap-3 text-[1rem] font-semibold text-ink">
                  <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Main sections */}
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl space-y-14">
            {page.sections.map((section) => (
              <article key={section.title}>
                <h2 className="font-serif text-[1.75rem] font-semibold leading-snug text-ink sm:text-[2rem]">{section.title}</h2>
                <p className="mt-4 text-[1.0625rem] leading-[1.75] text-ink-soft">{section.body}</p>
                {section.points && (
                  <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {section.points.map((point) => (
                      <Bullet key={point}>{point}</Bullet>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </Container>

        {/* Professional evidence (About page) */}
        {page.professionalEvidence && (
          <section aria-labelledby="credentials-heading" className="border-t border-sand bg-paper">
            <Container className="py-16 sm:py-20">
              <div className="max-w-2xl">
                <Eyebrow>Professional record</Eyebrow>
                <h2 id="credentials-heading" className="mt-3 font-serif text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">
                  Credentials, experience and professional standing
                </h2>
                <span aria-hidden="true" className="mt-5 block h-px w-14 bg-gold" />
                <p className="mt-5 leading-relaxed text-ink-soft">
                  Qualifications, organisations, countries, publications and recognition from Chef Peter’s professional profile.
                </p>
              </div>
              <div className="mt-12 gap-12 lg:columns-2">
                <EvidenceBlock title="Qualifications" items={page.professionalEvidence.qualifications} />
                <EvidenceBlock title="Professional certificates" items={page.professionalEvidence.certifications} />
                <ListBlock title="Organisations and operations" items={page.professionalEvidence.organizations} />
                <ListBlock title="Countries of professional work" items={page.professionalEvidence.countries} />
                <ListBlock title="Published culinary books" items={page.professionalEvidence.books} />
                <ListBlock title="Professional capabilities" items={page.professionalEvidence.capabilities} />
                <EvidenceBlock title="Media appearances" items={page.professionalEvidence.media} />
                <EvidenceBlock title="Awards and recognition" items={page.professionalEvidence.awards} />
              </div>
            </Container>
          </section>
        )}

        {/* Audience and process */}
        <section className="bg-charcoal text-cream">
          <Container className="grid gap-14 py-16 sm:py-20 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-[1.875rem] font-semibold text-cream">{page.audienceTitle}</h2>
              <span aria-hidden="true" className="mt-4 block h-px w-14 bg-gold" />
              <ul className="mt-6 space-y-2">
                {page.audience.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed text-cream-soft">
                    <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-serif text-[1.875rem] font-semibold text-cream">{page.processTitle}</h2>
              <span aria-hidden="true" className="mt-4 block h-px w-14 bg-gold" />
              <ol className="mt-6">
                {page.process.map((step, index) => (
                  <li key={step.title} className="grid grid-cols-[2.75rem_1fr] gap-3 border-t border-cream/15 py-5">
                    <span className="font-serif text-[1.5rem] leading-none text-gold">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="font-sans text-[1.0625rem] font-semibold text-cream">{step.title}</h3>
                      <p className="mt-1 leading-relaxed text-cream-soft">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* FAQs */}
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2 className="font-serif text-[1.875rem] font-semibold text-ink sm:text-[2.25rem]">Frequently asked questions</h2>
            <span aria-hidden="true" className="mt-4 block h-px w-14 bg-gold" />
            <div className="mt-8 divide-y divide-sand border-y border-sand">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-[1.0625rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <Plus aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-gold-deep transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="pb-6 leading-relaxed text-ink-soft">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Enquiry */}
          <div className={`${card} mt-16 p-8 sm:p-10`}>
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="font-serif text-[1.75rem] font-semibold text-ink">Discuss your requirements with Chef Peter</h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
                  Share your location, preferred date, number of people and the service or training you require. Chef Peter will
                  respond with the next steps.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btn.whatsapp}>
                  <WhatsAppIcon className="h-5 w-5" /> Start an enquiry
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <a href="/#contact" className={btn.secondary}>
                  Use the enquiry form <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};
