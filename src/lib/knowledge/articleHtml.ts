/**
 * Reading enhancements for article HTML (pure string functions — safe on the
 * server and in tests). Input must already be sanitised.
 *
 *  - Adds stable id attributes to <h2>/<h3> and returns a table of contents.
 *  - Turns a blockquote that begins with a known label into a styled callout:
 *        Chef's tip: …          → "Chef’s tip"
 *        Chef's note: / Note: … → "Chef’s note"
 *        Safety note: / Food safety: … → "Food safety"
 *        In the Ugandan kitchen: / Local tip: … → "In the Ugandan kitchen"
 *    Authors create these in the editor with the normal Quote button, so no
 *    special editor support is needed.
 */

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export type CalloutKind = 'tip' | 'note' | 'safety' | 'local';

export const CALLOUT_LABEL: Record<CalloutKind, string> = {
  tip: 'Chef’s tip',
  note: 'Chef’s note',
  safety: 'Food safety',
  local: 'In the Ugandan kitchen',
};

const CALLOUT_PATTERNS: Array<[CalloutKind, RegExp]> = [
  ['tip', /^(?:chef[’'`]?s\s+tip|tip)\s*[:—–-]\s*/i],
  ['note', /^(?:chef[’'`]?s\s+note|note)\s*[:—–-]\s*/i],
  ['safety', /^(?:food\s+safety|safety(?:\s+note)?)\s*[:—–-]\s*/i],
  ['local', /^(?:in\s+(?:the|a)\s+ugandan\s+kitchen|local\s+(?:kitchen\s+)?tip)\s*[:—–-]\s*/i],
];

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  );
}

/** Adds ids to h2/h3 (keeping any existing id) and collects the TOC. */
export function addHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const used = new Set<string>();
  const toc: TocEntry[] = [];
  const out = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (match, lvl: string, attrs = '', inner: string) => {
    const text = stripTags(inner);
    if (!text) return match;
    const existing = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    let id = existing ?? headingId(text);
    if (!existing) {
      const base = id;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    const newAttrs = existing ? attrs : `${attrs} id="${id}"`;
    return `<h${lvl}${newAttrs}>${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

/** Converts labelled blockquotes into callout <aside> elements. */
export function addCallouts(html: string): string {
  return html.replace(/<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (match, _attrs, inner: string) => {
    // The label is at the start of the first paragraph (or of the quote itself)
    const firstPara = /^\s*<p(\s[^>]*)?>([\s\S]*?)<\/p>/i.exec(inner);
    const leading = firstPara ? firstPara[2] : inner;
    // Allow the label to be wrapped in <strong>/<em>
    const plainStart = leading.replace(/^\s*(?:<(?:strong|b|em|i)>)+/i, '');
    for (const [kind, re] of CALLOUT_PATTERNS) {
      const labelMatch = re.exec(decodeEntities(plainStart.replace(/<\/(?:strong|b|em|i)>/gi, '')));
      if (!labelMatch) continue;
      const stripped = removeLabel(leading, re);
      const rest = firstPara ? inner.replace(firstPara[0], stripped.trim() ? `<p>${stripped}</p>` : '') : stripped;
      return (
        `<aside class="callout callout-${kind}" role="note" aria-label="${CALLOUT_LABEL[kind]}">` +
        `<p class="callout-label">${CALLOUT_LABEL[kind]}</p>${rest}</aside>`
      );
    }
    return match;
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Removes the leading label (and any <strong>/<em> wrapping it) from a paragraph's HTML. */
function removeLabel(html: string, re: RegExp): string {
  const wrapped = /^\s*<(strong|b|em|i)>([\s\S]*?)<\/\1>/i.exec(html);
  if (wrapped) {
    const inner = decodeEntities(wrapped[2]);
    const after = html.slice(wrapped[0].length);
    const withSep = re.exec(inner);
    // "<strong>Chef's tip:</strong> text" (or "<strong>Chef's tip: more</strong>")
    if (withSep) return (escapeHtml(inner.slice(withSep[0].length)) + after).replace(/^\s+/, '');
    // "<strong>Chef's tip</strong>: text"
    const noSep = re.exec(`${inner.trim()}:`);
    if (noSep && noSep[0].trim().length >= inner.trim().length) return after.replace(/^\s*[:—–-]\s*/, '');
  }
  return decodeApostrophes(html.replace(/^\s+/, '')).replace(re, '');
}

/** Only apostrophe entities are decoded, so a label written as Chef&#39;s matches. */
const decodeApostrophes = (s: string) => s.replace(/&#39;|&apos;|&rsquo;/g, '’');

/**
 * Wraps block images that have a title attribute in <figure> with a visible
 * <figcaption>. (The editor stores the media library caption as the title.)
 * Images inside a paragraph, or already in a figure, are left unchanged.
 */
export function addImageCaptions(html: string): string {
  return html.replace(/(^|<\/(?:p|h[1-6]|ul|ol|blockquote|aside|figure|div|pre|table)>|<br\s*\/?>)(\s*)(<img\b[^>]*>)/gi, (match, before: string, ws: string, img: string) => {
    const title = /\stitle\s*=\s*"([^"]*)"/i.exec(img)?.[1]?.trim();
    if (!title) return match;
    // Attribute values may contain a literal '<' — escape before using as element content.
    const caption = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${before}${ws}<figure class="article-figure">${img}<figcaption>${caption}</figcaption></figure>`;
  });
}

/**
 * The page title is the article's only <h1>; any <h1> written in the body is
 * shown as an <h2> so the heading outline stays correct.
 */
export function demoteBodyH1(html: string): string {
  return html.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, (_m, attrs = '', inner: string) => `<h2${attrs}>${inner}</h2>`);
}

/** Full pipeline used by the article page. */
export function enhanceArticleHtml(html: string): { html: string; toc: TocEntry[]; wordCount: number } {
  const withCallouts = addImageCaptions(addCallouts(demoteBodyH1(html)));
  const { html: withIds, toc } = addHeadingIds(withCallouts);
  const wordCount = stripTags(html).split(/\s+/).filter(Boolean).length;
  return { html: withIds, toc, wordCount };
}

/** Reading time from visible words (≈200 wpm), minimum 1 minute. */
export function readingMinutesFromHtml(html: string): number {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
