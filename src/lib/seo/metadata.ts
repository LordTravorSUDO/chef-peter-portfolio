/**
 * SEO metadata helpers.
 *
 * These functions are used both by the Edge Function (server-side injection)
 * and by the browser React components (via React 19 document metadata hoisting).
 *
 * All string output is HTML-escaped to prevent XSS and malformed markup.
 */

import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, AUTHOR_NAME } from './constants';
import type { ArticleWithRelations } from '../../types/article';
import { getResponsiveMediaUrl } from '../services/media';

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

/** Escape a string for safe inclusion in an HTML attribute value. */
export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#x27;');
}

/** Escape a string for safe inclusion inside a JSON-LD <script> block. */
export function escJsonLd(str: string): string {
  // Prevent </script> injection; replace with unicode escape
  return str
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// ---------------------------------------------------------------------------
// Article metadata derivation
// ---------------------------------------------------------------------------

export interface ArticleSeoMeta {
  pageTitle:    string;  // for <title>
  metaDesc:     string;  // for <meta name="description">
  canonicalUrl: string;
  ogImage:      string;
  ogImageAlt:   string;
  robots:       string;
  ldJson:       string;  // stringified, safely escaped JSON-LD
}

/**
 * Derive all SEO metadata for an article.
 * Used by the Edge Function to build the initial HTML response.
 */
export function deriveArticleSeoMeta(article: ArticleWithRelations): ArticleSeoMeta {
  const title    = (article.seo_title ?? article.title ?? '').trim();
  const pageTitle = title
    ? `${title} | ${SITE_NAME}`
    : SITE_NAME;

  const metaDesc = (
    article.meta_description ??
    article.excerpt ??
    ''
  ).trim().slice(0, 160);

  const canonicalUrl = article.canonical_url
    ? article.canonical_url.trim()
    : `${SITE_URL}/articles/${article.slug}`;

  // Social image: use social_image_id media, fall back to featured_image, fall back to default
  let ogImage    = DEFAULT_OG_IMAGE;
  let ogImageAlt = AUTHOR_NAME;

  // Use social_image if available (it has the same shape as featured_image in the query)
  // ArticleWithRelations may have social_image from the Supabase join even though the
  // TypeScript type only declares social_image_id — access it via unknown cast.
  const rawArticle = article as unknown as Record<string, unknown>;
  const imgRecord = (rawArticle['social_image'] as ArticleWithRelations['featured_image'] | null | undefined) ?? article.featured_image;
  if (imgRecord?.storage_path) {
    ogImage    = getResponsiveMediaUrl(imgRecord.storage_path, { width: 1200, quality: 80 });
    ogImageAlt = imgRecord.alt_text ?? article.title ?? '';
  }

  const robots = article.noindex ? 'noindex, follow' : 'index, follow';

  // Build JSON-LD BlogPosting
  const primaryCat = article.article_categories?.find((ac) => ac.is_primary)?.categories
                  ?? article.article_categories?.[0]?.categories ?? null;
  const tags       = article.article_tags?.map((at) => at.tags?.name).filter(Boolean) ?? [];

  const ldObject: Record<string, unknown> = {
    '@context':        'https://schema.org',
    '@type':           'BlogPosting',
    'headline':        article.title,
    'description':     metaDesc || article.excerpt || '',
    'url':             canonicalUrl,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': canonicalUrl },
    'datePublished':   article.published_at ?? undefined,
    'dateModified':    article.updated_at,
    'author': {
      '@type': 'Person',
      'name':  article.author_display_name ?? AUTHOR_NAME,
      'url':   SITE_URL,
    },
    'publisher': {
      '@type': 'Organization',
      'name':   SITE_NAME,
      'logo':   { '@type': 'ImageObject', 'url': DEFAULT_OG_IMAGE },
    },
  };

  if (imgRecord?.storage_path) {
    ldObject['image'] = {
      '@type': 'ImageObject',
      'url':   ogImage,
      ...(imgRecord.width_px  ? { 'width':  imgRecord.width_px  } : {}),
      ...(imgRecord.height_px ? { 'height': imgRecord.height_px } : {}),
      'caption': imgRecord.alt_text ?? '',
    };
  }

  if (primaryCat) ldObject['articleSection'] = primaryCat.name;
  if (tags.length) ldObject['keywords']       = tags.join(', ');

  // Safely escape the JSON-LD string to prevent </script> injection
  const ldJson = escJsonLd(JSON.stringify(ldObject, null, 0));

  return { pageTitle, metaDesc, canonicalUrl, ogImage, ogImageAlt, robots, ldJson };
}

// ---------------------------------------------------------------------------
// Build the <head> injection HTML fragment
// ---------------------------------------------------------------------------

/**
 * Build the HTML string that is injected into index.html's <head> by the
 * Edge Function, replacing the placeholder comment.
 *
 * All values are HTML-escaped before insertion.
 */
export function buildHeadInjection(meta: ArticleSeoMeta): string {
  const {
    pageTitle, metaDesc, canonicalUrl,
    ogImage, ogImageAlt, robots, ldJson,
  } = meta;

  const t  = escHtml(pageTitle);
  const d  = escHtml(metaDesc);
  const cu = escHtml(canonicalUrl);
  const oi = escHtml(ogImage);
  const oia = escHtml(ogImageAlt);
  const art = escHtml(SITE_NAME);

  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${cu}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${art}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${cu}" />`,
    `<meta property="og:image" content="${oi}" />`,
    `<meta property="og:image:alt" content="${oia}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${oi}" />`,
    `<script type="application/ld+json">${ldJson}</script>`,
  ].join('\n    ');
}

// ---------------------------------------------------------------------------
// Blog index metadata
// ---------------------------------------------------------------------------

export function buildBlogIndexMeta(): string {
  const title = `Articles | ${SITE_NAME}`;
  const desc  = 'Culinary articles, recipes, food history and hospitality insights from Chef Peter the Teacher — executive chef and hospitality consultant based in Kampala, Uganda.';
  const url   = `${SITE_URL}/articles`;

  const t  = escHtml(title);
  const d  = escHtml(desc);
  const cu = escHtml(url);
  const oi = escHtml(DEFAULT_OG_IMAGE);
  const sn = escHtml(SITE_NAME);

  const ldJson = escJsonLd(JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'Blog',
    'name':     title,
    'url':      url,
    'author':   { '@type': 'Person', 'name': AUTHOR_NAME, 'url': SITE_URL },
    'publisher': { '@type': 'Organization', 'name': SITE_NAME, 'logo': { '@type': 'ImageObject', 'url': DEFAULT_OG_IMAGE } },
  }));

  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${cu}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${sn}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${cu}" />`,
    `<meta property="og:image" content="${oi}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${oi}" />`,
    `<script type="application/ld+json">${ldJson}</script>`,
  ].join('\n    ');
}
