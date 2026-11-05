/**
 * Turns an editorial-calendar proposal into the content of a CMS draft.
 * Pure — used by the Editorial calendar page and unit tests.
 *
 * Proposals with a full draft (src/data/editorial/drafts.ts) use it; the
 * others become a structured outline whose bracketed notes guide the writer.
 * Either way the CMS refuses to publish while bracketed notes remain.
 */
import type { ArticleProposal, InternalLinkRef } from '../../data/editorial/calendar';
import { EDITORIAL_CALENDAR } from '../../data/editorial/calendar';
import { ARTICLE_DRAFTS } from '../../data/editorial/drafts';
import { LINKS, type LinkKey } from '../../data/internalLinks';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Label and URL for an internal link reference (planned articles use their proposed URL). */
export function resolveLink(ref: InternalLinkRef): { label: string; href: string; planned: boolean } {
  if (ref.startsWith('article:')) {
    const slug = ref.slice('article:'.length);
    const p = EDITORIAL_CALENDAR.find((x) => x.slug === slug);
    return { label: p?.title ?? slug, href: `/articles/${slug}`, planned: true };
  }
  const l = LINKS[ref as LinkKey];
  return { label: l.label, href: l.href, planned: false };
}

export function outlineBody(p: ArticleProposal): string {
  const parts: string[] = [];
  parts.push(`<p>[EDITOR: write a short, direct opening for ${esc(p.audience.toLowerCase())}. Avoid generic introductions — start with a real kitchen situation or the reader’s question. Educational objective: ${esc(p.description)}]</p>`);
  for (const h of p.headings) {
    parts.push(`<h2>${esc(h)}</h2>`);
    parts.push(`<p>[EDITOR: write this section. Explain technical terms, give a practical example and cite a source for any factual claim.]</p>`);
  }
  parts.push('<blockquote><p><strong>Practical kitchen lesson:</strong> [EDITOR: a short exercise the reader can try, or delete this box.]</p></blockquote>');
  parts.push('<blockquote><p><strong>Common kitchen mistakes:</strong> [EDITOR: list the mistakes this topic commonly involves, or delete this box.]</p></blockquote>');
  parts.push('<blockquote><p><strong>Chef Peter’s tip:</strong> [CHEF PETER: write your own tip here, or delete this box.]</p></blockquote>');
  parts.push('<h2>In summary</h2>');
  parts.push('<p>[EDITOR: two or three sentences on what the reader can now do — not a repeat of the introduction.]</p>');
  const links = p.internalLinks.map(resolveLink);
  parts.push(
    `<p>[EDITOR: link naturally in the text to: ${links.map((l) => `${esc(l.label)} (${l.href}${l.planned ? ' — only once published' : ''})`).join('; ')}.]</p>`,
  );
  parts.push('<h2>References</h2>');
  parts.push(
    p.references.length
      ? `<ul>${p.references.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p>[REFERENCE: check each source, cite the ones used and remove the rest.]</p>`
      : '<p>[REFERENCE: add reliable sources for factual claims, or delete this section if the article is purely Chef Peter’s own practical guidance.]</p>',
  );
  parts.push(`<p>[PHOTO: ${esc(p.photographs.join(' / '))}]</p>`);
  return parts.join('\n');
}

export interface DraftContent {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  meta_description: string;
  article_type: ArticleProposal['articleType'];
  isFullDraft: boolean;
}

export function draftContent(p: ArticleProposal): DraftContent {
  const full = ARTICLE_DRAFTS[p.slug];
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.description,
    body: (full ?? outlineBody(p)).trim(),
    meta_description: p.description,
    article_type: p.articleType,
    isFullDraft: !!full,
  };
}
