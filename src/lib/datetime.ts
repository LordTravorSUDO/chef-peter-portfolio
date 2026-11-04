/**
 * Date/time helpers for article scheduling.
 *
 * The database stores scheduled_for as a UTC instant (timestamptz). The admin
 * picks a wall-clock time in Kampala (an <input type="datetime-local">, which
 * has no time zone). These helpers convert between the two explicitly in a
 * named IANA time zone, so the result does NOT depend on the time zone of the
 * browser or computer that is being used.
 *
 *   stored UTC  ──utcIsoToZonedInput──▶  "YYYY-MM-DDTHH:mm" (Kampala wall time)
 *   wall time   ──zonedInputToUtcIso──▶  stored UTC
 *
 * Round trip is exact to the minute, so opening a scheduled article and
 * scheduling it again without changing the field never shifts the instant.
 */

/** Time zone in which administrators enter and read scheduling times. */
export const SCHEDULE_TIME_ZONE = 'Africa/Kampala';

const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock fields of `date` as seen in `timeZone`. */
function wallClockParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (e.g. +3 h for Kampala). */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = wallClockParts(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a stored UTC timestamp (any ISO 8601 string Postgres/Supabase
 * returns, e.g. "2026-11-05T06:00:00+00:00") to the value for a
 * datetime-local input, expressed in `timeZone`. Returns '' for empty or
 * invalid input.
 */
export function utcIsoToZonedInput(iso: string | null | undefined, timeZone: string = SCHEDULE_TIME_ZONE): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = wallClockParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Convert a datetime-local value ("YYYY-MM-DDTHH:mm"), interpreted as wall
 * time in `timeZone`, to a UTC ISO 8601 string. Converts exactly once.
 * Throws on a malformed value.
 */
export function zonedInputToUtcIso(local: string, timeZone: string = SCHEDULE_TIME_ZONE): string {
  const m = INPUT_PATTERN.exec(local.trim());
  if (!m) throw new Error(`Invalid date/time "${local}". Expected YYYY-MM-DDTHH:mm.`);
  const [, y, mo, d, h, mi, s] = m;
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  // First guess using the offset at that moment, then correct once (handles DST zones too).
  let utc = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  const corrected = wallAsUtc - zoneOffsetMs(new Date(utc), timeZone);
  if (corrected !== utc) utc = corrected;
  return new Date(utc).toISOString();
}

/** Human-readable form of a UTC instant in `timeZone` (default Kampala), with zone label. */
export function formatInZone(
  iso: string | Date,
  timeZone: string = SCHEDULE_TIME_ZONE,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone, timeZoneName: 'short' }).format(date);
}
