import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PUBLISHED_BOOKS } from '../data/booksData';
import { BOOK_SUBJECT_AREAS, BOOKS_REVIEW } from '../data/siteContent';
import { ImageWithFallback } from './ImageWithFallback';
import { Container, Section, SectionHeader, btn } from './site/ui';
import { ReviewNote } from './site/ReviewNote';

interface BooksSectionProps {
  onOpenConsultationModal: (enquiry?: string) => void;
}

/**
 * Published books — editorial presentation. No purchase or download links are
 * shown until real publication and ordering details are supplied.
 */
export const BooksSection: React.FC<BooksSectionProps> = ({ onOpenConsultationModal }) => {
  return (
    <Section id="books" tone="cream" labelledBy="books-title">
      <Container>
        <SectionHeader
          id="books-title"
          eyebrow="Published books"
          title="Three books from a working kitchen"
          intro="Practical references for bakers, cooks, culinary students and hospitality professionals."
        />
        <ReviewNote>{BOOKS_REVIEW}</ReviewNote>

        <div className="mt-14 space-y-16 md:space-y-20">
          {PUBLISHED_BOOKS.map((book, i) => (
            <article
              key={book.id}
              aria-labelledby={`book-${book.id}`}
              className="grid gap-8 border-t border-sand pt-12 first:border-t-0 first:pt-0 md:grid-cols-12 md:gap-12"
            >
              <div className={`md:col-span-4 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                <ImageWithFallback
                  src={book.coverImage}
                  alt={`Cover of “${book.title}” by Chef Peter the Teacher`}
                  fallbackText={book.title}
                  loading="lazy"
                  width={896}
                  height={1200}
                  className="mx-auto aspect-[3/4] max-w-[16rem] rounded-sm shadow-[0_18px_40px_-18px_rgba(28,26,23,0.55)] ring-1 ring-ink/10 md:max-w-none"
                />
              </div>

              <div className={`md:col-span-8 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                  {BOOK_SUBJECT_AREAS[book.id] ?? 'Culinary reference'}
                </p>
                <h3 id={`book-${book.id}`} className="mt-2 font-serif text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">
                  {book.title}
                </h3>
                <p className="mt-2 font-serif text-[1.125rem] italic leading-snug text-ink-soft">{book.subtitle}</p>

                <p className="mt-5 leading-relaxed text-ink-soft">{book.description}</p>
                <p className="mt-3 leading-relaxed text-ink-soft">{book.fullOverview}</p>

                <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto]">
                  <div>
                    <h4 className="font-sans text-[1rem] font-semibold text-ink">Topics covered</h4>
                    <ul className="mt-3 space-y-1.5">
                      {book.keyTopics.map((topic) => (
                        <li key={topic} className="flex gap-3 text-[0.9375rem] leading-snug text-ink-soft">
                          <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-gold" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-5 text-[0.9375rem] text-muted">
                  <span className="font-semibold text-ink-soft">Written for: </span>
                  {book.targetAudience}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  <button
                    type="button"
                    onClick={() => onOpenConsultationModal(`Book enquiry: ${book.title}`)}
                    className={btn.primary}
                  >
                    Request information <span className="sr-only">about {book.title}</span>
                  </button>
                  <span className="text-[0.875rem] text-muted">Copies and bulk orders by enquiry.</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <a href="/culinary-books" className={`${btn.text} mt-14`}>
          More about the books <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </Container>
    </Section>
  );
};
