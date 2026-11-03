import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Existing portfolio sections — eagerly loaded (unchanged)
// ---------------------------------------------------------------------------
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
import { SEO_PAGES, type SeoPage } from './data/seoPages';

// ---------------------------------------------------------------------------
// Public CMS pages — lazy-loaded so they don't affect portfolio bundle size
// ---------------------------------------------------------------------------
const BlogIndexPage      = lazy(() => import('./pages/blog/BlogIndexPage'));
const ArticlePage        = lazy(() => import('./pages/blog/ArticlePage'));
const CategoryPage       = lazy(() => import('./pages/blog/CategoryPage'));
const TagPage            = lazy(() => import('./pages/blog/TagPage'));

// ---------------------------------------------------------------------------
// Admin pages — lazy-loaded, code-split into a separate chunk
// ---------------------------------------------------------------------------
const AdminLoginPage     = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminArticlesPage  = lazy(() => import('./pages/admin/AdminArticlesPage'));
const AdminNewArticle    = lazy(() => import('./pages/admin/AdminNewArticle'));
const AdminEditArticle   = lazy(() => import('./pages/admin/AdminEditArticle'));
const AdminPreviewPage   = lazy(() => import('./pages/admin/ArticlePreviewPage'));
const AdminMediaPage     = lazy(() => import('./pages/admin/AdminMediaPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminTagsPage      = lazy(() => import('./pages/admin/AdminTagsPage'));
const AdminSeoPage       = lazy(() => import('./pages/admin/AdminSeoPage'));
const AdminSettingsPage  = lazy(() => import('./pages/admin/AdminSettingsPage'));

// ---------------------------------------------------------------------------
// Shared route-guard
// ---------------------------------------------------------------------------
const ProtectedRoute     = lazy(() => import('./components/admin/ProtectedRoute'));

// ---------------------------------------------------------------------------
// Portfolio homepage — existing implementation with SEO metadata
// ---------------------------------------------------------------------------
const HOME_TITLE = 'Chef Peter the Teacher | Private Chef Uganda';
const HOME_DESCRIPTION = 'Chef Peter the Teacher is a private chef, culinary consultant and hospitality educator serving Kampala, Entebbe and clients across Uganda.';

function PortfolioPage() {
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

// ---------------------------------------------------------------------------
// Minimal fallback shown while lazy chunks load
// ---------------------------------------------------------------------------
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#C5A059]/30 border-t-[#C5A059] animate-spin" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root — route tree
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ----------------------------------------------------------------
            PUBLIC — Portfolio homepage
        ----------------------------------------------------------------- */}
        <Route path="/" element={<PortfolioPage />} />

        {/* ----------------------------------------------------------------
            PUBLIC — SEO landing pages (preserved from existing website)
            Each route renders the SeoLandingPage component for its path.
        ----------------------------------------------------------------- */}
        {SEO_PAGES.map((page: SeoPage) => (
          <React.Fragment key={page.path}>
            <Route path={page.path} element={<SeoLandingPage page={page} />} />
          </React.Fragment>
        ))}

        {/* ----------------------------------------------------------------
            PUBLIC — Articles / blog
        ----------------------------------------------------------------- */}
        <Route path="/articles"          element={<BlogIndexPage />} />
        <Route path="/articles/:slug"    element={<ArticlePage />} />
        <Route path="/category/:slug"    element={<CategoryPage />} />
        <Route path="/tag/:slug"         element={<TagPage />} />

        {/* ----------------------------------------------------------------
            ADMIN — unauthenticated entry point
        ----------------------------------------------------------------- */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ----------------------------------------------------------------
            ADMIN — protected routes (ProtectedRoute redirects to /admin/login
            if no active Supabase session is found)
        ----------------------------------------------------------------- */}
        <Route path="/admin" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute />
          </Suspense>
        }>
          <Route index                          element={<AdminDashboard />} />
          <Route path="articles"                element={<AdminArticlesPage />} />
          <Route path="articles/new"            element={<AdminNewArticle />} />
          <Route path="articles/:id/edit"       element={<AdminEditArticle />} />
          <Route path="articles/:id/preview"     element={<AdminPreviewPage />} />
          <Route path="media"                   element={<AdminMediaPage />} />
          <Route path="categories"              element={<AdminCategoriesPage />} />
          <Route path="tags"                    element={<AdminTagsPage />} />
          <Route path="seo"                     element={<AdminSeoPage />} />
          <Route path="settings"                element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
