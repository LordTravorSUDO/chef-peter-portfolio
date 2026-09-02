// =========================================================================
// EXECUTIVE CONTACT & ENGAGEMENT SECTION
// Provides a professional contact form, animated contact cards (Email, Phone, WhatsApp, Location),
// direct WhatsApp chat triggers, and clear inline developer comments for personalization.
//
// PERSONALIZATION NOTE:
// You can update the contact details, phone numbers, WhatsApp link, and location
// in `src/data/chefProfile.ts`.
// =========================================================================

import React, { useState } from 'react';
import { CHEF_PROFILE } from '../data/chefProfile';
import { Mail, Phone, MessageSquare, MapPin, Send, CheckCircle2, Copy, AlertCircle, Sparkles, ExternalLink, HelpCircle, BookOpen } from 'lucide-react';

// =========================================================================
// 💡 EMAIL FORM CONFIGURATION FOR CHEF PETER / DE'CHOSEN EVENTS:
// Form submissions are sent via Web3Forms (https://web3forms.com).
// Add your free access key to a .env file in the project root:
//   VITE_WEB3FORMS_ACCESS_KEY="your_key_here"
// On Vercel, add VITE_WEB3FORMS_ACCESS_KEY as an Environment Variable
// in your project settings. No backend server required.
// =========================================================================
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined;

