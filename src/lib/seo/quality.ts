/**
 * SEO content quality checks.
 *
 * These are editorial suggestions — not a guarantee of search ranking.
 * They flag common issues that are within the author's control.
 *
 * None of these checks require a Supabase call; they work on local form data.
 */

import {
  SEO_TITLE_MAX, SEO_TITLE_MIN,
  META_DESCRIPTION_MAX, META_DESCRIPTION_MIN,
} from './constants';
import { findEditorialPlaceholders } from '../editorial/placeholders';

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface SeoCheck {
  id:       string;
  severity: CheckSeverity;
  message:  string;
  field?:   string;
}

export interface SeoCheckInput {
  title:            string;
  slug:             string;
  excerpt:          string;
  body:             string;
  seoTitle?:        string | null;
  metaDescription?: string | null;
  hasFeaturedImage: boolean;
  featuredImageAlt?: string | null;
  noindex:          boolean;
  /** Word count (computed from body, passed in to avoid double-computation) */
  wordCount?:       number;
}

/**
 * Run all SEO quality checks against the current article form data.
 * Returns an array of check results — an empty array means no issues found.
 */
export function runSeoChecks(input: SeoCheckInput): SeoCheck[] {
  const checks: SeoCheck[] = [];

  const {
    title, slug, excerpt, body,
    seoTitle, metaDescription,
    hasFeaturedImage, featuredImageAlt,
    noindex, wordCount,
  } = input;

  // ── Title ────────────────────────────────────────────────────────────────

  if (!title.trim()) {
    checks.push({ id: 'title-missing', severity: 'error', message: 'Article title is required.', field: 'title' });
  }

  const effectiveTitle = (seoTitle?.trim() || title.trim());
  if (effectiveTitle) {
    if (effectiveTitle.length > SEO_TITLE_MAX) {
      checks.push({
        id: 'seo-title-too-long', severity: 'warning',
        message: `SEO title is ${effectiveTitle.length} characters (max ${SEO_TITLE_MAX}). Search engines may truncate it.`,
        field: 'seoTitle',
      });
    } else if (effectiveTitle.length < SEO_TITLE_MIN) {
      checks.push({
        id: 'seo-title-too-short', severity: 'info',
        message: `SEO title is only ${effectiveTitle.length} characters. A more descriptive title may perform better.`,
        field: 'seoTitle',
      });
    }
  }

  // ── Slug ─────────────────────────────────────────────────────────────────

  if (!slug.trim()) {
    checks.push({ id: 'slug-missing', severity: 'error', message: 'URL slug is required.', field: 'slug' });
  } else if (slug.length > 80) {
    checks.push({
      id: 'slug-too-long', severity: 'warning',
      message: `Slug is ${slug.length} characters. Shorter slugs (under 60 characters) are preferred.`,
      field: 'slug',
    });
  } else if (slug !== slug.toLowerCase()) {
    checks.push({
      id: 'slug-uppercase', severity: 'error',
      message: 'Slug must be lowercase.',
      field: 'slug',
    });
  }

  // ── Meta description ─────────────────────────────────────────────────────

  const effectiveDesc = (metaDescription?.trim() || excerpt.trim());
  if (!effectiveDesc) {
    checks.push({
      id: 'meta-desc-missing', severity: 'warning',
      message: 'No meta description or excerpt set. Search engines will generate a snippet automatically, which may not represent the article well.',
      field: 'metaDescription',
    });
  } else {
    if (effectiveDesc.length > META_DESCRIPTION_MAX) {
      checks.push({
        id: 'meta-desc-too-long', severity: 'warning',
        message: `Meta description is ${effectiveDesc.length} characters (max ${META_DESCRIPTION_MAX}). It will be truncated in search results.`,
        field: 'metaDescription',
      });
    } else if (effectiveDesc.length < META_DESCRIPTION_MIN) {
      checks.push({
        id: 'meta-desc-too-short', severity: 'info',
        message: `Meta description is only ${effectiveDesc.length} characters. Descriptions between ${META_DESCRIPTION_MIN}–${META_DESCRIPTION_MAX} characters tend to display fully in search results.`,
        field: 'metaDescription',
      });
    }
  }

  // ── Featured image ───────────────────────────────────────────────────────

  if (!hasFeaturedImage) {
    checks.push({
      id: 'featured-image-missing', severity: 'warning',
      message: 'No featured image set. Articles with images tend to get better click-through rates from search and social sharing.',
      field: 'featuredImage',
    });
  } else if (!featuredImageAlt?.trim()) {
    checks.push({
      id: 'featured-image-alt-missing', severity: 'warning',
      message: 'Featured image has no alt text. Alt text is important for accessibility and image search indexing.',
      field: 'featuredImage',
    });
  }

  // ── Body content ─────────────────────────────────────────────────────────

  const plainText = body.replace(/<[^>]+>/g, '').trim();

  if (!plainText) {
    checks.push({
      id: 'body-empty', severity: 'error',
      message: 'Article body is empty. An empty article cannot be published.',
      field: 'body',
    });
  } else if (plainText.length < 200) {
    checks.push({
      id: 'body-too-short', severity: 'info',
      message: `Article body is only about ${plainText.length} characters. Longer, substantive content generally performs better in search.`,
      field: 'body',
    });
  }

  // ── Unfinished editorial notes ───────────────────────────────────────────
  const placeholders = findEditorialPlaceholders(body);
  if (placeholders.length) {
    checks.push({
      id: 'editorial-placeholders', severity: 'error',
      message: `${placeholders.length} editorial note${placeholders.length === 1 ? '' : 's'} in square brackets still need attention (for example ${placeholders[0].text.slice(0, 80)}). The article cannot be published or scheduled until they are completed or removed.`,
      field: 'body',
    });
  }

  // ── H1 heading in body ───────────────────────────────────────────────────
  if (plainText && /<h1[\s>]/i.test(body)) {
    checks.push({
      id: 'h1-in-body', severity: 'warning',
      message: 'The article body contains an H1 heading. The article title is already the H1 — having a second H1 may confuse search engines. Use H2–H4 for section headings.',
      field: 'body',
    });
  }

  if (plainText && !/<h2[\s>]/i.test(body) && plainText.length > 500) {
    checks.push({
      id: 'no-headings', severity: 'info',
      message: 'No H2 headings found in the article body. Adding section headings helps readers and search engines understand the structure.',
      field: 'body',
    });
  }

  // ── Noindex ──────────────────────────────────────────────────────────────
  if (noindex) {
    checks.push({
      id: 'noindex-set', severity: 'info',
      message: 'This article is marked noindex. It will not appear in search engine results and will be excluded from the sitemap.',
    });
  }

  // ── Word count info ──────────────────────────────────────────────────────
  const wc = wordCount ?? body.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
  if (wc > 0 && wc < 300) {
    checks.push({
      id: 'word-count-low', severity: 'info',
      message: `Article has approximately ${wc} words. Most well-ranking articles exceed 600 words. Aim for depth over brevity.`,
      field: 'body',
    });
  }

  // ── Broken internal links (simple check) ─────────────────────────────────
  const internalLinkMatches: string[] = body.match(/href=["'](\/[^"']*?)["']/gi) ?? [];
  const brokenAdminLinks = internalLinkMatches.filter((l) => l.includes('/admin'));
  if (brokenAdminLinks.length > 0) {
    checks.push({
      id: 'admin-link-in-body', severity: 'warning',
      message: 'The article body contains links to /admin pages. These links will not work for public readers.',
      field: 'body',
    });
  }

  return checks;
}

/**
 * Count checks by severity — used by the status indicator in the editor.
 */
export function summariseChecks(checks: SeoCheck[]) {
  return {
    errors:   checks.filter((c) => c.severity === 'error').length,
    warnings: checks.filter((c) => c.severity === 'warning').length,
    infos:    checks.filter((c) => c.severity === 'info').length,
    total:    checks.length,
  };
}
