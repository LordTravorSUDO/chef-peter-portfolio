import React, { useState } from 'react';
import { PUBLISHED_BOOKS, BookItem } from '../data/booksData';
import { ImageWithFallback } from './ImageWithFallback';
import { BookOpen, CheckCircle, ArrowRight, X, Sparkles } from 'lucide-react';

interface BooksSectionProps {
  onOpenConsultationModal: (bookTitle?: string) => void;
}

export const BooksSection: React.FC<BooksSectionProps> = ({ onOpenConsultationModal }) => {
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  return (
    <section id="books" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Background glow */}
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#C5A059]/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-flex items-center gap-2 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Technical Authorship</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            Published Works
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            Technical reference manuals and culinary treatises authored by Chef Peter for commercial bakers, hotel brigades, and gastronomy professionals.
          </p>
        </div>

        {/* Books 3D Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PUBLISHED_BOOKS.map((book) => (
            <div
              key={book.id}
              className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-[#C5A059]/20 hover:border-[#C5A059] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between group"
            >
              <div>
                {/* Book Cover Frame */}
                <div
                  onClick={() => setSelectedBook(book)}
                  className="relative rounded-xl overflow-hidden border border-[#C5A059]/30 bg-[#0C0C0C] shadow-2xl mb-6 cursor-pointer aspect-[3/4] group-hover:scale-[1.02] transition-transform duration-500"
                >
                  <ImageWithFallback
                    src={book.coverImage}
                    alt={book.title}
                    fallbackText={book.placeholderLabel}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-[#C5A059] text-black text-xs font-bold uppercase tracking-[0.2em] shadow-lg flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Inspect Book Scope
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#C5A059]/30 inline-block mb-2">
                  {book.publicationStatus}
                </span>

                {/* Book Title */}
                <h3 className="text-xl font-serif font-bold text-[#EAE7E2] group-hover:text-[#C5A059] transition-colors mb-2">
                  {book.title}
                </h3>

                <p className="text-xs text-[#A09E98] italic font-serif mb-4 leading-relaxed">
                  "{book.subtitle}"
                </p>

                <p className="text-xs text-[#A09E98] font-light leading-relaxed mb-6">
                  {book.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-[#C5A059]/20">
                <button
                  onClick={() => setSelectedBook(book)}
                  className="w-full py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#C5A059]/10 text-xs font-semibold uppercase tracking-[0.2em] text-[#EAE7E2] border border-[#C5A059]/30 hover:border-[#C5A059] transition-all flex items-center justify-center gap-2"
                >
                  <span>Read Chapter Outline</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
                </button>

                <button
                  onClick={() => onOpenConsultationModal(book.title)}
                  className="w-full py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#b08d49] text-xs font-bold uppercase tracking-[0.2em] text-black shadow-md shadow-[#C5A059]/20 transition-all"
                >
                  Request Technical Copy
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Book Detailed Modal */}
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#161616] border border-[#C5A059]/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#1A1A1A] text-[#A09E98] hover:text-white border border-[#C5A059]/30"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059]">
                    Technical Publication
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#EAE7E2]">
                    {selectedBook.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[#A09E98] italic font-serif mb-4">
                "{selectedBook.subtitle}"
              </p>

              <p className="text-xs sm:text-sm text-[#A09E98] font-light leading-relaxed mb-6 bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/20">
                {selectedBook.fullOverview}
              </p>

              <div className="mb-6">
                <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A059] mb-3">
                  Key Technical Modules & Chapters
                </h4>
                <div className="space-y-2">
                  {selectedBook.keyTopics.map((topic, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-2.5 text-xs text-[#EAE7E2] p-2.5 rounded bg-[#1A1A1A] border border-[#C5A059]/20">
                      <CheckCircle className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 mb-6 text-xs space-y-1">
                <p className="text-[#A09E98]"><strong className="text-[#EAE7E2]">Target Audience:</strong> {selectedBook.targetAudience}</p>
                <p className="text-[#A09E98]"><strong className="text-[#EAE7E2]">Publication Status:</strong> {selectedBook.publicationStatus}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => {
                    const bookName = selectedBook.title;
                    setSelectedBook(null);
                    onOpenConsultationModal(bookName);
                  }}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black bg-[#C5A059] hover:bg-[#b08d49] transition-all text-center"
                >
                  {selectedBook.inquiryAction}
                </button>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.2em] text-[#EAE7E2] bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 border border-[#C5A059]/30"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
