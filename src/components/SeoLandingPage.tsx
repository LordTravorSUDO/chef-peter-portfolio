import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, Phone, UtensilsCrossed, Users, ClipboardCheck, HelpCircle, Award } from 'lucide-react';
import { SeoPage } from '../data/seoPages';
import { WhatsAppIcon } from './WhatsAppIcon';
import { Footer } from './Footer';

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
    <div className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2]">
      <header className="border-b border-[#C5A059]/20 bg-[#0C0C0C]/95 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a href="/" className="font-serif text-lg sm:text-xl font-bold">
            Chef Peter <span className="text-[#C5A059]">the Teacher</span>
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#C5A059] hover:text-[#E6C687]">
            <ArrowLeft className="w-4 h-4" /> Back to portfolio
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#C5A059]/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.18),transparent_45%)]" />
          <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative ${page.image ? 'grid lg:grid-cols-[1.15fr_0.85fr] items-center gap-12' : ''}`}>
            <div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#C5A059] mb-5">
                <UtensilsCrossed className="w-4 h-4" /> {page.eyebrow}
              </span>
              <h1 className="text-4xl sm:text-6xl font-serif font-bold max-w-4xl leading-tight">{page.title}</h1>
              <p className="mt-6 text-base sm:text-xl text-[#C8C4BC] max-w-3xl leading-relaxed">{page.introduction}</p>
              {page.experienceNote && (
                <div className="mt-6 inline-flex items-center gap-3 text-[#E6C687] bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl px-4 py-3">
                  <Award className="w-6 h-6 shrink-0" />
                  <span className="text-sm font-semibold">{page.experienceNote}</span>
                </div>
              )}
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#C5A059] text-black font-bold px-6 py-3 hover:bg-[#E6C687] transition-colors">
                  <WhatsAppIcon className="w-5 h-5" title="WhatsApp" /> Enquire on WhatsApp
                </a>
                <a href="tel:+256752345858" className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/50 px-6 py-3 text-[#EAE7E2] hover:border-[#C5A059] transition-colors">
                  <Phone className="w-5 h-5" /> Call Chef Peter
                </a>
              </div>
            </div>
            {page.image && (
              <div className="relative max-w-md mx-auto lg:mx-0">
                <div className="absolute -inset-3 border border-[#C5A059]/30 rounded-[2rem] rotate-3" />
                <img src={page.image} alt={page.imageAlt ?? page.title} className="relative w-full aspect-[4/5] object-cover object-top rounded-[2rem] border border-[#C5A059]/40 shadow-2xl" />
                <div className="absolute bottom-5 left-5 right-5 bg-black/80 backdrop-blur-md border border-[#C5A059]/30 rounded-xl p-4">
                  <p className="text-[#C5A059] text-xs uppercase tracking-[0.2em]">Professional Consultant Chef</p>
                  <p className="mt-1 font-serif text-xl font-bold">Over 20 years in culinary and hospitality</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {page.highlights.map(item => (
              <div key={item} className="bg-[#161616] border border-[#C5A059]/20 rounded-xl p-5 flex gap-3">
                <CheckCircle className="w-5 h-5 text-[#C5A059] shrink-0" />
                <span className="text-sm leading-6">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
          {page.sections.map(section => (
            <article key={section.title} className="bg-[#141414] border border-[#C5A059]/20 rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#E6C687]">{section.title}</h2>
              <p className="mt-4 text-[#B8B4AD] leading-7">{section.body}</p>
              {section.points && (
                <ul className="mt-5 grid sm:grid-cols-2 gap-3">
                  {section.points.map(point => (
                    <li key={point} className="flex items-start gap-3 text-sm text-[#D0CCC4] bg-black/20 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-[#C5A059] shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>

        <section className="border-y border-[#C5A059]/20 bg-[#121212]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 text-[#C5A059]">
                <Users className="w-6 h-6" />
                <h2 className="font-serif text-3xl font-bold">{page.audienceTitle}</h2>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {page.audience.map(item => (
                  <div key={item} className="border border-[#C5A059]/20 rounded-xl p-4 text-sm text-[#D0CCC4]">{item}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 text-[#C5A059]">
                <ClipboardCheck className="w-6 h-6" />
                <h2 className="font-serif text-3xl font-bold">{page.processTitle}</h2>
              </div>
              <ol className="mt-6 space-y-4">
                {page.process.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="w-9 h-9 rounded-full bg-[#C5A059] text-black font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                    <div>
                      <h3 className="font-semibold text-[#EAE7E2]">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#AFAAA2]">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center gap-3 text-[#C5A059] mb-8">
            <HelpCircle className="w-6 h-6" />
            <h2 className="font-serif text-3xl font-bold">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {page.faqs.map(faq => (
              <details key={faq.question} className="group bg-[#141414] border border-[#C5A059]/20 rounded-xl p-5">
                <summary className="font-semibold cursor-pointer list-none flex justify-between gap-4">
                  {faq.question}
                  <span className="text-[#C5A059] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="mt-4 text-[#B8B4AD] leading-7 border-t border-[#C5A059]/10 pt-4">{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="text-center border border-[#C5A059]/30 rounded-2xl p-8 sm:p-10 mt-14 bg-[radial-gradient(circle_at_top,rgba(197,160,89,0.12),transparent_65%)]">
            <h2 className="font-serif text-3xl font-bold">Discuss your requirements with Chef Peter</h2>
            <p className="text-[#A09E98] mt-3 max-w-2xl mx-auto">Share your location, preferred date, number of people and the service or training you require. Chef Peter will respond with the next steps.</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#C5A059] text-black font-bold px-7 py-3 hover:bg-[#E6C687] transition-colors">
              <WhatsAppIcon className="w-5 h-5" title="WhatsApp" /> Start an enquiry
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
