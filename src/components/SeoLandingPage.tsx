import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, MessageCircle, Phone, UtensilsCrossed } from 'lucide-react';
import { SeoPage } from '../data/seoPages';
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
      '@type': 'Service',
      name: page.title,
      description: page.description,
      url: canonicalUrl,
      provider: {
        '@type': 'Person',
        name: 'Chef Peter the Teacher',
        url: SITE_URL,
        areaServed: { '@type': 'Country', name: 'Uganda' }
      }
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 relative">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#C5A059] mb-5">
              <UtensilsCrossed className="w-4 h-4" /> {page.eyebrow}
            </span>
            <h1 className="text-4xl sm:text-6xl font-serif font-bold max-w-4xl leading-tight">{page.title}</h1>
            <p className="mt-6 text-base sm:text-xl text-[#C8C4BC] max-w-3xl leading-relaxed">{page.introduction}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#C5A059] text-black font-bold px-6 py-3">
                <MessageCircle className="w-5 h-5" /> Enquire on WhatsApp
              </a>
              <a href="tel:+256752345858" className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/50 px-6 py-3 text-[#EAE7E2]">
                <Phone className="w-5 h-5" /> Call Chef Peter
              </a>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {page.highlights.map(item => (
              <div key={item} className="bg-[#161616] border border-[#C5A059]/20 rounded-xl p-5 flex gap-3">
                <CheckCircle className="w-5 h-5 text-[#C5A059] shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 space-y-6">
          {page.sections.map(section => (
            <article key={section.title} className="bg-[#141414] border border-[#C5A059]/20 rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#E6C687]">{section.title}</h2>
              <p className="mt-4 text-[#B8B4AD] leading-7">{section.body}</p>
            </article>
          ))}
          <div className="text-center border border-[#C5A059]/30 rounded-2xl p-8 mt-10">
            <h2 className="font-serif text-3xl font-bold">Discuss your requirements with Chef Peter</h2>
            <p className="text-[#A09E98] mt-3">Share your location, preferred date, number of people and the service you require.</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#C5A059] text-black font-bold px-7 py-3">
              <MessageCircle className="w-5 h-5" /> Start an enquiry
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
