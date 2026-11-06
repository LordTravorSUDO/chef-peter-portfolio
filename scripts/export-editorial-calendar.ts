/**
 * Writes docs/editorial-calendar.md from src/data/editorial/calendar.ts,
 * so the readable calendar always matches the CMS.
 *
 *   npx tsx scripts/export-editorial-calendar.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { EDITORIAL_CALENDAR, CATEGORY_NAMES, DRAFTED_SLUGS, suggestedDate, BREAK_WEEKS } from '../src/data/editorial/calendar';
import { resolveLink } from '../src/lib/editorial/draftFromProposal';
import { ARTICLE_TYPE_MAP } from '../src/lib/knowledge/articleTypes';

const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const items = [...EDITORIAL_CALENDAR].sort((a, b) => a.slot - b.slot);
const out: string[] = [];

out.push('# Editorial calendar — first 28 articles');
out.push('');
out.push('_Generated from `src/data/editorial/calendar.ts` by `scripts/export-editorial-calendar.ts`. Edit the data file, not this document._');
out.push('');
out.push('Two articles a week (Tuesday and Friday), four per category, with every two-week block covering four different categories. ' +
  `No articles are planned for the weeks beginning ${BREAK_WEEKS.map(fmt).join(' and ')}. Dates are suggestions: an article is scheduled only after it has been reviewed and approved in the CMS (Admin → Editorial calendar).`);
out.push('');
out.push('Articles marked **Full draft** have a complete first draft ready to create in the CMS; the others are created as an outline with writing notes.');
out.push('');
out.push('## Schedule at a glance');
out.push('');
out.push('| # | Suggested date | Title | Category | Draft |');
out.push('|---|---|---|---|---|');
for (const p of items) out.push(`| ${p.slot} | ${fmt(suggestedDate(p.slot))} | ${p.title} | ${CATEGORY_NAMES[p.category]} | ${DRAFTED_SLUGS.includes(p.slug) ? 'Full draft' : 'Outline'} |`);
out.push('');
out.push('## Article briefs');
for (const p of items) {
  out.push('');
  out.push(`### ${p.slot}. ${p.title}`);
  out.push('');
  out.push(`- **Suggested date:** ${fmt(suggestedDate(p.slot))}`);
  out.push(`- **Category:** ${CATEGORY_NAMES[p.category]}`);
  out.push(`- **Format:** ${ARTICLE_TYPE_MAP[p.articleType]?.label ?? p.articleType}`);
  out.push(`- **Proposed URL:** \`/articles/${p.slug}\``);
  out.push(`- **Target audience:** ${p.audience}`);
  out.push(`- **Search intent:** ${p.searchIntent}`);
  out.push(`- **Main keyword:** ${p.mainKeyword}`);
  out.push(`- **Supporting keywords:** ${p.supportingKeywords.join(', ')}`);
  out.push(`- **Description:** ${p.description}`);
  out.push('- **Proposed headings:**');
  p.headings.forEach((h, i) => out.push(`  ${i + 1}. ${h}`));
  out.push('- **Suggested photographs:**');
  p.photographs.forEach((h) => out.push(`  - ${h}`));
  out.push('- **Internal links:**');
  p.internalLinks.forEach((r) => { const l = resolveLink(r); out.push(`  - ${l.label} — \`${l.href}\`${l.planned ? ' (once published)' : ''}`); });
  out.push('- **References to consult:**');
  if (p.references.length) p.references.forEach((r) => out.push(`  - ${r}`));
  else out.push('  - None listed: the article is based on Chef Peter’s own practical guidance; cite a source for any factual claim.');
  if (p.reviewNotes.length) {
    out.push('- **Before publishing:**');
    p.reviewNotes.forEach((n) => out.push(`  - ${n}`));
  }
}
out.push('');
fs.writeFileSync(path.join(process.cwd(), 'docs', 'editorial-calendar.md'), out.join('\n'));
console.log(`docs/editorial-calendar.md written (${items.length} articles)`);
