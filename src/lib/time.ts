/**
 * CMS time helpers — Africa/Kampala <-> UTC.
 *
 * The database stores every timestamp as TIMESTAMPTZ (UTC). The CMS shows and
 * accepts times in Africa/Kampala, whatever timezone the editor's computer uses.
 *
 * Africa/Kampala is UTC+03:00 all year (no daylight saving), so conversion is a
 * fixed offset. Display still goes through Intl with the named zone.
 */

export const CMS_TIME_ZONE = 'Africa/Kampala';
const KAMPALA_OFFSET = '+03:00';
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Convert a UTC ISO timestamp from the database into the value a
 * <input type="datetime-local"> expects ("YYYY-MM-DDTHH:mm"), in Kampala time.
 */
export function utcToKampalaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Date(d.getTime() + KAMPALA_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local value ("YYYY-MM-DDTHH:mm"), read as Kampala time,
 * into a UTC ISO string for the database. Returns null if the value is invalid.
 */
export function kampalaInputToUtc(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${KAMPALA_OFFSET}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Format a UTC timestamp for display in Kampala time, e.g. "05 Nov 2026, 09:00 EAT". */
export function formatKampala(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const text = d.toLocaleString('en-GB', { ...opts, timeZone: CMS_TIME_ZONE });
  return opts.timeStyle || opts.hour ? `${text} EAT` : text;
}
