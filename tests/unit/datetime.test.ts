/**
 * Regression tests for scheduling time-zone conversion (src/lib/datetime.ts).
 *
 * Run (no extra dependencies — node:test via the existing tsx dev dependency):
 *   npx tsx --test tests/unit/datetime.test.ts
 * They must pass whatever the machine's time zone is, e.g.:
 *   TZ=UTC npx tsx --test tests/unit/datetime.test.ts
 *   TZ=Africa/Kampala npx tsx --test tests/unit/datetime.test.ts
 *   TZ=America/New_York npx tsx --test tests/unit/datetime.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utcIsoToZonedInput, zonedInputToUtcIso, formatInZone, SCHEDULE_TIME_ZONE } from '../../src/lib/datetime';

test('schedule time zone is Kampala', () => {
  assert.equal(SCHEDULE_TIME_ZONE, 'Africa/Kampala');
});

test('stored UTC shows as Kampala wall time (+3 h), not the raw UTC digits', () => {
  // The old code did iso.slice(0, 16) and showed "2026-11-05T06:00" — three hours early.
  assert.equal(utcIsoToZonedInput('2026-11-05T06:00:00+00:00'), '2026-11-05T09:00');
  assert.equal(utcIsoToZonedInput('2026-11-05T06:00:00.000Z'), '2026-11-05T09:00');
});

test('Kampala wall time converts to UTC exactly once (−3 h)', () => {
  assert.equal(zonedInputToUtcIso('2026-11-05T09:00'), '2026-11-05T06:00:00.000Z');
});

test('regression: re-scheduling without changes keeps the same instant (old bug shifted −3 h)', () => {
  const stored = '2026-11-05T06:00:00+00:00';
  const resaved = zonedInputToUtcIso(utcIsoToZonedInput(stored));
  assert.equal(new Date(resaved).getTime(), new Date(stored).getTime());
  // Repeating the open → save cycle many times never drifts
  let iso = stored;
  for (let i = 0; i < 10; i++) iso = zonedInputToUtcIso(utcIsoToZonedInput(iso));
  assert.equal(new Date(iso).getTime(), new Date(stored).getTime());
});

test('round trip from the input side is exact', () => {
  for (const local of ['2026-01-01T00:00', '2026-06-30T23:59', '2026-11-05T09:30', '2027-02-28T12:15']) {
    assert.equal(utcIsoToZonedInput(zonedInputToUtcIso(local)), local);
  }
});

test('date boundary: early-morning Kampala time is the previous UTC day', () => {
  assert.equal(zonedInputToUtcIso('2026-11-05T01:00'), '2026-11-04T22:00:00.000Z');
  assert.equal(utcIsoToZonedInput('2026-11-04T22:00:00Z'), '2026-11-05T01:00');
});

test('cron alignment: 00:00 UTC is 03:00 Kampala', () => {
  assert.equal(utcIsoToZonedInput('2026-11-05T00:00:00Z'), '2026-11-05T03:00');
});

test('preview text shows the Kampala time and zone', () => {
  const text = formatInZone('2026-11-05T06:00:00Z');
  assert.match(text, /09:00/);
  assert.match(text, /GMT\+3|EAT/);
});

test('empty, null and invalid values are handled', () => {
  assert.equal(utcIsoToZonedInput(null), '');
  assert.equal(utcIsoToZonedInput(''), '');
  assert.equal(utcIsoToZonedInput('not a date'), '');
  assert.throws(() => zonedInputToUtcIso('05/11/2026 09:00'), /Invalid date\/time/);
});

test('works for a zone with daylight saving time (general correctness)', () => {
  // London: GMT in January, BST (UTC+1) in July
  assert.equal(zonedInputToUtcIso('2026-01-15T09:00', 'Europe/London'), '2026-01-15T09:00:00.000Z');
  assert.equal(zonedInputToUtcIso('2026-07-15T09:00', 'Europe/London'), '2026-07-15T08:00:00.000Z');
  assert.equal(utcIsoToZonedInput('2026-07-15T08:00:00Z', 'Europe/London'), '2026-07-15T09:00');
});
