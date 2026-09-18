import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StorySection } from './components/StorySection';
import { InternationalJourneySection } from './components/InternationalJourneySection';
import { ExpertiseSection } from './components/ExpertiseSection';
import { ExperienceSection } from './components/ExperienceSection';
import { GallerySection } from './components/GallerySection';
import { BooksSection } from './components/BooksSection';
import { EducationCredentialsSection } from './components/EducationCredentialsSection';
import { PhilosophySection } from './components/PhilosophySection';
import { ServicesSection } from './components/ServicesSection';
import { ContactCTASection } from './components/ContactCTASection';
import { Footer } from './components/Footer';
import { ConsultationModal } from './components/ConsultationModal';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { SeoLandingPage } from './components/SeoLandingPage';
import { getSeoPage } from './data/seoPages';

const HOME_TITLE = 'Chef Peter the Teacher | Private Chef Uganda';
const HOME_DESCRIPTION = 'Chef Peter the Teacher is a private chef, culinary consultant and hospitality educator serving Kampala, Entebbe and clients across Uganda.';

function HomePage() {
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [modalServiceTitle, setModalServiceTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.title = HOME_TITLE;
    const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = HOME_DESCRIPTION;
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://www.chefpetertheteacher.com/';
  }, []);

  const handleOpenConsultationModal = (serviceTitle?: string) => {
    setModalServiceTitle(serviceTitle);
    setConsultationModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2] font-sans antialiased selection:bg-[#C5A059] selection:text-black">
      <Navbar onOpenConsultationModal={handleOpenConsultationModal} />
      <HeroSection onOpenConsultationModal={() => handleOpenConsultationModal()} />
      <StorySection />
      <InternationalJourneySection />
      <ExpertiseSection />
      <ExperienceSection />
      <GallerySection />
      <BooksSection onOpenConsultationModal={handleOpenConsultationModal} />
      <EducationCredentialsSection />
      <PhilosophySection />
      <ServicesSection onOpenConsultationModal={handleOpenConsultationModal} />
      <ContactCTASection />
      <Footer />
      <ConsultationModal
        isOpen={consultationModalOpen}
        initialService={modalServiceTitle}
        onClose={() => setConsultationModalOpen(false)}
      />
      <FloatingWhatsAppButton />
    </div>
  );
}

export default function App() {
  const page = getSeoPage(window.location.pathname);
  return page ? <SeoLandingPage page={page} /> : <HomePage />;
}
