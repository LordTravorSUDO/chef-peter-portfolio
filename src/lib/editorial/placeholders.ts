/**
 * Editorial placeholders in article drafts.
 *
 * Drafts prepared from the editorial calendar mark anything that still needs a
 * person's input with a bracketed note, for example:
 *   [EDITOR: confirm this temperature against the current guidance]
 *   [CHEF PETER: add your own tip here, or delete this box]
 *
 * An article containing a placeholder cannot be published or scheduled, so
 * an unfinished note — or a tip attributed to Chef Peter that he has not
 * confirmed — never reaches readers.
 */
const PLACEHOLDER = /\[(EDITOR|CHEF PETER|PHOTO|REFERENCE)\s*:[^\]]*\]/g;

export interface EditorialPlaceholder {
  kind: 'EDITOR' | 'CHEF PETER' | 'PHOTO' | 'REFERENCE';
  text: string;
}

const decode = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|&rsquo;/g, '’').replace(/\s+/g, ' ');

export function findEditorialPlaceholders(html: string): EditorialPlaceholder[] {
  return [...decode(html ?? '').matchAll(PLACEHOLDER)].map((m) => ({ kind: m[1] as EditorialPlaceholder['kind'], text: m[0].trim() }));
}

/** Throws a clear message when the draft still has placeholders. */
export function assertNoEditorialPlaceholders(html: string): void {
  const found = findEditorialPlaceholders(html);
  if (found.length === 0) return;
  const kinds = [...new Set(found.map((p) => p.kind))].join(', ');
  throw new Error(
    `This draft still has ${found.length} editorial note${found.length === 1 ? '' : 's'} (${kinds}) in square brackets. ` +
    'Complete or remove them before publishing or scheduling. The first is: ' + found[0].text.slice(0, 120),
  );
}
