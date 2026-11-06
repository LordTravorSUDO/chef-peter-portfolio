/**
 * Admin UI design tokens.
 *
 * Brand colours (from brief):
 *   Navy   #1B365D  — primary action, headings, selected states
 *   Teal   #4A777A  — secondary action, links, accents
 *   Gold   #D99B26  — highlights, warnings, scheduled status
 *   Light  #F4F6F8  — page background, card backgrounds
 *
 * These are used as Tailwind arbitrary values throughout admin components
 * and exported here as constants for programmatic use (e.g. status badges).
 */

export const ADMIN = {
  navy:    '#1B365D',
  teal:    '#4A777A',
  gold:    '#D99B26',
  light:   '#F4F6F8',
  white:   '#FFFFFF',
  text:    '#1A2B40',    // near-black for body text
  muted:   '#5F6E80',    // secondary text
  border:  '#DDE3EA',    // default border
  danger:  '#C0392B',    // destructive actions / errors
  success: '#27AE60',    // published / success states
} as const;

/** Tailwind class strings for article status badges */
export const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  draft:     'bg-slate-100  text-slate-600   border border-slate-200',
  scheduled: 'bg-amber-100  text-amber-800   border border-amber-200',
  archived:  'bg-red-50     text-red-700     border border-red-200',
};

export const STATUS_LABEL: Record<string, string> = {
  published: 'Published',
  draft:     'Draft',
  scheduled: 'Scheduled',
  archived:  'Archived',
};
