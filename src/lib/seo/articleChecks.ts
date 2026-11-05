/**
 * Site-wide article SEO checks (pure — used by the CMS SEO page and tests).
 */
import { articleDocumentTitle } from './schema';

export interface SeoCheckArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  seo_title: string | null;
  meta_description: string | null;
  noindex: boolean;
  featured_image_id: string | null;
  social_image_id?: string | null;
  featured_image?: { alt_text: string | null } | null;
}

export type CheckLevel = 'problem' | 'improve' | 'note';

export interface ArticleSeoIssue {
  articleId: string;
  title: string;
  level: CheckLevel;
  message: string;
}

const effectiveTitle = (a: SeoCheckArticle) => (a.seo_title || a.title || '').trim();
const effectiveDescription = (a: SeoCheckArticle) => (a.meta_description || a.excerpt || '').trim();

/** Checks articles that are (or will be) public: published and scheduled. */
export function checkArticles(all: SeoCheckArticle[]): ArticleSeoIssue[] {
  const live = all.filter((a) => a.status === 'published' || a.status === 'scheduled');
  const issues: ArticleSeoIssue[] = [];
  const add = (a: SeoCheckArticle, level: CheckLevel, message: string) => issues.push({ articleId: a.id, title: a.title, level, message });

  const byTitle = new Map<string, SeoCheckArticle[]>();
  const byDesc = new Map<string, SeoCheckArticle[]>();
  for (const a of live.filter((x) => !x.noindex)) {
    const t = effectiveTitle(a).toLowerCase();
    const d = effectiveDescription(a).toLowerCase();
    if (t) byTitle.set(t, [...(byTitle.get(t) ?? []), a]);
    if (d) byDesc.set(d, [...(byDesc.get(d) ?? []), a]);
  }

  for (const a of live) {
    const title = effectiveTitle(a);
    const desc = effectiveDescription(a);
    if (a.noindex) {
      add(a, 'note', 'Hidden from search engines (noindex) — intentional?');
      continue;
    }
    if (!desc) add(a, 'problem', 'No description for search results — add an excerpt or meta description.');
    else if (desc.length < 70) add(a, 'improve', `Description is short (${desc.length} characters); aim for 120–160.`);
    else if (desc.length > 160) add(a, 'improve', `Description is ${desc.length} characters; search results show about 160.`);
    if (articleDocumentTitle(title) === title && title.length > 65) add(a, 'improve', `Title is ${title.length} characters and may be cut off in search results; set a shorter SEO title.`);
    if ((byTitle.get(title.toLowerCase())?.length ?? 0) > 1) add(a, 'problem', 'Same title as another article — make each title unique.');
    if ((byDesc.get(desc.toLowerCase())?.length ?? 0) > 1) add(a, 'problem', 'Same description as another article — write a unique one.');
    if (!a.featured_image_id && !a.social_image_id) add(a, 'improve', 'No featured or social image — shared links will use the default photo.');
    else if (a.featured_image_id && a.featured_image && !a.featured_image.alt_text?.trim()) add(a, 'problem', 'Featured image has no alt text.');
    if (a.slug.length > 70) add(a, 'improve', 'Very long URL slug — shorter, descriptive slugs are easier to share.');
  }
  return issues;
}
