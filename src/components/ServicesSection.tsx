import React from 'react';
import { CHEF_PROFILE, ServiceItem } from '../data/chefProfile';
import { Briefcase, UtensilsCrossed, GraduationCap, ShieldCheck, UserCheck, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';

interface ServicesSectionProps {
  onOpenConsultationModal: (serviceTitle?: string) => void;
}

const servicePagePaths: Record<string, string> = {
  "Culinary & Baking Arts Classes (De'Chosen Academy)": '/cooking-classes-kampala',
  "De'Chosen Hospitality & Events Advisory": '/hospitality-consultancy',
  'Menu Engineering & Culinary Innovation': '/culinary-consultant-uganda',
  'Kitchen Operations & High-Volume Logistics': '/hospitality-consultancy',
  'Private Household Culinary Advisory': '/private-chef-uganda',
  'Hospitality Strategy & Brand Transformation': '/hospitality-consultancy',
};\n\nexport const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenConsultationModal }) => {
  const { services } = CHEF_PROFILE;

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase':
        return <Briefcase className="w-6 h-6 text-[#d4af37]" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-6 h-6 text-[#d4af37]" />;
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6 text-[#d4af37]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-[#d4af37]" />;
      case 'UserCheck':
        return <UserCheck className="w-6 h-6 text-[#d4af37]" />;
      case 'TrendingUp':
        return <TrendingUp className="w-6 h-6 text-[#d4af37]" />;
      default:
        return <Briefcase className="w-6 h-6 text-[#d4af37]" />;
    }
  };

  return (
    <section id="services" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Glow effect */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-block mb-3">
            Professional Services — Uganda &amp; Beyond
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            Professional Advisory Services
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            Private chef services, culinary consultancy, hospitality advisory, catering, menu development, kitchen operations, and culinary training — available in Kampala, Uganda and internationally.
          </p>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-[#C5A059]/20 hover:border-[#C5A059] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 flex items-center justify-center mb-6 group-hover:bg-[#C5A059]/10 group-hover:border-[#C5A059] transition-colors">
                  {getServiceIcon(service.iconName)}
                </div>

                <h3 className="text-xl font-serif font-bold text-[#EAE7E2] mb-3 group-hover:text-[#C5A059] transition-colors">
                  {service.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#A09E98] font-light leading-relaxed mb-6">
                  {service.fullDesc}
                </p>

                <div className="space-y-2 mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] block">
                    Strategic Deliverables
                  </span>
                  {service.outcomes.map((out, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2 text-xs text-[#EAE7E2]/80">
                      <CheckCircle className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onOpenConsultationModal(service.title)}
                className="w-full py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#C5A059] text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A059] hover:text-black border border-[#C5A059]/30 hover:border-[#C5A059] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>Inquire For This Service</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
