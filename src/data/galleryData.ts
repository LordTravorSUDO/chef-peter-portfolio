// =========================================================================
// CULINARY & BAKING GALLERY DATA
// High-resolution real dish images optimized for fast web performance.
//
// 💡 PERSONALIZATION INSTRUCTION FOR CHEF PETER / DE'CHOSEN EVENTS:
// You can easily replace any `imagePath` below with your own real photos!
// Options:
// 1. Upload local photo files to `/public/images/` (e.g. `imagePath: "/images/my-wedding-cake.jpg"`)
// 2. Paste direct image web links (.jpg, .png, .webp, .avif, .svg)
// =========================================================================

export type GalleryCategory = 'All' | 'International' | 'Ugandan' | 'African' | 'Baking' | 'Fine Dining';

export interface GalleryItem {
  id: string;
  title: string;
  category: 'International' | 'Ugandan' | 'African' | 'Baking' | 'Fine Dining';
  secondaryCategories?: ('International' | 'Ugandan' | 'African' | 'Baking' | 'Fine Dining')[];
  description: string;
  imagePath: string;
  placeholderLabel: string;
  tags: string[];
  preparedBy?: string;
  featured?: boolean;
  countryOrigin?: string;
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  'All',
  'Ugandan',
  'International',
  'African',
  'Baking',
  'Fine Dining'
];

