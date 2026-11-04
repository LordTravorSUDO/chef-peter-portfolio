/**
 * ResponsiveImage — renders an image with proper responsive attributes.
 *
 * Features:
 *   - srcset at multiple widths (400w, 800w, 1200w, 1600w)
 *   - sizes attribute for responsive loading
 *   - width + height attributes to prevent layout shift (CLS)
 *   - lazy loading for below-the-fold images
 *   - eager loading for featured images (fetchpriority="high")
 *   - Decoding="async" for non-blocking image decode
 *   - Alt text preservation (empty string for decorative images)
 *   - Caption and credit display when available
 *
 * Usage in article page:
 *   <ResponsiveImage media={featuredMedia} priority="high" />
 *
 * Usage for inline body images (post-processed):
 *   The enhanceImageHtml() function adds srcset/sizes to <img> tags in body HTML.
 */

import React from 'react';
import { getMediaSrcset, getResponsiveMediaUrl, getMediaUrl, MEDIA_BUCKET } from '../../lib/services/media';
import type { Media } from '../../types/article';

interface Props {
  storagePath:  string;
  altText?:      string | null;
  caption?:      string | null;
  credit?:       string | null;
  width?:        number | null;
  height?:       number | null;
  /** "high" = load eagerly (featured image), "lazy" = default */
  priority?:     'high' | 'lazy';
  className?:    string;
  /** Sizes attribute for responsive loading — default assumes max-width 768px article body */
  sizes?:        string;
}

export default function ResponsiveImage({
  storagePath,
  altText,
  caption,
  credit,
  width,
  height,
  priority = 'lazy',
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 768px, 1200px',
}: Props) {
  const isSvg = storagePath.endsWith('.svg') || storagePath.endsWith('.svgz');
  const isGif = storagePath.endsWith('.gif');

  // SVG and GIF: no responsive transforms
  const src = isSvg || isGif ? getMediaUrl(storagePath) : getResponsiveMediaUrl(storagePath, { width: 1200, quality: 80 });
  const srcset = isSvg || isGif ? undefined : getMediaSrcset(storagePath);

  const loading = priority === 'high' ? 'eager' : 'lazy';
  const fetchPriority = priority === 'high' ? 'high' : 'auto';

  return (
    <figure className={className}>
      <img
        src={src}
        srcSet={srcset}
        sizes={srcset ? sizes : undefined}
        alt={altText ?? ''}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority as 'high' | 'low' | 'auto'}
        className="w-full h-auto rounded-lg"
      />
      {(caption || credit) && (
        <figcaption className="mt-2 text-xs text-[#8A8A8A] text-center">
          {caption && <span>{caption}</span>}
          {caption && credit && <span> · </span>}
          {credit && <span className="italic">Credit: {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// HTML post-processor — enhances inline <img> tags in article body HTML
// ---------------------------------------------------------------------------

/**
 * Post-process article body HTML to add responsive image attributes.
 * Finds <img src="...storage_path..."> tags and adds:
 *   - srcset with multiple widths
 *   - sizes attribute
 *   - loading="lazy"
 *   - decoding="async"
 *
 * This is called before rendering the article body with dangerouslySetInnerHTML.
 */
export function enhanceImageHtml(html: string): string {
  // Regex to find <img> tags
  // We only enhance images that point to our Supabase storage URLs
  return html.replace(/<img([^>]*)>/gi, (match, attrs: string) => {
    // Check if it already has srcset
    if (/\bsrcset\s*=/i.test(attrs)) return match;

    // Extract the src attribute
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return match;

    const src = srcMatch[1];

    // Only enhance images stored in our media bucket:
    //   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
    const at = src.indexOf(marker);
    if (at === -1) return match;
    const storagePath = decodeURIComponent(src.slice(at + marker.length).split(/[?#]/)[0]);

    const lazy = (a: string) =>
      a + (/\bloading\s*=/i.test(a) ? '' : ' loading="lazy"') + (/\bdecoding\s*=/i.test(a) ? '' : ' decoding="async"');

    // Without image transformations there is nothing to resize: keep the
    // original URL and only add lazy-loading.
    const srcset = getMediaSrcset(storagePath);
    if (!srcset) return `<img${lazy(attrs)}>`;

    const newAttrs = attrs
      .replace(/\bsrc\s*=\s*["'][^"']+["']/i, `src="${getResponsiveMediaUrl(storagePath, { width: 1200, quality: 80 })}"`)
      + ` srcset="${srcset}"`
      + ` sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 1200px"`;
    const finalAttrs = lazy(newAttrs);

    return `<img${finalAttrs}>`;
  });
}
