export interface BookItem {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  placeholderLabel: string;
  description: string;
  fullOverview: string;
  keyTopics: string[];
  targetAudience: string;
  publicationStatus: string;
  inquiryAction: string;
}

export const PUBLISHED_BOOKS: BookItem[] = [
  {
    id: "secrets-of-a-successful-baker",
    title: "Secrets of a Successful Baker",
    subtitle: "A Comprehensive Guide to Commercial & Artisanal Baking Techniques",
    coverImage: "/images/books/secrets-of-a-successful-baker.jfif",
    placeholderLabel: "BOOK COVER — Secrets of a Successful Baker",
    description: "A masterwork on commercial bakery management, sourdough fermentation, dough chemistry, yield calculations, and oven thermodynamics.",
    fullOverview: "Written specifically for commercial bakery managers, pastry chefs, and culinary instructors, this technical manual demystifies the science of flour hydration, yeast fermentation, temperature control, and cost-effective commercial scale baking.",
    keyTopics: [
      "Commercial Dough Hydration & Baker's Percentages",
      "Sourdough Culture Maintenance & Wild Yeast Fermentation",
      "Oven Thermodynamics & Humidity Control in Deck/Convection Ovens",
      "Bakery Yield Calculations, Wastage Minimization & Cost Control",
      "Troubleshooting Bread Defects & Crust/Crumb Optimization"
    ],
    targetAudience: "Commercial Bakers, Pastry Chefs, Bakery Owners, Culinary Students",
    publicationStatus: "Published Technical Reference",
    inquiryAction: "Request Technical Copy / Bulk Inquiries"
  },
  {
    id: "inter-continental-recipe-book",
    title: "Inter-Continental Recipe Book",
    subtitle: "Global Culinary Practices Adapted for Professional Kitchens",
    coverImage: "/images/books/inter-continental-recipe-book.jfif",
    placeholderLabel: "BOOK COVER — Inter-Continental Recipe Book",
    description: "A curated collection of international standard recipes, kitchen prep guides, and cross-cultural flavor pairings optimized for hotel brigades.",
    fullOverview: "Drawing from Chef Peter's extensive international career across East/Central Africa and the Middle East, this book offers standardized recipes for banqueting, hotel dining rooms, and VIP private catering.",
    keyTopics: [
      "Standardized Quantity Recipes for Hotel Banqueting & In-Flights",
      "Asian, Middle Eastern, European & African Fusion Principles",
      "Marinades, Stocks, Mother Sauces & Cold Kitchen Garde Manger",
      "Cross-Cultural Menu Balance & Dietary Restriction Adaptation",
      "Kitchen Brigade Prep Sheets & Plating Diagrams"
    ],
    targetAudience: "Executive Chefs, Hotel Kitchen Brigades, Catering Companies",
    publicationStatus: "Published Culinary Manual",
    inquiryAction: "Order Institutional Reference Manual"
  },
  {
    id: "in-1000-ways-and-more-i-cooked",
    title: "In 1000 Ways and More I Cooked",
    subtitle: "An Extensive Exploration of Culinary Techniques, Flavor Profiling & Menu Creation",
    coverImage: "/images/books/in-1000-ways-and-more-i-cooked.jfif",
    placeholderLabel: "BOOK COVER — In 1000 Ways and More I Cooked",
    description: "An encyclopedic journey through thermal application, spice extraction, ingredient synergy, and transformative cooking philosophies.",
    fullOverview: "Chef Peter's flagship culinary treatise detailing over a thousand culinary applications, technique modifications, ingredient substitutes, and philosophy on passing down culinary excellence to future generations.",
    keyTopics: [
      "Thermal Cooking Applications: Sear, Braise, Sous-Vide, Wok & Woodfire",
      "Aromatic Spice Extraction & African Heritage Herb Profiling",
      "Transformative Menu Creation & Seasonal Ingredient Pairing",
      "The Discipline of Kitchen Leadership & Mentorship Philosophy",
      "Creative Problem Solving for Executive Kitchen Operations"
    ],
    targetAudience: "Professional Chefs, Culinary Educators, Gastronomy Enthusiasts",
    publicationStatus: "Published Masterpiece",
    inquiryAction: "Inquire for Signed Master Copy"
  }
];