export const GALLERY_ITEMS: GalleryItem[] = [
  // -----------------------------------------------------------------------
  // LOCAL UGANDAN GASTRONOMY 🇺🇬
  // -----------------------------------------------------------------------
  {
    id: "ugandan-matoke-luwombo",
    title: "Traditional Matoke & Smoked Beef Luwombo",
    category: "Ugandan",
    secondaryCategories: ["African", "Fine Dining"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Steamed mashed green plantain wrapped in tender banana leaf served with smoked beef simmered in roasted groundnut sauce.",
    imagePath: "/images/Matooke.jfif",
    placeholderLabel: "UGANDAN DISH — Matoke & Luwombo",
    tags: ["Matoke", "Luwombo", "Groundnut Sauce", "Uganda"],
    featured: true
  },
  {
    id: "ugandan-rolex-gourmet",
    title: "Gourmet Ugandan Rolex Presentation",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Handcrafted warm chapati rolled with a seasoned vegetable & herb omelette, fresh avocado slices, tomatoes, and microgreens.",
    imagePath: "/images/Rolex.jpg",
    placeholderLabel: "UGANDAN DISH — Gourmet Rolex",
    tags: ["Rolex", "Street Food Elegance", "Chapati", "Eggs"],
    featured: true
  },
  {
    id: "ugandan-tilapia-ngege",
    title: "Lake Victoria Whole Grilled Tilapia (Ngege)",
    category: "Ugandan",
    secondaryCategories: ["African", "Fine Dining"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Crispy flame-grilled whole Tilapia seasoned with bird's eye chili, ginger garlic rub, served with cassava fries and fresh kachumbari.",
    imagePath: "/images/Tilapia.jpg",
    placeholderLabel: "UGANDAN DISH — Grilled Tilapia (Ngege)",
    tags: ["Tilapia", "Ngege", "Lake Victoria", "Kachumbari"],
    featured: true
  },
  {
    id: "ugandan-ebinyebwa-sauce",
    title: "Rich Ebinyebwa (Peanut Sauce) with Posho",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Authentic roasted peanut sauce infused with wild African mushrooms, served alongside fluffy white cornmeal posho.",
    imagePath: "/images/PoshoGnuts.jfif",
    placeholderLabel: "UGANDAN DISH — Ebinyebwa & Posho",
    tags: ["Ebinyebwa", "G-Nut Sauce", "Posho", "Heritage"],
    featured: false
  },
  {
    id: "ugandan-muchomo-platter",
    title: "Kampala Style Flame-Grilled Muchomo Platter",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Slow-roasted marinated meat skewers served with charred onions, spicy chili dip, and caramelized sweet plantains (Gonja).",
    imagePath: "/images/Muchomo.jfif",
    placeholderLabel: "UGANDAN DISH — Muchomo & Gonja",
    tags: ["Muchomo", "Gonja", "BBQ", "Street Cuisine"],
    featured: false
  },
  {
    id: "ugandan-kalo-millet-bread",
    title: "Steamed Kalo (Millet Bread) & Smoked Fish Stew",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Traditional Ugandan millet dough paired with smoked Nile perch simmered in a rich tomato-sesame gravy.",
    imagePath: "/images/Kalo.jfif",
    placeholderLabel: "UGANDAN DISH — Kalo & Smoked Fish",
    tags: ["Kalo", "Millet", "Nile Perch", "Heritage"],
    featured: false
  },
  {
    id: "ugandan-goat-meat-stew",
    title: "Slow-Braised Ugandan Mountain Goat Stew",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Tender local goat meat simmered in garlic, ginger, coriander, and scotch bonnet tomatoes, served with aromatic rice.",
    imagePath: "/images/Goat.jfif",
    placeholderLabel: "UGANDAN DISH — Goat Meat Stew",
    tags: ["Goat Meat", "Enyama", "Coriander", "Slow-Braised"],
    featured: false
  },
  {
    id: "ugandan-malewa-bamboo",
    title: "Bugisu Malewa (Smoked Bamboo Shoot Stew)",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Delicacy from Mount Elgon made of smoked bamboo shoots cooked in creamy groundnut and sesame seed paste.",
    imagePath: "/images/Smokedbamboo.jfif",
    placeholderLabel: "UGANDAN DISH — Malewa Stew",
    tags: ["Malewa", "Bamboo Shoots", "Bugisu", "Traditional"],
    featured: false
  },
  {
    id: "ugandan-katogo-breakfast",
    title: "Authentic Ugandan Katogo (Bananas & Beef)",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Hearty morning Katogo with green bananas cooked together with seasoned beef broth, tomatoes, and fresh coriander.",
    imagePath: "/images/Katogo.jfif",
    placeholderLabel: "UGANDAN DISH — Breakfast Katogo",
    tags: ["Katogo", "Matoke", "Beef", "Ugandan Breakfast"],
    featured: false
  },
  {
    id: "ugandan-kikomando-special",
    title: "Gourmet Kikomando (Chapati & Yellow Beans)",
    category: "Ugandan",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda 🇺🇬",
    description: "Shredded layered chapati paired with slow-simmered yellow beans, sliced avocados, and chopped red onions.",
    imagePath: "/images/Kikomando.jfif",
    placeholderLabel: "UGANDAN DISH — Kikomando Platter",
    tags: ["Kikomando", "Chapati", "Yellow Beans", "Street Food"],
    featured: false
  },

  // -----------------------------------------------------------------------
  // AFRICAN HERITAGE CUISINES 🌍
  // -----------------------------------------------------------------------
  {
    id: "african-jollof-rice",
    title: "Nigerian Smoky Jollof Rice & Fried Plantains",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Nigeria 🇳🇬",
    description: "Aromatic long-grain rice cooked in a scotch bonnet and roasted pepper reduction, served with golden fried plantains (Dodo) and grilled chicken.",
    imagePath: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "AFRICAN DISH — Smoky Jollof Rice",
    tags: ["Jollof Rice", "Plantains", "West Africa", "Spiced"],
    featured: true
  },
  {
    id: "african-lamb-tagine",
    title: "Moroccan Lamb Tagine with Saffron & Dried Fruits",
    category: "African",
    secondaryCategories: ["International", "Fine Dining"],
    countryOrigin: "Morocco 🇲🇦",
    description: "Slow-braised tender lamb shoulder infused with saffron, cinnamon, toasted almonds, dried apricots, and fluffy couscous.",
    imagePath: "/images/Moroccan lamb.jpg",
    placeholderLabel: "AFRICAN DISH — Moroccan Tagine",
    tags: ["Tagine", "Morocco", "Couscous", "Slow-Braised"],
    featured: true
  },
  {
    id: "african-braai-ribs",
    title: "South African Braai Flame-Grilled Ribs & Chakalaka",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "South Africa 🇿🇦",
    description: "Woodfire braai pork ribs glazed with a spicy honey marinade, paired with vibrant vegetable chakalaka relish.",
    imagePath: "/images/Porkribs.jfif",
    placeholderLabel: "AFRICAN DISH — South African Braai",
    tags: ["Braai", "South Africa", "Ribs", "Chakalaka"],
    featured: false
  },
  {
    id: "african-ethiopian-doro-wat",
    title: "Ethiopian Doro Wat Chicken Stew & Injera",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Ethiopia 🇪🇹",
    description: "Spicy Berbere-spiced chicken drumsticks braised with caramelized onions and hard-boiled eggs, served over soft spongy injera flatbread.",
    imagePath: "/images/Dorowat.jpg",
    placeholderLabel: "AFRICAN DISH — Ethiopian Doro Wat",
    tags: ["Doro Wat", "Ethiopia", "Injera", "Berbere Spice"],
    featured: true
  },
  {
    id: "african-ghanaian-waakye",
    title: "Ghanaian Waakye Rice & Beans Feast",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Ghana 🇬🇭",
    description: "Steamed rice and black-eyed peas cooked with sorghum leaves, paired with spicy shito pepper sauce, boiled egg, fried fish, and gari.",
    imagePath: "/images/Waakye.jfif",
    placeholderLabel: "AFRICAN DISH — Ghanaian Waakye",
    tags: ["Waakye", "Ghana", "Shito Sauce", "West Africa"],
    featured: false
  },
  {
    id: "african-senegalese-yassa",
    title: "Senegalese Poulet Yassa (Lemon Onion Chicken)",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Senegal 🇸🇳",
    description: "Char-grilled marinated chicken simmered in a tangy sauce of caramelized Dijon onions, green olives, lime juice, and broken rice.",
    imagePath: "/images/ChickenYassa.jpg",
    placeholderLabel: "AFRICAN DISH — Poulet Yassa",
    tags: ["Poulet Yassa", "Senegal", "Caramelized Onions", "Citrus"],
    featured: false
  },
  {
    id: "african-egyptian-koshari",
    title: "Egyptian Koshari Street Bowl",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Egypt 🇪🇬",
    description: "Traditional Egyptian bowl of brown lentils, rice, macaroni, chickpeas, topped with crispy fried onions and garlicky cumin tomato sauce.",
    imagePath: "/images/Koshari.jpg",
    placeholderLabel: "AFRICAN DISH — Egyptian Koshari",
    tags: ["Koshari", "Egypt", "Lentils", "Street Food"],
    featured: false
  },
  {
    id: "african-cameroonian-ndole",
    title: "Cameroonian Ndolé (Peanut & Bitterleaf Greens)",
    category: "African",
    secondaryCategories: ["International"],
    countryOrigin: "Cameroon 🇨🇲",
    description: "Rich traditional dish of stewed bitterleaf greens, ground raw peanuts, garlic, crayfish, and king prawns, served with fried plantains.",
    imagePath: "/images/Ndole.jpg",
    placeholderLabel: "AFRICAN DISH — Cameroonian Ndole",
    tags: ["Ndole", "Cameroon", "Prawns", "Peanut Greens"],
    featured: false
  },

  // -----------------------------------------------------------------------
  // GLOBAL INTERNATIONAL CUISINES 🌐
  // -----------------------------------------------------------------------
  {
    id: "international-mongolian-wok",
    title: "Signature Live Mongolian Flame Wok Stir-Fry",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Mongolia 🇲🇳",
    description: "High-heat flash wok cooked beef tenderloin strips with julienne bell peppers, toasted sesame oil, scallions, and signature Mongolian sauce.",
    imagePath: "/images/Mongolian.jfif",
    placeholderLabel: "INTERNATIONAL DISH — Mongolian Live Wok",
    tags: ["Mongolian", "Wok", "Live Station", "Asian Fusion"],
    featured: true
  },
  {
    id: "international-shabati-bread",
    title: "Authentic Gulf Shabati Flatbread & Mezze Dips",
    category: "International",
    secondaryCategories: ["Baking"],
    countryOrigin: "UAE / Gulf 🇦🇪",
    description: "Flaky layered Middle Eastern Shabati flatbread served alongside whipped chickpea hummus, za'atar, and olive oil.",
    imagePath: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "INTERNATIONAL DISH — Shabati Cuisine",
    tags: ["Shabati", "Middle Eastern", "Flatbread", "Mezze"],
    featured: true
  },
  {
    id: "international-japanese-ramen",
    title: "Japanese Wagyu Beef Tonkotsu Ramen",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Japan 🇯🇵",
    description: "Rich collagen bone broth served with hand-pulled noodles, seared Wagyu beef slices, soft-boiled ajitsuke egg, and scallions.",
    imagePath: "/images/Wagyu.jfif",
    placeholderLabel: "INTERNATIONAL DISH — Japanese Tonkotsu Ramen",
    tags: ["Ramen", "Japan", "Wagyu Beef", "Noodles"],
    featured: true
  },
  {
    id: "international-italian-truffle-pasta",
    title: "Italian Handcrafted Truffle Tagliatelle",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Italy 🇮🇹",
    description: "Handmade egg pasta ribbons tossed in aged Parmigiano-Reggiano emulsion, wild mushrooms, and freshly shaved summer black truffle.",
    imagePath: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "INTERNATIONAL DISH — Italian Truffle Pasta",
    tags: ["Pasta", "Italy", "Truffle", "Handmade"],
    featured: true
  },
  {
    id: "international-seafood-paella",
    title: "Spanish Seafood Paella Valenciana",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Spain 🇪🇸",
    description: "Saffron-infused Bomba rice studded with jumbo king prawns, calamari rings, green mussels, and pimiento peppers.",
    imagePath: "/images/Paella.jfif",
    placeholderLabel: "INTERNATIONAL DISH — Seafood Paella",
    tags: ["Paella", "Spain", "Saffron", "Seafood"],
    featured: false
  },
  {
    id: "international-indian-butter-chicken",
    title: "Indian Butter Chicken & Garlic Butter Naan",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "India 🇮🇳",
    description: "Tandoori-roasted chicken tikka cooked in an aromatic creamy tomato gravy, served with hot blistered garlic naan.",
    imagePath: "/images/Butterchicken.jpg",
    placeholderLabel: "INTERNATIONAL DISH — Indian Butter Chicken",
    tags: ["Butter Chicken", "India", "Naan", "Curry"],
    featured: false
  },
  {
    id: "international-mexican-tacos",
    title: "Mexican Gourmet Street Tacos al Pastor",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Mexico 🇲🇽",
    description: "Handmade heirloom corn tortillas filled with trompo-roasted marinated pork, caramelized pineapple salsa, and fresh lime.",
    imagePath: "/images/Tacos.jfif",
    placeholderLabel: "INTERNATIONAL DISH — Mexican Tacos al Pastor",
    tags: ["Tacos", "Mexico", "Street Food", "Corn Tortilla"],
    featured: false
  },
  {
    id: "international-french-coq-au-vin",
    title: "Classic French Coq au Vin & Herb Potato Puree",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "France 🇫🇷",
    description: "French burgundy red wine braised chicken legs cooked slowly with crisp bacon lardons, pearl onions, and wild cremini mushrooms.",
    imagePath: "/images/Coqua.jpg",
    placeholderLabel: "INTERNATIONAL DISH — French Coq au Vin",
    tags: ["Coq au Vin", "France", "Wine Braised", "Classic French"],
    featured: false
  },
  {
    id: "international-chinese-peking-duck",
    title: "Chinese Glazed Peking Duck & Steamed Bao Buns",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "China 🇨🇳",
    description: "Crispy dark honey glazed duck served with soft steamed lotus buns, julienne cucumbers, scallions, and savory plum hoisin sauce.",
    imagePath: "/images/Baobuns.jpg",
    placeholderLabel: "INTERNATIONAL DISH — Peking Duck",
    tags: ["Peking Duck", "China", "Bao Buns", "Hoisin Glaze"],
    featured: false
  },
  {
    id: "international-greek-souvlaki",
    title: "Greek Lamb Souvlaki Skewers & House Tzatziki",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Greece 🇬🇷",
    description: "Oregano and lemon marinated lamb skewers grilled over charcoal, paired with warm pita flatbreads and cool cucumber tzatziki.",
    imagePath: "/images/Lamb.jpg",
    placeholderLabel: "INTERNATIONAL DISH — Greek Souvlaki",
    tags: ["Souvlaki", "Greece", "Tzatziki", "Charcoal Grill"],
    featured: false
  },
  {
    id: "international-brazilian-picanha",
    title: "Brazilian Churrasco Picanha Sirloin Steak",
    category: "International",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "Brazil 🇧🇷",
    description: "Coarse rock salt rubbed Picanha beef sirloin roasted on rotisserie swords over wood coals, sliced thin with herb chimichurri.",
    imagePath: "/images/steak.jpg",
    placeholderLabel: "INTERNATIONAL DISH — Brazilian Picanha",
    tags: ["Picanha", "Brazil", "Churrasco", "Chimichurri"],
    featured: false
  },

  // -----------------------------------------------------------------------
  // ARTISANAL BAKING, WEDDING CAKES & CONFECTIONERY 🎂
  // -----------------------------------------------------------------------
  {
    id: "baking-wedding-cake-grand",
    title: "Grand 3-Tier Fondant & Floral Wedding Cake",
    category: "Baking",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "De'Chosen Masterpiece 🎂",
    description: "Architectural 3-tiered wedding cake covered in smooth ivory fondant, hand-sculpted royal sugar flowers, delicate lace pipings, and 24K edible gold leaf accents.",
    imagePath: "/images/weddingcake.jfif",
    placeholderLabel: "WEDDING CAKE — Grand Floral 3-Tier",
    tags: ["Wedding Cake", "Fondant Art", "Confectionery", "Sugar Flowers"],
    featured: true
  },
  {
    id: "baking-luxury-4tier-peony-cake",
    title: "De'Chosen Luxury 4-Tier Sugar Peony Wedding Cake",
    category: "Baking",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "De'Chosen Masterpiece 🎂",
    description: "Magnificent 4-tier celebration centerpiece featuring handcrafted sugar blush peonies, quilted royal icing texture, and gold leaf trims.",
    imagePath: "/images/luxurycake.jpg",
    placeholderLabel: "WEDDING CAKE — 4-Tier Sugar Peonies",
    tags: ["Wedding Cake", "4-Tier", "Luxury Baking", "Sugar Peonies"],
    featured: true
  },
  {
    id: "baking-macaron-confectionery-tower",
    title: "French Macaron & Confectionery Tower Display",
    category: "Baking",
    secondaryCategories: ["International"],
    countryOrigin: "France / Confectionery 🇫🇷",
    description: "Delicate almond flour macarons with Madagascar vanilla bean buttercream, salted caramel ganache, and ruby raspberry fillings arranged in an elegant dessert display.",
    imagePath: "/images/confectionery.jpg",
    placeholderLabel: "CONFECTIONERY — French Macaron Tower",
    tags: ["Confectionery", "Macarons", "Pastry Art", "Dessert Buffet"],
    featured: true
  },
  {
    id: "baking-fruit-tartlet-pastry",
    title: "Artisanal Berry & Vanilla Bean Fruit Tartlets",
    category: "Baking",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "France / Confectionery 🇫🇷",
    description: "Crisp butter sablé tart shells filled with silky crème pâtissière, topped with fresh blackberries, strawberries, blueberries, and apricot glaze.",
    imagePath: "/images/beantartles.jfif",
    placeholderLabel: "CONFECTIONERY — Berry Fruit Tartlets",
    tags: ["Fruit Tartlets", "Confectionery", "Crème Pâtissière", "Pastry"],
    featured: false
  },
  {
    id: "baking-chocolate-drip-celebration-cake",
    title: "Decadent Dark Chocolate Drip Celebration Cake",
    category: "Baking",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "De'Chosen Masterpiece 🎂",
    description: "Rich dark chocolate layer cake enveloped in Swiss meringue buttercream, dark chocolate drip glaze, chocolate sails, and fresh berries.",
    imagePath: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "CELEBRATION CAKE — Chocolate Drip Art",
    tags: ["Celebration Cake", "Chocolate Drip", "Swiss Meringue", "Cakes"],
    featured: true
  },
  {
    id: "baking-sourdough-boule",
    title: "Artisanal Commercial Sourdough Boule",
    category: "Baking",
    secondaryCategories: ["International"],
    countryOrigin: "France 🇫🇷",
    description: "Hand-scored wild yeast sourdough loaf featuring a blistering golden crust and open airy crumb structure.",
    imagePath: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "ARTISANAL BAKING — Sourdough Loaf",
    tags: ["Sourdough", "Commercial Baking", "Artisanal Bread", "Crust"],
    featured: true
  },
  {
    id: "baking-french-croissant",
    title: "Laminated Butter Croissants & Danish Pastries",
    category: "Baking",
    secondaryCategories: ["Fine Dining"],
    countryOrigin: "France 🇫🇷",
    description: "Multi-layered French butter croissants with flaky shatter-crisp exterior and rich buttery honeycomb interior.",
    imagePath: "/images/croissants.jfif",
    placeholderLabel: "ARTISANAL BAKING — Laminated Croissants",
    tags: ["Croissants", "Pastry", "Lamination", "Baking"],
    featured: false
  },
  {
    id: "baking-paris-brest-choux",
    title: "French Paris-Brest Praline Choux Ring",
    category: "Baking",
    secondaryCategories: ["International"],
    countryOrigin: "France 🇫🇷",
    description: "Ring of crispy choux pastry filled with caramelized hazelnut praline mousseline cream and dusted with powdered sugar.",
    imagePath: "/images/Parisbrest.jpg",
    placeholderLabel: "CONFECTIONERY — Paris-Brest Ring",
    tags: ["Paris-Brest", "Choux Pastry", "Praline Cream", "French Pastry"],
    featured: false
  },
  {
    id: "baking-cinnamon-brioche-rolls",
    title: "Handcrafted Cinnamon Cream Cheese Brioche Rolls",
    category: "Baking",
    secondaryCategories: ["International"],
    countryOrigin: "De'Chosen Masterpiece 🥐",
    description: "Fluffy rich brioche dough swirled with Ceylon cinnamon brown sugar butter, baked golden and drizzled with vanilla cream cheese icing.",
    imagePath: "/images/briocherolls.jpg",
    placeholderLabel: "ARTISANAL BAKING — Cinnamon Rolls",
    tags: ["Cinnamon Rolls", "Brioche", "Cream Cheese", "Baking"],
    featured: false
  },

  // -----------------------------------------------------------------------
  // FINE DINING & PLATING AESTHETICS 🍽️
  // -----------------------------------------------------------------------
  {
    id: "fine-dining-seared-salmon",
    title: "Pan-Seared Atlantic Salmon with Citrus Foam",
    category: "Fine Dining",
    secondaryCategories: ["International"],
    countryOrigin: "International 🌐",
    description: "Crispy skin salmon resting over lemongrass pea velvet puree, pickled radish coins, and light citrus air.",
    imagePath: "/images/pansearedsalmon.jpg",
    placeholderLabel: "FINE DINING — Seared Salmon & Foam",
    tags: ["Salmon", "Plating Aesthetics", "Molecular Foam", "Seafood"],
    featured: true
  },
  {
    id: "fine-dining-duck-breast",
    title: "Sous-Vide Duck Breast with Hibiscus Berry Glaze",
    category: "Fine Dining",
    secondaryCategories: ["African"],
    countryOrigin: "Uganda / France 🇺🇬🇫🇷",
    description: "Sous-vide duck breast with crispy cross-hatched skin, Ugandan hibiscus berry glaze, roasted root vegetables, and micro herbs.",
    imagePath: "/images/berryglaze.jpeg",
    placeholderLabel: "FINE DINING — Duck Breast & Hibiscus Glaze",
    tags: ["Duck Breast", "Hibiscus", "Fine Plating", "Sous-Vide"],
    featured: false
  },
  {
    id: "fine-dining-beef-tenderloin",
    title: "Herb-Crusted Beef Tenderloin with Red Wine Reduction",
    category: "Fine Dining",
    secondaryCategories: ["International"],
    countryOrigin: "International 🌐",
    description: "Pan-seared beef medallion resting on truffle potato puree, glazed carrots, and dark shallot red wine jus.",
    imagePath: "/images/herbcrafted.jfif",
    placeholderLabel: "FINE DINING — Tenderloin Medallion",
    tags: ["Beef Tenderloin", "Fine Dining", "Red Wine Jus", "Plated"],
    featured: true
  },
  {
    id: "fine-dining-poached-lobster",
    title: "Butter-Poached Lobster Tail with Caviar Emulsion",
    category: "Fine Dining",
    secondaryCategories: ["International"],
    countryOrigin: "International 🌐",
    description: "Maine lobster tail gently poached in clarified butter over glazed baby leeks, crowned with Royal Osetra caviar and saffron velvet sauce.",
    imagePath: "/images/lobstertail.jpg",
    placeholderLabel: "FINE DINING — Poached Lobster & Caviar",
    tags: ["Lobster Tail", "Caviar", "Luxury Plating", "Fine Seafood"],
    featured: true
  },
  {
    id: "fine-dining-scallops-puree",
    title: "Pan-Seared Day-Boat Scallops & Cauliflower Puree",
    category: "Fine Dining",
    secondaryCategories: ["International"],
    countryOrigin: "International 🌐",
    description: "Jumbo scallops seared with hazelnut brown butter, served over smooth roasted cauliflower puree and crispy pancetta chips.",
    imagePath: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1000&q=75",
    placeholderLabel: "FINE DINING — Seared Scallops",
    tags: ["Scallops", "Brown Butter", "Cauliflower Puree", "Fine Plating"],
    featured: false
  }
];
