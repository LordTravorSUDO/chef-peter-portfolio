import React, { useState } from 'react';
import { GALLERY_CATEGORIES, GALLERY_ITEMS, GalleryCategory, GalleryItem } from '../data/galleryData';
import { ImageWithFallback } from './ImageWithFallback';
import { Utensils, ZoomIn, X, Tag, Sparkles, Filter } from 'lucide-react';

export const GallerySection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('All');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredItems = selectedCategory === 'All'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter(item =>
        item.category === selectedCategory ||
        (item.secondaryCategories && item.secondaryCategories.includes(selectedCategory as any))
      );

  const visibleItems = filteredItems.slice(0, visibleCount);

  const selectCategory = (category: GalleryCategory) => {
    setSelectedCategory(category);
    setVisibleCount(12);
  };

  return (
    <section id="gallery" className="py-24 bg-[#0C0C0C] relative overflow-hidden border-t border-[#C5A059]/20">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#C5A059]/5 blur-[160px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#C5A059] bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-[#C5A059]/30 inline-flex items-center gap-2 mb-3">
            <Utensils className="w-3.5 h-3.5" />
            <span>Visual Showcase</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#EAE7E2] tracking-tight">
            The Culinary Gallery
          </h2>
          <p className="text-sm sm:text-base text-[#A09E98] mt-3 font-light">
            An extraordinary portfolio spanning Ugandan heritage delicacies, artisanal bakery, inter-continental fine dining, and signature live flame creations.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {GALLERY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/25 scale-105'
                    : 'bg-[#1A1A1A] text-[#EAE7E2]/80 border border-[#C5A059]/20 hover:border-[#C5A059]/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Gallery Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setLightboxItem(item)}
              className="group relative rounded-2xl overflow-hidden bg-[#161616] border border-[#C5A059]/20 hover:border-[#C5A059] transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <ImageWithFallback
                  src={item.imagePath}
                  alt={item.title}
                  fallbackText={item.placeholderLabel}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 sm:opacity-80 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                  
                  {/* Category Pill & Country Tag */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black bg-[#C5A059] px-2.5 py-0.5 rounded font-bold">
                      {item.category}
                    </span>
                    {item.countryOrigin && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#EAE7E2] bg-[#1A1A1A]/90 px-2.5 py-0.5 rounded border border-[#C5A059]/30 font-medium">
                        {item.countryOrigin}
                      </span>
                    )}
                    {item.featured && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] bg-black/60 px-2 py-0.5 rounded border border-[#C5A059]/40 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Featured
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-serif font-bold text-[#EAE7E2] group-hover:text-[#C5A059] transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#A09E98] line-clamp-2 mt-1 font-light">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#C5A059]/20 text-xs text-[#C5A059]">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Click to enlarge</span>
                    <ZoomIn className="w-4 h-4 group-hover:scale-125 transition-transform" />
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {visibleCount < filteredItems.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisibleCount(count => count + 12)}
              className="px-7 py-3 rounded-full border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-xs font-bold uppercase tracking-[0.2em] transition-colors"
            >
              View More Dishes
            </button>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="bg-[#161616] border border-[#C5A059]/40 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
              
              <button
                onClick={() => setLightboxItem(null)}
                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/80 text-white hover:text-[#C5A059] border border-white/20 transition-colors"
                aria-label="Close image"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12">
                
                {/* Image Section */}
                <div className="md:col-span-7 bg-black min-h-[300px] max-h-[480px] flex items-center justify-center overflow-hidden relative">
                  <ImageWithFallback
                    src={lightboxItem.imagePath}
                    alt={lightboxItem.title}
                    fallbackText={lightboxItem.placeholderLabel}
                    loading="lazy"
                    className="w-full h-full object-cover max-h-[480px]"
                  />
                </div>

                {/* Details Section */}
                <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[#161616]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#C5A059]/30 inline-block">
                        {lightboxItem.category} Cuisine
                      </span>
                      {lightboxItem.countryOrigin && (
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#EAE7E2] bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#C5A059]/30 inline-block font-medium">
                          {lightboxItem.countryOrigin}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#EAE7E2] mb-3 leading-snug">
                      {lightboxItem.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#A09E98] font-light leading-relaxed mb-6">
                      {lightboxItem.description}
                    </p>

                    <div className="space-y-2 mb-6">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A059] block">
                        Culinary Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {lightboxItem.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-[#1A1A1A] border border-[#C5A059]/20 text-[#EAE7E2] flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3 text-[#C5A059]" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#C5A059]/20">
                    <p className="text-[11px] text-[#A09E98] font-mono">
                      Image Target: <span className="text-[#C5A059]">{lightboxItem.imagePath}</span>
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
