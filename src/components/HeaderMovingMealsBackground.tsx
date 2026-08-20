// =========================================================================
// HEADER MOVING MEALS BACKGROUND
// Creates a smooth, continuous infinite marquee of delicious moving gourmet dishes
// in the background of the Hero/Header section with a dark vignette overlay.
// =========================================================================

import React from 'react';

// Collection of real, high-resolution food images for the moving background
const MOVING_MEALS_ROW_1 = [
  { name: "Traditional Matoke Luwombo", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=75" },
  { name: "Gourmet Ugandan Rolex", url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=75" },
  { name: "Lake Victoria Tilapia", url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=75" },
  { name: "Mongolian Flame Wok", url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=75" },
  { name: "Grand Wedding Cake", url: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=75" },
  { name: "French Macaron Tower", url: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=600&q=75" },
  { name: "Japanese Wagyu Ramen", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=75" },
  { name: "Smoky Jollof Rice", url: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=75" }
];

const MOVING_MEALS_ROW_2 = [
  { name: "Artisanal Berry Tartlets", url: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=600&q=75" },
  { name: "Italian Truffle Pasta", url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=75" },
  { name: "Seafood Paella", url: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=600&q=75" },
  { name: "Kampala Muchomo Platter", url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=75" },
  { name: "Moroccan Lamb Tagine", url: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=75" },
  { name: "Pan-Seared Salmon", url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=75" },
  { name: "Sourdough Boule", url: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=75" },
  { name: "Indian Butter Chicken", url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=75" }
];

export const HeaderMovingMealsBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20 sm:opacity-25 select-none">
      
      {/* Heavy Gradient Dark Vignette Overlays for Maximum Contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0C]/90 via-[#0C0C0C]/75 to-[#0C0C0C] z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0C0C0C]/90 via-transparent to-[#0C0C0C]/90 z-10"></div>

      {/* Container for Infinite Moving Strips */}
      <div className="flex flex-col gap-6 sm:gap-10 -rotate-6 scale-110 translate-y-[-5%] sm:translate-y-[-10%] opacity-80">
        
        {/* Row 1: Moving Right-to-Left */}
        <div className="flex gap-4 sm:gap-6 animate-marquee whitespace-nowrap">
          {[...MOVING_MEALS_ROW_1, ...MOVING_MEALS_ROW_1].map((meal, index) => (
            <div
              key={`row1-${index}`}
              className="w-40 h-28 sm:w-60 sm:h-40 rounded-2xl overflow-hidden border border-[#C5A059]/30 shadow-2xl flex-shrink-0 relative group"
            >
              <img
                src={meal.url}
                alt={meal.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-center">
                <span className="text-[9px] font-mono uppercase text-[#C5A059] tracking-widest block truncate">
                  {meal.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Moving Left-to-Right (Reverse) */}
        <div className="flex gap-4 sm:gap-6 animate-marquee-reverse whitespace-nowrap">
          {[...MOVING_MEALS_ROW_2, ...MOVING_MEALS_ROW_2].map((meal, index) => (
            <div
              key={`row2-${index}`}
              className="w-40 h-28 sm:w-60 sm:h-40 rounded-2xl overflow-hidden border border-[#C5A059]/30 shadow-2xl flex-shrink-0 relative group"
            >
              <img
                src={meal.url}
                alt={meal.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-center">
                <span className="text-[9px] font-mono uppercase text-[#C5A059] tracking-widest block truncate">
                  {meal.name}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
