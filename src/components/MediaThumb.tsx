/**
 * MediaThumb — small preview of a stored image.
 *
 * Loads the ~640 px thumbnail saved at upload time instead of the full
 * image. Images uploaded before thumbnails existed have none; for those the
 * original is loaded automatically (once) when the thumbnail is missing.
 */
import React, { useState } from 'react';
import { getMediaThumbUrl, getMediaUrl } from '../lib/services/media';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { storagePath: string };

export default function MediaThumb({ storagePath, loading = 'lazy', decoding = 'async', ...rest }: Props) {
  const thumb = getMediaThumbUrl(storagePath);
  const original = getMediaUrl(storagePath);
  const [src, setSrc] = useState(thumb);
  const [forPath, setForPath] = useState(storagePath);
  if (forPath !== storagePath) { setForPath(storagePath); setSrc(thumb); }

  return (
    <img
      {...rest}
      src={src}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        if (src !== original) setSrc(original);
        rest.onError?.(e);
      }}
    />
  );
}
