/**
 * Search helpers for the article library.
 */

/**
 * Makes a visitor's search text safe to place inside a PostgREST `or=(…)`
 * filter with ilike. Characters with special meaning in that syntax
 * (`,` `(` `)` `*` `%` `\` `"` `:`) are replaced with spaces, whitespace is
 * collapsed and the length is limited.
 */
export function sanitiseSearchTerm(input: string): string {
  return input
    .replace(/[,()*%\\":]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Wraps a sanitised term for ilike: %term% */
export const ilikePattern = (term: string) => `%${term}%`;

/** Words that carry no meaning in a culinary search. */
const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'how', 'what', 'is', 'are']);

/**
 * Splits a visitor's search into up to five meaningful words (sanitised).
 * Falls back to the whole term if every word is a stop word.
 */
export function searchWords(input: string): string[] {
  const clean = sanitiseSearchTerm(input).toLowerCase();
  if (!clean) return [];
  const words = [...new Set(clean.split(' ').filter((w) => w.length >= 2 && !STOP_WORDS.has(w)))];
  return (words.length ? words : [clean]).slice(0, 5);
}
