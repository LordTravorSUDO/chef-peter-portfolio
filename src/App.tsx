import React, { useState } from 'react';
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

export default function App() {
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [modalServiceTitle, setModalServiceTitle] = useState<string | undefined>(undefined);

  const handleOpenConsultationModal = (serviceTitle?: string) => {
    setModalServiceTitle(serviceTitle);
    setConsultationModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#EAE7E2] font-sans antialiased selection:bg-[#C5A059] selection:text-black">
      {/* Sticky Glass Navbar */}
      <Navbar onOpenConsultationModal={handleOpenConsultationModal} />

      {/* Hero Section */}
      <HeroSection onOpenConsultationModal={() => handleOpenConsultationModal()} />

      {/* The Chef Peter Story */}
      <StorySection />

      {/* International Journey */}
      <InternationalJourneySection />

      {/* Expertise & Culinary Mastery */}
      <ExpertiseSection />

      {/* Professional Experience */}
      <ExperienceSection />

      {/* Culinary Gallery */}
      <GallerySection />

      {/* Published Works */}
      <BooksSection onOpenConsultationModal={handleOpenConsultationModal} />

      {/* Education & Credentials */}
      <EducationCredentialsSection />

      {/* Chef Philosophy */}
      <PhilosophySection />

      {/* Professional Advisory Services */}
      <ServicesSection onOpenConsultationModal={handleOpenConsultationModal} />

      {/* Contact & Executive Inquiry */}
      <ContactCTASection />

      {/* Footer */}
      <Footer />

      {/* Quick Consultation Booking Modal */}
      <ConsultationModal
        isOpen={consultationModalOpen}
        initialService={modalServiceTitle}
        onClose={() => setConsultationModalOpen(false)}
      />

      {/* Floating WhatsApp Quick Chat Button */}
      <FloatingWhatsAppButton />
    </div>
  );
}


