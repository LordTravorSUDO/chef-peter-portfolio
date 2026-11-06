import React, { useId, useState } from 'react';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { ENQUIRY_OPTIONS } from '../../data/siteContent';
import { EMAIL_PATTERN, submitEnquiry } from '../../lib/enquiry';
import { btn } from './ui';

interface EnquiryFormProps {
  /** Pre-selected enquiry type (e.g. from a service or book button) */
  initialService?: string;
  /** Shown in the email so Chef Peter knows which form was used */
  source: string;
  /** Show the "When do you need this?" field */
  showTimeframe?: boolean;
  /** Called after a successful submission */
  onSuccess?: () => void;
  /** Called when the visitor chooses "Send another enquiry" or "Close" */
  onDone?: () => void;
  doneLabel?: string;
}

const TIMEFRAMES = ['Within 2 weeks', 'Within 1–3 months', 'Later / just exploring'];

const field =
  'mt-1.5 block w-full rounded-md border border-sand-strong bg-card px-3.5 py-3 text-[1rem] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus:ring-2 focus:ring-gold/40';
const labelCls = 'block text-[0.9375rem] font-semibold text-ink';

export function EnquiryForm({
  initialService,
  source,
  showTimeframe = false,
  onSuccess,
  onDone,
  doneLabel = 'Send another enquiry',
}: EnquiryFormProps) {
  const uid = useId();
  const options = initialService && !ENQUIRY_OPTIONS.includes(initialService) ? [initialService, ...ENQUIRY_OPTIONS] : ENQUIRY_OPTIONS;

  const empty = {
    name: '',
    email: '',
    phone: '',
    service: initialService || ENQUIRY_OPTIONS[0],
    timeframe: TIMEFRAMES[0],
    message: '',
    botcheck: '',
  };
  const [data, setData] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [key]: e.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!data.name.trim()) next.name = 'Please enter your name.';
    if (!data.email.trim()) next.email = 'Please enter your email address.';
    else if (!EMAIL_PATTERN.test(data.email.trim())) next.email = 'Please enter a valid email address.';
    if (!data.message.trim()) next.message = 'Please tell Chef Peter a little about your enquiry.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`${uid}-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitEnquiry({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        service: data.service,
        timeframe: showTimeframe ? data.timeframe : undefined,
        message: data.message.trim(),
        botcheck: data.botcheck,
        source,
      });
      setSent(true);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        <h3 className="mt-4 font-serif text-[1.5rem] font-semibold text-ink">Thank you, {data.name.split(' ')[0]}</h3>
        <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink-soft">
          Your enquiry about <strong className="text-ink">{data.service}</strong> has been sent. Chef Peter will reply by email
          or phone.
        </p>
        <button
          type="button"
          className={`${btn.secondary} mt-6`}
          onClick={() => {
            if (onDone) onDone();
            setData(empty);
            setSent(false);
          }}
        >
          {doneLabel}
        </button>
      </div>
    );
  }

  const errorId = (k: string) => (errors[k] ? `${uid}-${k}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from people and assistive technology */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor={`${uid}-botcheck`}>Leave this field empty</label>
        <input id={`${uid}-botcheck`} type="text" tabIndex={-1} autoComplete="off" value={data.botcheck} onChange={set('botcheck')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelCls}>
            Your name <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id={`${uid}-name`}
            type="text"
            autoComplete="name"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errorId('name')}
            value={data.name}
            onChange={set('name')}
            className={field}
          />
          {errors.name && <p id={`${uid}-name-error`} className="mt-1.5 text-[0.875rem] text-danger">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelCls}>
            Email address <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errorId('email')}
            value={data.email}
            onChange={set('email')}
            className={field}
          />
          {errors.email && <p id={`${uid}-email-error`} className="mt-1.5 text-[0.875rem] text-danger">{errors.email}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-phone`} className={labelCls}>
            Phone or WhatsApp <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${uid}-phone`}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={data.phone}
            onChange={set('phone')}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-service`} className={labelCls}>
            Enquiry about
          </label>
          <select id={`${uid}-service`} value={data.service} onChange={set('service')} className={field}>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showTimeframe && (
        <div>
          <label htmlFor={`${uid}-timeframe`} className={labelCls}>
            When do you need this?
          </label>
          <select id={`${uid}-timeframe`} value={data.timeframe} onChange={set('timeframe')} className={field}>
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-message`} className={labelCls}>
          Your message <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <p id={`${uid}-message-hint`} className="mt-0.5 text-[0.875rem] text-muted">
          Helpful details: dates, location, number of people or learners, and any budget.
        </p>
        <textarea
          id={`${uid}-message`}
          rows={5}
          required
          aria-invalid={!!errors.message}
          aria-describedby={[`${uid}-message-hint`, errorId('message')].filter(Boolean).join(' ')}
          value={data.message}
          onChange={set('message')}
          className={`${field} resize-y`}
        />
        {errors.message && <p id={`${uid}-message-error`} className="mt-1.5 text-[0.875rem] text-danger">{errors.message}</p>}
      </div>

      {submitError && (
        <p role="alert" className="flex gap-2 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-[0.9375rem] text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </p>
      )}

      <button type="submit" disabled={submitting} className={`${btn.primary} w-full sm:w-auto`}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
