import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  fallbackSrc?: string;
  className?: string;
  aspectRatio?: string;
  /** Pass "lazy" for below-the-fold images. Defaults to "eager" to preserve LCP for hero images. */
  loading?: 'eager' | 'lazy';
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackText,
  fallbackSrc = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=80",
  className = '',
  aspectRatio,
  loading = 'eager',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayFallbackText = fallbackText || alt || 'Chef / Culinary Image Placeholder';

  const handleError = () => {
    // If original src fails (e.g. /images/chef-peter-hero.jpg is not uploaded yet), try fallbackSrc once
    if (!hasTriedFallback && fallbackSrc && fallbackSrc !== currentSrc) {
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-[#14151e] ${className}`}>
      {!hasError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-[#12131a] animate-pulse p-4 text-center">
              <span className="text-xs text-[#C5A059] uppercase tracking-wider font-mono">Loading image...</span>
            </div>
          )}
          <img
            src={currentSrc}
            alt={alt}
            loading={loading}
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoading(false)}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            {...props}
          />
        </>
      ) : (
        <div className="w-full h-full min-h-[220px] p-6 flex flex-col items-center justify-center text-center bg-[#13141d] border border-[#C5A059]/40 text-[#C5A059] relative group">
          {/* Subtle decorative grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
          
          <div className="relative z-10 flex flex-col items-center max-w-xs">
            <div className="w-12 h-12 mb-3 rounded-2xl border border-[#C5A059]/50 flex items-center justify-center bg-[#1c1e2b] text-[#C5A059] shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059] mb-1 font-mono">
              📸 Image Placeholder
            </span>
            <p className="text-xs font-medium text-[#EAE7E2] mb-2 leading-relaxed">
              {displayFallbackText}
            </p>
            <div className="text-[10px] text-[#A09E98] font-mono bg-[#1A1A1A] p-2 rounded-lg border border-[#C5A059]/20 text-left w-full space-y-1">
              <p className="text-[#C5A059] font-bold">💡 How to add photo:</p>
              <p>1. Upload photo (.jpg, .png, .webp, .avif) into <code className="text-white">/public/images/</code></p>
              <p>2. Or paste direct image link in <code className="text-white">src/data/chefProfile.ts</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
