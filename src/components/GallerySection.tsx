import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GALLERY_CATEGORIES, GALLERY_ITEMS, GalleryCategory, GalleryItem } from '../data/galleryData';
import { ImageWithFallback } from './ImageWithFallback';
import { Container, Section, SectionHeader, btn, stripEmoji } from './site/ui';
import { Dialog } from './site/Dialog';
import { ReviewNote } from './site/ReviewNote';

const PAGE_SIZE = 12;

/** Images hosted on a stock-photo service rather than in the project. */
const isIllustrative = (item: GalleryItem) => /^https?:\/\//.test(item.imagePath);

const altText = (item: GalleryItem) => `${item.title}. ${item.description}`;

/** Country of origin, omitted when it only repeats the category (e.g. "Ugandan · Uganda"). */
const originLabel = (item: GalleryItem): string | null => {
  if (!item.countryOrigin) return null;
  const origin = stripEmoji(item.countryOrigin);
  if (item.category === 'Ugandan' && /^uganda$/i.test(origin)) return null;
  return origin;
};

export const GallerySection: React.FC = () => {
  const [category, setCategory] = useState<GalleryCategory>('All');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      category === 'All'
        ? GALLERY_ITEMS
        : GALLERY_ITEMS.filter(
            (item) => item.category === category || item.secondaryCategories?.includes(category as GalleryItem['category']),
          ),
    [category],
  );

  // Hide filters that would show nothing
  const categories = GALLERY_CATEGORIES.filter(
    (c) =>
      c === 'All' ||
      GALLERY_ITEMS.some((i) => i.category === c || i.secondaryCategories?.includes(c as GalleryItem['category'])),
  );

  const visible = filtered.slice(0, visibleCount);
  const current = openIndex !== null ? filtered[openIndex] : null;

  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + filtered.length) % filtered.length));

  return (
    <Section id="gallery" tone="paper" labelledBy="gallery-title">
      <Container>
        <div>
          <SectionHeader
            id="gallery-title"
            eyebrow="Culinary gallery"
            title="From the kitchen"
            intro="Ugandan and African classics, international dishes, breads, pastry and celebration cakes."
          />
          <div role="group" aria-label="Filter dishes by category" className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {categories.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(c);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[0.9375rem] font-medium transition-colors ${
                    active ? 'border-charcoal bg-charcoal text-cream' : 'border-sand-strong bg-card text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <ReviewNote>
          Confirm which photographs show dishes you prepared. Items marked “Illustrative image” use stock photographs and
          should be replaced with your own photos or removed.
        </ReviewNote>

        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {filtered.length} dishes in {category}.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-9 min-[520px]:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                className="group block w-full text-left"
                aria-label={`View larger: ${item.title}`}
              >
                <ImageWithFallback
                  src={item.imagePath}
                  alt={altText(item)}
                  fallbackText={item.title}
                  loading="lazy"
                  className="aspect-[4/3] rounded-md"
                  imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </button>
              <div className="mt-3">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">
                  {item.category}
                  {originLabel(item) && <span className="text-muted"> · {originLabel(item)}</span>}
                </p>
                <h3 className="mt-1 font-serif text-[1.125rem] font-semibold leading-snug text-ink">{item.title}</h3>
                {isIllustrative(item) && <p className="mt-1 text-[0.8125rem] italic text-muted">Illustrative image</p>}
              </div>
            </li>
          ))}
        </ul>

        {visibleCount < filtered.length && (
          <div className="mt-12 text-center">
            <button type="button" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} className={btn.secondary}>
              Show more dishes ({filtered.length - visibleCount} more)
            </button>
          </div>
        )}
      </Container>

      {/* Viewer */}
      <Dialog
        open={current !== null}
        onClose={() => setOpenIndex(null)}
        labelledBy="gallery-viewer-title"
        size="max-w-5xl"
        closeLabel="Close image viewer"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {current && (
          <div className="grid md:grid-cols-12">
            <div className="flex items-center justify-center bg-charcoal md:col-span-8">
              <img
                src={current.imagePath}
                alt={altText(current)}
                className="max-h-[60vh] w-full object-contain md:max-h-[80vh]"
              />
            </div>
            <div className="flex flex-col p-6 sm:p-8 md:col-span-4">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">
                {current.category}
                {originLabel(current) && <span className="text-muted"> · {originLabel(current)}</span>}
              </p>
              <h3 id="gallery-viewer-title" className="mt-2 pr-8 font-serif text-[1.5rem] font-semibold leading-snug text-ink">
                {current.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{current.description}</p>
              {current.tags.length > 0 && (
                <p className="mt-4 text-[0.875rem] text-muted">{current.tags.join(' · ')}</p>
              )}
              {isIllustrative(current) && (
                <p className="mt-4 text-[0.875rem] italic text-muted">Illustrative image — not a photograph of Chef Peter’s own dish.</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-8">
                <button type="button" onClick={() => step(-1)} className={`${btn.secondary} !px-3`} aria-label="Previous dish">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="text-[0.875rem] text-muted">
                  {(openIndex ?? 0) + 1} of {filtered.length}
                </span>
                <button type="button" onClick={() => step(1)} className={`${btn.secondary} !px-3`} aria-label="Next dish">
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </Section>
  );
};
