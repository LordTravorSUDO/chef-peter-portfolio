/**
 * Content review mode
 * ===================
 * Some biography and portfolio details still need Chef Peter's confirmation
 * (see docs/CONTENT_REVIEW.md). Those gaps are marked in the code with
 * <ReviewNote>. The notes are HIDDEN from normal visitors and only appear when
 * the site is opened with `?review=content`, for example:
 *
 *   https://<preview-url>/?review=content
 *
 * Review mode is remembered for the browser tab (sessionStorage) so Chef Peter
 * can move between pages. Open any page with `?review=off` to leave it.
 */
import React, { useEffect, useState } from 'react';

const KEY = 'cp-content-review';

function readReviewMode(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('review');
    if (param === 'content') sessionStorage.setItem(KEY, '1');
    if (param === 'off') sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns true only in the browser, after hydration, when review mode is on. */
export function useReviewMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readReviewMode());
  }, []);
  return on;
}

/**
 * A clearly identified placeholder for information Chef Peter must supply or
 * approve. Renders nothing for normal visitors.
 */
export function ReviewNote({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  const on = useReviewMode();
  if (!on) return null;
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      className={`${inline ? 'ml-1 inline' : 'my-3 block'} rounded border border-dashed border-[#B7791F] bg-[#FFF7E6] px-3 py-2 font-sans text-[0.875rem] not-italic leading-snug text-[#7A4A0B]`}
      data-review-note=""
    >
      <strong className="font-semibold">For Chef Peter to confirm: </strong>
      {children}
    </Tag>
  );
}

/** Banner shown at the top of the page in review mode. */
export function ReviewBanner() {
  const on = useReviewMode();
  if (!on) return null;
  return (
    <div className="relative z-[70] border-b border-[#B7791F] bg-[#FFF7E6] px-4 py-2 text-center text-[0.875rem] text-[#7A4A0B]">
      Content review mode — dashed notes mark information awaiting Chef Peter’s confirmation. They are hidden from visitors.{' '}
      <a href="?review=off" className="font-semibold underline">Exit review mode</a>
    </div>
  );
}
