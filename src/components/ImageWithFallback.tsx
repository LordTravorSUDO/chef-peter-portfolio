import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  /** Short label shown (with an icon) if the image cannot be loaded. */
  fallbackText?: string;
  /** Optional second image to try if `src` fails. No stock image is used by default. */
  fallbackSrc?: string;
  /** Classes for the outer frame (size, aspect ratio, rounding). */
  className?: string;
  /** Classes for the <img> itself (e.g. object-position). */
  imgClassName?: string;
  /** "lazy" for below-the-fold images; "eager" (default) for above-the-fold. */
  loading?: 'eager' | 'lazy';
  /** Set true for the main hero image (LCP). */
  priority?: boolean;
}

/**
 * Image with a calm, visitor-friendly fallback.
 *
 * The image is visible as soon as the browser paints it (no fade-in delay,
 * which would slow down the Largest Contentful Paint). If the file is missing,
 * a neutral tile is shown instead — never developer instructions and never a
 * stock photograph standing in for Chef Peter.
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackText,
  fallbackSrc,
  className = '',
  imgClassName = '',
  loading = 'eager',
  priority = false,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [triedFallback, setTriedFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (!triedFallback && fallbackSrc && fallbackSrc !== currentSrc) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-paper ${className}`}>
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full min-h-[10rem] w-full flex-col items-center justify-center gap-2 p-4 text-center text-muted"
        >
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          <span className="text-sm">{fallbackText ? 'Image coming soon' : 'Image unavailable'}</span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding={priority ? 'sync' : 'async'}
          // fetchpriority is a valid HTML attribute; React 19 passes it through.
          {...(priority ? { fetchPriority: 'high' as const } : {})}
          onError={handleError}
          className={`h-full w-full object-cover ${imgClassName}`}
          {...props}
        />
      )}
    </div>
  );
};