export const ContactCTASection: React.FC = () => {
  const { contactDetails, services } = CHEF_PROFILE;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: services[0].title,
    message: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Helper function to handle copying values to clipboard with visual feedback
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Form field validation
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.message.trim()) errors.message = 'Please enter your message or inquiry';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
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
          subject: `New Inquiry: ${formData.service} — Chef Peter Portfolio`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || 'Not provided',
          service: formData.service,
          message: formData.message,
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


  // Direct WhatsApp link constructed from contactDetails
  const whatsappUrl = `https://wa.me/${contactDetails.whatsappNumber}?text=${encodeURIComponent(
    contactDetails.whatsappDefaultMessage
  )}`;

  return (
    <section id="contact" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Glow background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#C5A059]/5 blur-[160px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#25D366]/5 blur-[180px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Banner Header Box */}
        <div className="mb-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#161616] via-[#1A1A1A] to-[#161616] border border-[#C5A059]/40 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-4 py-1.5 rounded-full border border-[#C5A059]/30 inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              Executive Engagement & Training Enquiries
            </span>
            
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
              Connect with Chef Peter & De'Chosen
            </h2>

            <p className="text-sm sm:text-base text-[#A09E98] font-light leading-relaxed">
              Inquire about hospitality consulting, commercial culinary & baking classes, wedding cake commissions, menu engineering, or event advisory.
            </p>

            {/* Direct Quick Contact Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-bold uppercase tracking-wider transition-all transform hover:-translate-y-0.5 shadow-lg shadow-[#25D366]/20"
              >
                <MessageSquare className="w-4 h-4 fill-black" />
                <span>Chat directly on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
              
              <a
                href={`tel:${contactDetails.phoneRaw}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#EAE7E2] border border-[#C5A059]/40 text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Phone className="w-4 h-4 text-[#C5A059]" />
                <span>Call {contactDetails.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Animated Contact Cards (Left Column) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 sm:p-8 rounded-3xl bg-[#161616] border border-[#C5A059]/30 space-y-6 shadow-2xl relative">
              <div className="border-b border-[#C5A059]/20 pb-4">
                <h3 className="text-xl font-serif font-bold text-[#EAE7E2]">
                  Direct Executive Contact
                </h3>
                <p className="text-xs text-[#A09E98] mt-1">
                  Reach Chef Peter the Teacher directly or via De'Chosen Events Consultants.
                </p>
              </div>

              {/* PERSONALIZATION HELPER NOTE FOR CODE CONSUMERS */}
              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 text-[11px] text-[#A09E98] font-mono leading-relaxed">
                <span className="text-[#C5A059] font-bold block mb-0.5">💡 Personalization Note:</span>
                You can easily replace the phone, email, and location details in <code className="text-[#EAE7E2] bg-black/40 px-1 py-0.5 rounded">src/data/chefProfile.ts</code> under <code className="text-[#C5A059]">contactDetails</code>.
              </div>

              {/* WhatsApp Business Card (Animated Glow) */}
              <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#25D366]/40 hover:border-[#25D366] transition-all duration-300 group hover:shadow-lg hover:shadow-[#25D366]/10 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 border border-[#25D366]/40 text-[#25D366] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#25D366] group-hover:text-black transition-all duration-300 shadow-md">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#25D366] font-bold block">
                        WhatsApp Instant Chat
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-[#EAE7E2] font-semibold">
                        {contactDetails.whatsappDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#25D366] text-black hover:bg-[#20bd5a] transition-colors"
                      title="Open WhatsApp Chat"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCopy(contactDetails.whatsappDisplay, 'WhatsApp')}
                      className="p-2 rounded-lg bg-[#161616] text-[#A09E98] hover:text-[#C5A059] transition-colors"
                      title="Copy WhatsApp Number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Telephone Card */}
              <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/20 hover:border-[#C5A059]/60 transition-all duration-300 group hover:shadow-lg hover:shadow-[#C5A059]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#C5A059] group-hover:text-black transition-all duration-300 shadow-md">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09E98] block">
                        Direct Telephone
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-[#EAE7E2] font-semibold">
                        {contactDetails.phoneDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${contactDetails.phoneRaw}`}
                      className="p-2 rounded-lg bg-[#161616] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors"
                      title="Call Phone"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCopy(contactDetails.phoneDisplay, 'Phone Number')}
                      className="p-2 rounded-lg bg-[#161616] text-[#A09E98] hover:text-[#C5A059] transition-colors"
                      title="Copy Phone Number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/20 hover:border-[#C5A059]/60 transition-all duration-300 group hover:shadow-lg hover:shadow-[#C5A059]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#C5A059] group-hover:text-black transition-all duration-300 shadow-md">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09E98] block">
                        Email Inquiry
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-[#EAE7E2] font-semibold">
                        {contactDetails.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`mailto:${contactDetails.email}`}
                      className="p-2 rounded-lg bg-[#161616] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCopy(contactDetails.email, 'Email')}
                      className="p-2 rounded-lg bg-[#161616] text-[#A09E98] hover:text-[#C5A059] transition-colors"
                      title="Copy Email Address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/20 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center shadow-md">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09E98] block">
                    Headquarters & Consultancy Scope
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-[#EAE7E2] block">
                    {contactDetails.officeAddress}
                  </span>
                  <span className="text-[11px] text-[#C5A059] font-mono block mt-0.5">
                    {contactDetails.availability}
                  </span>
                </div>
              </div>

              {/* Clipboard Notification */}
              {copiedField && (
                <div className="p-3 rounded-xl bg-[#C5A059]/20 border border-[#C5A059] text-xs font-mono text-[#C5A059] text-center animate-in fade-in duration-200">
                  ✓ Copied {copiedField} to clipboard!
                </div>
              )}

            </div>

          </div>

          {/* Interactive Professional Form (Right Column) */}
          <div className="lg:col-span-7 bg-[#161616] rounded-3xl border border-[#C5A059]/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-serif font-bold text-[#EAE7E2]">
                Send an Engagement Inquiry
              </h3>
              <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#C5A059]/30">
                Official Desk
              </span>
            </div>
            
            <p className="text-xs text-[#A09E98] mb-8 font-light">
              Submit your inquiry regarding De'Chosen Events advisory, culinary or baking classes, wedding cake commissions, or masterclass bookings.
            </p>

            {isSubmitted ? (
              <div className="p-8 sm:p-10 rounded-2xl bg-[#1A1A1A] border border-[#C5A059] text-center space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#C5A059] text-black flex items-center justify-center mx-auto shadow-xl shadow-[#C5A059]/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-serif font-bold text-[#EAE7E2]">
                  Inquiry Received
                </h4>
                <p className="text-xs sm:text-sm text-[#A09E98] leading-relaxed max-w-md mx-auto">
                  Thank you, <strong className="text-[#EAE7E2]">{formData.name}</strong>. Your inquiry regarding <strong className="text-[#C5A059]">{formData.service}</strong> has been received by Chef Peter and the team at De'Chosen Events Consultants.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubmitError(null);
                      setFormData({ name: '', email: '', phone: '', service: services[0].title, message: '' });
                    }}
                    className="px-6 py-3 rounded-xl bg-[#C5A059] text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#b08d49] transition-all shadow-lg"
                  >
                    Submit Another Inquiry
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl bg-[#25D366] text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#20bd5a] transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 fill-black" />
                    <span>Follow up on WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Honorable Member / Executive Lead"
                      className={`w-full px-4 py-3.5 rounded-xl bg-[#1A1A1A] border ${
                        formErrors.name ? 'border-red-500' : 'border-[#C5A059]/30 focus:border-[#C5A059]'
                      } text-sm text-[#EAE7E2] placeholder-[#A09E98]/40 focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all`}
                    />
                    {formErrors.name && (
                      <span className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3.5 h-3.5" /> {formErrors.name}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. client@dechosenevents.com"
                      className={`w-full px-4 py-3.5 rounded-xl bg-[#1A1A1A] border ${
                        formErrors.email ? 'border-red-500' : 'border-[#C5A059]/30 focus:border-[#C5A059]'
                      } text-sm text-[#EAE7E2] placeholder-[#A09E98]/40 focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all`}
                    />
                    {formErrors.email && (
                      <span className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3.5 h-3.5" /> {formErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone & Service Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-2">
                      Telephone / WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +256 700 000 000"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] text-sm text-[#EAE7E2] placeholder-[#A09E98]/40 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-2">
                      Engagement Category
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/30 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] text-sm text-[#EAE7E2] focus:outline-none transition-all"
                    >
                      <option value="Culinary & Baking Arts Classes" className="bg-[#161616] text-[#EAE7E2]">
                        Culinary & Baking Arts Classes (De'Chosen)
                      </option>
                      <option value="Wedding Cake & Confectionery Commission" className="bg-[#161616] text-[#EAE7E2]">
                        Wedding Cake & Luxury Confectionery
                      </option>
                      <option value="De'Chosen Events & Hospitality Advisory" className="bg-[#161616] text-[#EAE7E2]">
                        De'Chosen Events & Hospitality Advisory
                      </option>
                      {services.map((serv) => (
                        <option key={serv.id} value={serv.title} className="bg-[#161616] text-[#EAE7E2]">
                          {serv.title}
                        </option>
                      ))}
                      <option value="Published Books Inquiry" className="bg-[#161616] text-[#EAE7E2]">
                        Published Reference Books Inquiry
                      </option>
                    </select>
                  </div>
                </div>

                {/* Message / Details */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-[0.2em] text-[#A09E98] mb-2">
                    Inquiry / Training Request Details *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details about your desired training dates, commercial bakery project, wedding cake specifications, or advisory scope..."
                    className={`w-full px-4 py-3.5 rounded-xl bg-[#1A1A1A] border ${
                      formErrors.message ? 'border-red-500' : 'border-[#C5A059]/30 focus:border-[#C5A059]'
                    } text-sm text-[#EAE7E2] placeholder-[#A09E98]/40 focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all`}
                  ></textarea>
                  {formErrors.message && (
                    <span className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3.5 h-3.5" /> {formErrors.message}
                    </span>
                  )}
                </div>

                {/* Submission Error Message */}
                {submitError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-3 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400 font-mono leading-relaxed">{submitError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black bg-[#C5A059] hover:bg-[#b08d49] shadow-xl shadow-[#C5A059]/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <span>Sending Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry to Chef Peter</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
