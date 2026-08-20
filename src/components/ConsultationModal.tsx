import React, { useState } from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { X, Send, CheckCircle2, PhoneCall } from 'lucide-react';

interface ConsultationModalProps {
  isOpen: boolean;
  initialService?: string;
  onClose: () => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  initialService,
  onClose
}) => {
  if (!isOpen) return null;

  const { services } = CHEF_PROFILE;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: initialService || services[0].title,
    timeframe: 'Immediate Advisory (1-2 weeks)',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#C5A059]/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl overflow-hidden">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#1A1A1A] text-[#A09E98] hover:text-white border border-[#C5A059]/30"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#C5A059] text-black flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-[#EAE7E2]">
              Consultation Requested
            </h3>
            <p className="text-xs text-[#A09E98] leading-relaxed max-w-md mx-auto">
              Your consultation request for <strong className="text-[#C5A059]">{formData.service}</strong> has been confirmed.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#C5A059] text-black text-xs font-bold uppercase tracking-[0.2em]"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059]">
                  Executive Appointment
                </span>
                <h3 className="text-xl font-serif font-bold text-[#EAE7E2]">
                  Request Hospitality Consultation
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#A09E98] mb-6 font-light">
              Schedule a strategic consultation session with Chef Peter for hospitality advisory, commercial bakery development, or private culinary training.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] text-xs text-[#EAE7E2] placeholder-[#A09E98]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. sarah@hotelgroup.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] text-xs text-[#EAE7E2] placeholder-[#A09E98]/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-1">
                    Select Scope
                  </label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] text-xs text-[#EAE7E2] focus:outline-none"
                  >
                    {services.map((serv) => (
                      <option key={serv.id} value={serv.title} className="bg-[#161616]">
                        {serv.title}
                      </option>
                    ))}
                    <option value="Published Books Inquiry" className="bg-[#161616]">
                      Published Books Inquiry
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-1">
                    Project Timeframe
                  </label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] text-xs text-[#EAE7E2] focus:outline-none"
                  >
                    <option value="Immediate (1-2 weeks)" className="bg-[#161616]">Immediate (1-2 weeks)</option>
                    <option value="Upcoming Quarter" className="bg-[#161616]">Upcoming Quarter</option>
                    <option value="Long-term Strategy" className="bg-[#161616]">Long-term Strategy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-1">
                  Key Notes / Venue Location
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide brief details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] text-xs text-[#EAE7E2] placeholder-[#A09E98]/50 focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black bg-[#C5A059] hover:bg-[#b08d49] shadow-lg shadow-[#C5A059]/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Confirm Consultation Request</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
