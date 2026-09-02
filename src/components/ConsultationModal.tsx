import React, { useState } from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { X, Send, CheckCircle2, PhoneCall, AlertCircle } from 'lucide-react';

const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (!WEB3FORMS_ACCESS_KEY) {
        throw new Error('Web3Forms access key is not configured. Please add VITE_WEB3FORMS_ACCESS_KEY to your environment variables.');
      }

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Consultation Request: ${formData.service} — Chef Peter Portfolio`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || 'Not provided',
          service: formData.service,
          timeframe: formData.timeframe,
          message: formData.message || 'No additional notes provided.',
          from_name: 'Chef Peter Portfolio'
        })
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Submission failed. Please try again.');
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again or contact us directly via WhatsApp.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
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
                setSubmitError(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  service: initialService || services[0].title,
                  timeframe: 'Immediate Advisory (1-2 weeks)',
                  message: ''
                });
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
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black bg-[#C5A059] hover:bg-[#b08d49] shadow-lg shadow-[#C5A059]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm Consultation Request</span>
                  </>
                )}
              </button>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-red-400 font-mono leading-relaxed">{submitError}</p>
                </div>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
