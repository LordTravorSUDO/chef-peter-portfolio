/**
 * SEO constants — single source of truth for all SEO-related values.
 * Used in Edge Functions, API routes, browser components, and tests.
 */

export const SITE_URL   = 'https://www.chefpetertheteacher.com';
export const SITE_NAME  = 'Chef Peter the Teacher';
export const SITE_LOCALE = 'en_UG';

/** Default fallback og:image — used when no featured image is set */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/chef-peter.jpg`;

/** Author identity */
export const AUTHOR_NAME = 'Chef Peter the Teacher';
export const AUTHOR_FULL_NAME = 'Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa';

/** SEO field length limits */
export const SEO_TITLE_MAX       = 70;
export const SEO_TITLE_MIN       = 15;
export const META_DESCRIPTION_MAX = 160;
export const META_DESCRIPTION_MIN = 80;

/** Production domain — used for canonical URL generation */
export const CANONICAL_DOMAIN = 'https://www.chefpetertheteacher.com';

/**
 * URL patterns that must never appear in the public sitemap.
 * Matches against the full path.
 */
export const SITEMAP_EXCLUDE_PATTERNS = [
  /^\/admin/,
  /^\/api/,
  /^\/favicon/,
  /^\/robots/,
];
