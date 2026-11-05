/**
 * Enquiry submission via Web3Forms (free tier) — shared by the contact
 * section and the enquiry dialog.
 *
 * Configure VITE_WEB3FORMS_ACCESS_KEY in .env / Vercel environment variables.
 * `botcheck` is Web3Forms' built-in honeypot: real visitors never fill it.
 */
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined;

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
  timeframe?: string;
  /** Honeypot value — must stay empty */
  botcheck?: string;
  /** Where the enquiry was sent from, e.g. "Contact section" */
  source: string;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitEnquiry(payload: EnquiryPayload): Promise<void> {
  // Silently accept bot submissions without sending them.
  if (payload.botcheck) return;

  if (!WEB3FORMS_ACCESS_KEY) {
    throw new Error(
      'The enquiry form is not available at the moment. Please contact Chef Peter by WhatsApp, phone or email instead.',
    );
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New enquiry: ${payload.service} — chefpetertheteacher.com`,
      from_name: 'Chef Peter the Teacher website',
      name: payload.name,
      email: payload.email,
      phone: payload.phone || 'Not provided',
      service: payload.service,
      timeframe: payload.timeframe || 'Not specified',
      message: payload.message || 'No additional details provided.',
      source: payload.source,
      botcheck: '',
    }),
  });

  let result: { success?: boolean; message?: string } = {};
  try {
    result = await response.json();
  } catch {
    /* non-JSON response */
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Your enquiry could not be sent. Please try again, or use WhatsApp, phone or email.');
  }
}
