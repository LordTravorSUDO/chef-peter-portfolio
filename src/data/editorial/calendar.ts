/**
 * Editorial calendar — the first 28 articles for the Culinary Library.
 *
 * Four articles for each of the seven categories, ordered so that every two
 * weeks cover four different categories. At two articles a week the
 * programme runs for 14 publishing weeks (see `suggestedDate`).
 *
 * These are PROPOSALS. Nothing here is published automatically: an
 * administrator creates a draft from a proposal in Admin → Editorial calendar,
 * edits and fact-checks it, and then schedules it in the article editor.
 *
 * References list only real, named sources the writer should consult. Where
 * no specific source is given, the writer must find one before publishing —
 * never invent a reference. See docs/editorial-strategy.md.
 */
import type { ArticleType } from '../../lib/knowledge/articleTypes';
import type { LinkKey } from '../internalLinks';

export type CategorySlug =
  | 'food-history-and-culinary-culture'
  | 'ingredients-and-food-science'
  | 'professional-cooking-techniques'
  | 'international-cuisines'
  | 'pastry-and-bakery'
  | 'food-safety-and-hygiene'
  | 'professional-kitchen-skills';

export const CATEGORY_NAMES: Record<CategorySlug, string> = {
  'food-history-and-culinary-culture': 'Food History and Culinary Culture',
  'ingredients-and-food-science': 'Ingredients and Food Science',
  'professional-cooking-techniques': 'Professional Cooking Techniques',
  'international-cuisines': 'International Cuisines',
  'pastry-and-bakery': 'Pastry and Bakery',
  'food-safety-and-hygiene': 'Food Safety and Hygiene',
  'professional-kitchen-skills': 'Professional Kitchen Skills',
};

export type SearchIntent = 'Learn (informational)' | 'Learn how to (practical)' | 'Solve a problem' | 'Compare options';

/** A site page (see src/data/internalLinks.ts) or another planned article, written `article:<slug>`. */
export type InternalLinkRef = LinkKey | `article:${string}`;

export interface ArticleProposal {
  /** Proposed URL slug — also used to find the draft in the CMS */
  slug: string;
  /** Publishing order, 1–28 (two per week) */
  slot: number;
  title: string;
  category: CategorySlug;
  articleType: ArticleType;
  audience: string;
  searchIntent: SearchIntent;
  mainKeyword: string;
  supportingKeywords: string[];
  /** Used as the excerpt and meta description of the draft (≤ 160 characters) */
  description: string;
  headings: string[];
  photographs: string[];
  internalLinks: InternalLinkRef[];
  /** Real sources to consult and cite */
  references: string[];
  /** What must be checked or confirmed before publishing */
  reviewNotes: string[];
}

// ── Shared reference texts (all real publications) ──────────────────────────
const REF = {
  who5keys: 'World Health Organization (2006). Five Keys to Safer Food Manual. Geneva: WHO. https://www.who.int/publications/i/item/9789241594639',
  codexHygiene: 'FAO & WHO (2023). General Principles of Food Hygiene, CXC 1-1969 (Rev. 2022), Codex Alimentarius. Rome. https://doi.org/10.4060/cc6125en',
  fsaCross: 'Food Standards Agency (UK). Avoiding cross-contamination in your food business. https://www.food.gov.uk/business-guidance/avoiding-cross-contamination-in-your-food-business',
  mcgee: 'McGee, H. (2004). On Food and Cooking: The Science and Lore of the Kitchen (revised edition). New York: Scribner.',
  cauvain: 'Cauvain, S. P. (2015). Technology of Breadmaking (3rd edition). Cham: Springer.',
  figoni: 'Figoni, P. (2011). How Baking Works: Exploring the Fundamentals of Baking Science (3rd edition). Hoboken, NJ: Wiley.',
  gisslenBaking: 'Gisslen, W. Professional Baking. Hoboken, NJ: Wiley (use the latest edition available).',
  gisslenCooking: 'Gisslen, W. Professional Cooking. Hoboken, NJ: Wiley (use the latest edition available).',
  cia: 'The Culinary Institute of America. The Professional Chef. Hoboken, NJ: Wiley (use the latest edition available).',
  escoffier: 'Escoffier, A. (1903). Le Guide Culinaire. Paris. (English translation: The Complete Guide to the Art of Modern Cookery.)',
};

export const EDITORIAL_CALENDAR: ArticleProposal[] = [
  // ─── Weeks 1–2: foundations (full drafts prepared) ─────────────────────────
  {
    slug: 'mise-en-place-professional-kitchen',
    slot: 1,
    title: 'Mise en Place: How Professional Chefs Prepare Before They Cook',
    category: 'professional-cooking-techniques',
    articleType: 'kitchen_guide',
    audience: 'Culinary students, junior cooks and confident home cooks who want to work faster and calmer',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'mise en place',
    supportingKeywords: ['mise en place meaning', 'kitchen preparation', 'prep list', 'organised cooking', 'professional kitchen workflow'],
    description: 'What mise en place means, why professional kitchens depend on it, and how to organise your ingredients, tools and time before you start cooking.',
    headings: [
      'What “mise en place” means',
      'Why professional kitchens depend on it',
      'The three parts: ingredients, equipment and time',
      'How to build a simple prep list',
      'Mise en place at home and in small kitchens',
      'Common mistakes',
    ],
    photographs: [
      'A workstation with ingredients weighed into small bowls, knife and board ready (overhead shot)',
      'A handwritten prep list on a clipboard beside a station',
      'Before-and-after: cluttered board vs. organised station',
    ],
    internalLinks: ['cooking', 'techniqueBook', 'article:knife-skills-fundamentals', 'article:how-to-organise-an-efficient-kitchen'],
    references: [REF.cia, REF.gisslenCooking],
    reviewNotes: ['Chef Peter to add or confirm his own tip on prep lists (marked in the draft).'],
  },
  {
    slug: 'cross-contamination-in-the-kitchen',
    slot: 2,
    title: 'Cross-Contamination in the Kitchen: How It Happens and How to Prevent It',
    category: 'food-safety-and-hygiene',
    articleType: 'food_safety_guide',
    audience: 'Food handlers, kitchen staff, small food business owners and home cooks',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'cross-contamination',
    supportingKeywords: ['how to prevent cross-contamination', 'raw and cooked food separation', 'colour-coded chopping boards', 'allergen cross-contact', 'food safety Uganda'],
    description: 'How bacteria and allergens travel from raw food, hands and equipment to ready-to-eat food — and the practical routines that stop it in any kitchen.',
    headings: [
      'What cross-contamination is',
      'The three routes: food to food, hands and equipment',
      'Allergen cross-contact',
      'Separating raw and ready-to-eat food',
      'Cleaning and disinfecting: the difference',
      'A daily routine for small kitchens',
    ],
    photographs: [
      'Colour-coded chopping boards in a rack',
      'Refrigerator shelves with raw meat stored below ready-to-eat food',
      'Hand-washing at a kitchen sink',
    ],
    internalLinks: ['hospitality', 'consultant', 'article:food-storage-and-temperature-control', 'article:personal-hygiene-for-chefs'],
    references: [REF.who5keys, REF.codexHygiene, REF.fsaCross],
    reviewNotes: ['Editor to check the draft against the current versions of the cited guidance before publishing.', 'Confirm any Ugandan regulatory reference with the relevant authority before adding one.'],
  },
  {
    slug: 'how-yeast-works-in-bread',
    slot: 3,
    title: 'How Yeast Works in Bread: Fermentation Explained for Bakers',
    category: 'ingredients-and-food-science',
    articleType: 'ingredient_guide',
    audience: 'Home bakers, bakery trainees and small commercial bakers',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'how yeast works in bread',
    supportingKeywords: ['bread fermentation', 'instant vs active dry yeast', 'proofing dough', 'yeast temperature', 'why bread does not rise'],
    description: 'What yeast is, how it makes bread rise and taste good, how temperature, sugar and salt affect it, and how to choose and use fresh, active dry and instant yeast.',
    headings: [
      'What yeast is',
      'What happens during fermentation',
      'Temperature: the baker’s main control',
      'Sugar, salt and yeast',
      'Fresh, active dry and instant yeast',
      'Why bread fails to rise',
    ],
    photographs: [
      'Fresh, active dry and instant yeast side by side, labelled',
      'Dough before and after the first rise in a clear container',
      'A cut loaf showing an open, even crumb',
    ],
    internalLinks: ['baking', 'bakerBook', 'article:science-of-bread-fermentation', 'article:dough-development-and-gluten'],
    references: [REF.cauvain, REF.mcgee, REF.figoni],
    reviewNotes: ['Check yeast conversion ratios against the packet guidance of the brands available in Uganda.'],
  },
  {
    slug: 'why-cakes-fail',
    slot: 4,
    title: 'Why Cakes Fail: Sinking, Dense and Dry Cakes Explained',
    category: 'pastry-and-bakery',
    articleType: 'baking_tutorial',
    audience: 'Home bakers, cake business owners and pastry students',
    searchIntent: 'Solve a problem',
    mainKeyword: 'why did my cake sink',
    supportingKeywords: ['dense cake', 'dry cake', 'cake cracked on top', 'cake baking problems', 'oven temperature for cakes'],
    description: 'The common reasons cakes sink, turn out dense, dry or cracked — and what to change in your ingredients, mixing and oven to fix each problem.',
    headings: [
      'Start with the recipe and the measurements',
      'Why cakes sink in the middle',
      'Why cakes are dense or heavy',
      'Why cakes are dry',
      'Why cakes crack or dome',
      'Quick troubleshooting guide',
    ],
    photographs: [
      'A sunken cake cut in half beside a well-risen cake',
      'An oven thermometer on an oven shelf',
      'Weighing flour on digital scales vs. a cup measure',
    ],
    internalLinks: ['baking', 'bakerBook', 'article:fat-sugar-and-eggs-in-baking', 'article:ingredient-substitution-guide'],
    references: [REF.figoni, REF.gisslenBaking, REF.mcgee],
    reviewNotes: ['Chef Peter to confirm or replace the tip on oven calibration (marked in the draft).'],
  },

  // ─── Weeks 3–4 ─────────────────────────────────────────────────────────────
  {
    slug: 'matooke-history-and-culture-uganda',
    slot: 5,
    title: 'Matooke: The History and Cultural Importance of Uganda’s Cooking Banana',
    category: 'food-history-and-culinary-culture',
    articleType: 'food_history',
    audience: 'Ugandan and international readers interested in food culture; visitors to Uganda; culinary students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'matooke',
    supportingKeywords: ['matooke Uganda', 'East African highland banana', 'how matooke is cooked', 'luwombo', 'Ugandan food culture'],
    description: 'Where Uganda’s cooking bananas come from, why matooke matters at home and at celebrations, and how it is traditionally prepared and served.',
    headings: [
      'What matooke is (and how it differs from sweet bananas and plantain)',
      'What historians and scientists know about bananas in East Africa',
      'Matooke in daily life and at ceremonies',
      'Traditional preparation: peeling, steaming in leaves and mashing',
      'Matooke in today’s kitchens',
    ],
    photographs: [
      'Bunches of green matooke at a Kampala market',
      'Matooke wrapped in banana leaves for steaming',
      'A plate of mashed matooke with groundnut sauce',
    ],
    internalLinks: ['recipeBook', 'about', 'article:preserving-traditional-food-knowledge', 'article:east-african-culinary-traditions'],
    references: [
      'Lejju, B. J., Robertshaw, P. & Taylor, D. (2006). Africa’s earliest bananas? Journal of Archaeological Science, 33(1), 102–113. (Present as a debated finding, not settled fact.)',
      'ProMusa — East African highland bananas: https://www.promusa.org',
    ],
    reviewNotes: [
      'Clearly separate established facts from debated dates for the arrival of bananas in Africa.',
      'Cultural practices differ between communities — describe them as examples, not universal rules.',
      'Any personal or family memories must come from Chef Peter himself.',
    ],
  },
  {
    slug: 'foundations-of-italian-cuisine',
    slot: 6,
    title: 'The Foundations of Italian Cuisine: Regions, Ingredients and Simplicity',
    category: 'international-cuisines',
    articleType: 'educational',
    audience: 'Cooks preparing Italian dishes for restaurants, hotels and home; culinary students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'Italian cuisine',
    supportingKeywords: ['regional Italian cooking', 'Italian cooking techniques', 'pasta and sauce pairing', 'soffritto', 'Italian ingredients substitutes'],
    description: 'Why Italian cooking is regional, which ingredients and techniques matter most, and how to cook Italian dishes well with ingredients available in Uganda.',
    headings: [
      'One country, many regional cuisines',
      'Ingredients first: quality and seasonality',
      'Core techniques: soffritto, pasta cooking and risotto',
      'Matching pasta shapes and sauces',
      'Cooking Italian food with local ingredients',
    ],
    photographs: ['Soffritto (onion, carrot, celery) being cut', 'Fresh pasta drying', 'A finished risotto in a pan'],
    internalLinks: ['recipeBook', 'privateChef', 'article:origins-of-popular-international-dishes', 'article:ingredient-substitution-guide'],
    references: [
      'Artusi, P. (1891). La scienza in cucina e l’arte di mangiar bene (Science in the Kitchen and the Art of Eating Well).',
      'Hazan, M. (1992). Essentials of Classic Italian Cooking. New York: Knopf.',
    ],
    reviewNotes: ['Avoid claiming one “authentic” version of a dish; note regional variation.'],
  },
  {
    slug: 'how-a-kitchen-brigade-works',
    slot: 7,
    title: 'How a Professional Kitchen Brigade Works: Roles, Ranks and Teamwork',
    category: 'professional-kitchen-skills',
    articleType: 'kitchen_guide',
    audience: 'Culinary students, new kitchen staff and hospitality managers',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'kitchen brigade',
    supportingKeywords: ['brigade de cuisine', 'kitchen hierarchy', 'executive chef duties', 'sous chef role', 'chef de partie'],
    description: 'The kitchen brigade explained: where it came from, what each role does, and how smaller hotel and restaurant kitchens in Uganda adapt it.',
    headings: [
      'Where the brigade system came from',
      'The main roles, from executive chef to commis',
      'Stations (parties) and what they cover',
      'How calls and communication work during service',
      'Adapting the brigade for small kitchens',
    ],
    photographs: ['A kitchen team during service (with permission)', 'A diagram of a brigade hierarchy', 'The pass with tickets'],
    internalLinks: ['hospitality', 'consultant', 'cooking', 'article:how-to-organise-an-efficient-kitchen'],
    references: [REF.escoffier, REF.gisslenCooking, REF.cia],
    reviewNotes: ['Describe the brigade as usually credited to Escoffier’s organisation of kitchens; avoid over-precise claims.', 'Photographs of real teams need consent.'],
  },
  {
    slug: 'food-storage-and-temperature-control',
    slot: 8,
    title: 'Safe Food Storage and Temperature Control: A Practical Guide',
    category: 'food-safety-and-hygiene',
    articleType: 'food_safety_guide',
    audience: 'Food handlers, caterers, small restaurants and households',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'food temperature danger zone',
    supportingKeywords: ['safe food storage', 'refrigerator temperature', 'cooling cooked food', 'reheating food safely', 'food storage in hot climates'],
    description: 'How temperature controls bacterial growth, the safe ranges for chilling, holding hot and reheating food, and how to store food safely in a warm climate.',
    headings: [
      'Why temperature matters',
      'The danger zone',
      'Refrigerator and freezer storage',
      'Cooling cooked food quickly',
      'Hot holding and reheating',
      'Dry stores, labelling and first-in, first-out',
      'Working in a warm climate and during power cuts',
    ],
    photographs: ['A probe thermometer in a pot of stew', 'Labelled containers with dates', 'An organised refrigerator'],
    internalLinks: ['hospitality', 'article:cross-contamination-in-the-kitchen', 'article:introduction-to-haccp'],
    references: [REF.who5keys, REF.codexHygiene],
    reviewNotes: ['All temperatures and times must match the cited guidance exactly; do not add unsupported figures.'],
  },

  // ─── Weeks 5–6 ─────────────────────────────────────────────────────────────
  {
    slug: 'knife-skills-fundamentals',
    slot: 9,
    title: 'Knife Skills Fundamentals: Grip, Safety and the Classic Cuts',
    category: 'professional-cooking-techniques',
    articleType: 'cooking_tutorial',
    audience: 'Beginner cooks, culinary students and kitchen trainees',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'knife skills',
    supportingKeywords: ['how to hold a chef’s knife', 'claw grip', 'julienne', 'brunoise', 'dice sizes', 'knife sharpening and honing'],
    description: 'How to hold and control a chef’s knife safely, the classic cuts and their sizes, and how to keep your knives sharp.',
    headings: ['Choosing a knife', 'The grip and the guiding hand', 'Board set-up and safety', 'The classic cuts and their sizes', 'Honing and sharpening', 'Practice exercises'],
    photographs: ['Close-up of the pinch grip', 'The claw grip on an onion', 'A board showing julienne, brunoise and dice side by side'],
    internalLinks: ['cooking', 'techniqueBook', 'article:mise-en-place-professional-kitchen'],
    references: [REF.cia, REF.gisslenCooking],
    reviewNotes: ['Check cut dimensions against the cited textbooks (sizes vary slightly between sources).'],
  },
  {
    slug: 'east-african-culinary-traditions',
    slot: 10,
    title: 'The Diversity of East African Cooking: Coast, Highlands and Lakes',
    category: 'international-cuisines',
    articleType: 'educational',
    audience: 'International readers, tourists, hospitality staff and culinary students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'East African food',
    supportingKeywords: ['Swahili cuisine', 'Ugandan food', 'Kenyan food', 'Ethiopian food', 'pilau', 'injera'],
    description: 'An introduction to East Africa’s many cuisines — the Swahili coast, the highlands and the Great Lakes — and the trade and farming that shaped them.',
    headings: ['A region of many food cultures', 'The Swahili coast and Indian Ocean trade', 'The Great Lakes: bananas, millet and fish', 'The Ethiopian and Eritrean highlands', 'Shared staples and street food', 'Cooking East African dishes in professional kitchens'],
    photographs: ['Pilau with whole spices', 'Fresh tilapia from Lake Victoria', 'A street-side rolex being made'],
    internalLinks: ['recipeBook', 'privateChef', 'article:matooke-history-and-culture-uganda', 'article:how-african-traditions-shape-modern-cooking'],
    references: ['Editor to source: academic or museum sources on Swahili coast trade history and Ethiopian cuisine (do not publish historical claims without a source).'],
    reviewNotes: ['Avoid generalising: name the country or community each practice belongs to.'],
  },
  {
    slug: 'introduction-to-haccp',
    slot: 11,
    title: 'An Introduction to HACCP: The Seven Principles in Plain Language',
    category: 'food-safety-and-hygiene',
    articleType: 'food_safety_guide',
    audience: 'Kitchen supervisors, food business owners, hospitality students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'HACCP principles',
    supportingKeywords: ['what is HACCP', 'critical control points', 'HACCP plan example', 'good hygiene practices', 'food safety management system'],
    description: 'What HACCP is, how it builds on good hygiene practices, and the seven principles explained with a simple kitchen example.',
    headings: ['What HACCP is and where it comes from', 'Good hygiene practices come first', 'The seven principles explained', 'A worked example: cooking and cooling a beef stew', 'Records that are actually useful', 'Getting started in a small business'],
    photographs: ['A completed temperature log sheet', 'A probe thermometer in use', 'A simple flow diagram of a recipe process'],
    internalLinks: ['hospitality', 'consultant', 'article:food-storage-and-temperature-control', 'article:cross-contamination-in-the-kitchen'],
    references: [REF.codexHygiene],
    reviewNotes: ['Use the Codex wording of the seven principles.', 'Make clear that certification and legal requirements depend on the country and the business.'],
  },
  {
    slug: 'science-of-bread-fermentation',
    slot: 12,
    title: 'The Science of Bread Fermentation: Time, Temperature and Flavour',
    category: 'pastry-and-bakery',
    articleType: 'baking_tutorial',
    audience: 'Bakers moving beyond basic bread; bakery trainees',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'bread fermentation',
    supportingKeywords: ['bulk fermentation', 'proofing', 'preferment', 'poolish', 'sourdough starter', 'dough temperature'],
    description: 'How fermentation time and temperature shape a loaf’s rise, texture and flavour, and how bakers use preferments and dough temperature to control it.',
    headings: ['Fermentation stages: bulk and final proof', 'Desired dough temperature', 'Short and long fermentation', 'Preferments: poolish, biga and sponge', 'Sourdough in brief', 'Reading the dough: when is it ready?'],
    photographs: ['A poolish bubbling in a container', 'The finger-poke test on proofed dough', 'Two loaves: short vs. long fermentation crumb'],
    internalLinks: ['baking', 'bakerBook', 'article:how-yeast-works-in-bread', 'article:dough-development-and-gluten'],
    references: [REF.cauvain, REF.figoni],
    reviewNotes: [],
  },

  // ─── Weeks 7–8 ─────────────────────────────────────────────────────────────
  {
    slug: 'fat-sugar-and-eggs-in-baking',
    slot: 13,
    title: 'What Fat, Sugar and Eggs Really Do in Baking',
    category: 'ingredients-and-food-science',
    articleType: 'ingredient_guide',
    audience: 'Home bakers, cake makers and pastry students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'role of fat in baking',
    supportingKeywords: ['role of sugar in baking', 'role of eggs in baking', 'butter vs margarine', 'reducing sugar in cakes', 'creaming method'],
    description: 'How fat, sugar and eggs tenderise, sweeten, aerate and set baked goods — and what happens when you change the amounts.',
    headings: ['Fat: tenderness, flakiness and flavour', 'Butter, margarine, oil and shortening compared', 'Sugar does more than sweeten', 'Eggs: structure, lift and emulsion', 'Changing the balance safely'],
    photographs: ['Butter and sugar before and after creaming', 'Egg whites whipped to soft and stiff peaks', 'Cookies made with different fats'],
    internalLinks: ['baking', 'bakerBook', 'article:why-cakes-fail', 'article:ingredient-substitution-guide'],
    references: [REF.figoni, REF.mcgee],
    reviewNotes: [],
  },
  {
    slug: 'how-to-organise-an-efficient-kitchen',
    slot: 14,
    title: 'How to Organise an Efficient Professional Kitchen',
    category: 'professional-kitchen-skills',
    articleType: 'kitchen_guide',
    audience: 'Restaurant and hotel owners, head chefs, caterers setting up kitchens',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'kitchen layout and workflow',
    supportingKeywords: ['commercial kitchen layout', 'kitchen workflow', 'kitchen zones', 'stock rotation', 'kitchen standard operating procedures'],
    description: 'How workflow, zones, storage and simple standard procedures make a professional kitchen faster, safer and easier to manage.',
    headings: ['Follow the food: from delivery to service', 'Zones and stations', 'Storage and stock rotation', 'Standard recipes and prep lists', 'Cleaning schedules', 'Checklist for an existing kitchen'],
    photographs: ['A kitchen floor plan sketch showing workflow', 'Labelled shelving in a dry store', 'A cleaning schedule on a wall'],
    internalLinks: ['hospitality', 'consultant', 'article:how-a-kitchen-brigade-works', 'article:mise-en-place-professional-kitchen'],
    references: [REF.codexHygiene, REF.gisslenCooking],
    reviewNotes: ['Do not describe Chef Peter’s consultancy results unless he provides confirmed examples.'],
  },
  {
    slug: 'how-african-traditions-shape-modern-cooking',
    slot: 15,
    title: 'How African Culinary Traditions Shape Modern Cooking',
    category: 'food-history-and-culinary-culture',
    articleType: 'food_history',
    audience: 'Food enthusiasts, chefs and culinary students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'African culinary traditions',
    supportingKeywords: ['African food history', 'African ingredients in world cuisine', 'okra', 'jollof', 'African diaspora food'],
    description: 'How African ingredients, techniques and cooks have influenced food around the world, and how chefs today are bringing traditional methods into modern kitchens.',
    headings: ['Ingredients that travelled from Africa', 'Techniques: fermentation, smoking and one-pot cooking', 'African influence in the Americas and Caribbean', 'Modern African cooking', 'Respecting the source'],
    photographs: ['Okra, sorghum and millet', 'A one-pot stew cooking over charcoal', 'A modern plated dish using traditional ingredients'],
    internalLinks: ['recipeBook', 'about', 'article:east-african-culinary-traditions', 'article:preserving-traditional-food-knowledge'],
    references: ['Editor to source: peer-reviewed or museum sources for each historical claim (e.g. crop origins, diaspora foodways).'],
    reviewNotes: ['Distinguish established crop histories from popular but contested stories.'],
  },
  {
    slug: 'braising-roasting-and-grilling',
    slot: 16,
    title: 'Braising, Roasting and Grilling: Choosing the Right Method',
    category: 'professional-cooking-techniques',
    articleType: 'cooking_tutorial',
    audience: 'Cooks and culinary students; home cooks preparing meat and vegetables',
    searchIntent: 'Compare options',
    mainKeyword: 'braising vs roasting',
    supportingKeywords: ['dry heat vs moist heat cooking', 'how to braise meat', 'grilling tips', 'tough vs tender cuts', 'Maillard reaction'],
    description: 'How dry-heat and moist-heat methods work, which cuts and vegetables suit braising, roasting or grilling, and how to get good results with each.',
    headings: ['Dry heat and moist heat', 'Braising: low, slow and liquid', 'Roasting: even, dry heat', 'Grilling: direct, intense heat', 'Matching the method to the cut', 'Resting and carving'],
    photographs: ['Goat stew braising in a heavy pot', 'A roast chicken with a probe thermometer', 'Muchomo on a charcoal grill'],
    internalLinks: ['cooking', 'techniqueBook', 'article:stocks-and-sauces'],
    references: [REF.mcgee, REF.gisslenCooking],
    reviewNotes: ['Safe internal temperatures must follow food safety guidance (link to the storage and temperature article).'],
  },

  // ─── Weeks 9–10 ────────────────────────────────────────────────────────────
  {
    slug: 'moroccan-cooking-signature-ingredients',
    slot: 17,
    title: 'Moroccan Cooking: Tagines, Spice Blends and Preserved Lemons',
    category: 'international-cuisines',
    articleType: 'educational',
    audience: 'Cooks and food lovers exploring North African food; hotel and catering kitchens',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'Moroccan cuisine',
    supportingKeywords: ['tagine cooking', 'ras el hanout', 'preserved lemons', 'couscous', 'Moroccan spices'],
    description: 'The ingredients and methods behind Moroccan cooking — tagines, couscous, spice blends and preserved lemons — and how to use them in your own kitchen.',
    headings: ['Influences on Moroccan cuisine', 'The tagine: pot and dish', 'Spices and ras el hanout', 'Preserved lemons and olives', 'Couscous done properly', 'Adapting Moroccan dishes with local ingredients'],
    photographs: ['A clay tagine with lid', 'Moroccan lamb with apricots', 'Jars of preserved lemons'],
    internalLinks: ['recipeBook', 'privateChef', 'article:how-spices-build-flavour'],
    references: ['Wolfert, P. (1973). Couscous and Other Good Food from Morocco. New York: Harper & Row.'],
    reviewNotes: [],
  },
  {
    slug: 'introduction-to-pastry-techniques',
    slot: 18,
    title: 'An Introduction to Professional Pastry: Shortcrust, Choux and Puff',
    category: 'pastry-and-bakery',
    articleType: 'baking_tutorial',
    audience: 'Pastry students, cake and bakery businesses, ambitious home bakers',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'pastry techniques',
    supportingKeywords: ['shortcrust pastry', 'choux pastry', 'puff pastry', 'laminated dough', 'blind baking'],
    description: 'The main families of pastry, how each one works, and the techniques professional pastry cooks use to make them reliably in a warm kitchen.',
    headings: ['Why pastry is about temperature', 'Shortcrust: rubbing in and resting', 'Choux: cooking the paste', 'Puff and laminated doughs', 'Blind baking and finishing', 'Working with pastry in a warm climate'],
    photographs: ['Rubbing butter into flour', 'Piped choux before baking', 'Layers visible in baked puff pastry'],
    internalLinks: ['baking', 'bakerBook', 'article:dough-development-and-gluten'],
    references: [REF.gisslenBaking, REF.figoni],
    reviewNotes: ['Link to the existing lamination article in the library if it is published.'],
  },
  {
    slug: 'food-costing-and-portion-control',
    slot: 19,
    title: 'Food Costing and Portion Control: Pricing Dishes That Make Money',
    category: 'professional-kitchen-skills',
    articleType: 'kitchen_guide',
    audience: 'Restaurant owners, caterers, head chefs and food business students',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'food costing',
    supportingKeywords: ['recipe costing', 'food cost percentage', 'yield test', 'portion control', 'menu pricing'],
    description: 'How to cost a recipe, calculate food cost percentage, run a yield test and control portions — with a worked example in Uganda shillings.',
    headings: ['Why costing matters', 'Costing a standard recipe', 'Yield tests: what you buy vs. what you use', 'Food cost percentage and selling price', 'Portion control tools', 'A worked example'],
    photographs: ['A costing sheet with a calculator', 'Portioning scoops and ladles', 'Trimming meat for a yield test'],
    internalLinks: ['consultant', 'hospitality', 'bakerBook', 'article:how-to-organise-an-efficient-kitchen'],
    references: [REF.gisslenCooking],
    reviewNotes: ['Prices in the worked example must be labelled as illustrative and dated.'],
  },
  {
    slug: 'personal-hygiene-for-chefs',
    slot: 20,
    title: 'Personal Hygiene Standards for Chefs and Food Handlers',
    category: 'food-safety-and-hygiene',
    articleType: 'food_safety_guide',
    audience: 'Kitchen staff, trainees, caterers and food business owners',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'personal hygiene for food handlers',
    supportingKeywords: ['hand washing in the kitchen', 'kitchen uniform', 'food handler illness', 'jewellery in the kitchen', 'hair covering'],
    description: 'The personal hygiene standards professional kitchens expect — hand washing, clothing, illness reporting and habits — and why each one matters.',
    headings: ['Why people are a food safety risk', 'Hand washing: when and how', 'Clothing, hair and jewellery', 'Cuts, wounds and illness', 'Habits to avoid at work', 'Building a hygiene culture'],
    photographs: ['Correct hand-washing steps', 'A chef in clean whites with hair covered', 'A blue plaster on a finger'],
    internalLinks: ['hospitality', 'article:cross-contamination-in-the-kitchen', 'article:discipline-and-professionalism-as-a-chef'],
    references: [REF.codexHygiene, REF.who5keys],
    reviewNotes: [],
  },

  // ─── Weeks 11–12 ───────────────────────────────────────────────────────────
  {
    slug: 'how-spices-build-flavour',
    slot: 21,
    title: 'How Spices Build Flavour: Toasting, Blooming and Layering',
    category: 'ingredients-and-food-science',
    articleType: 'ingredient_guide',
    audience: 'Cooks of all levels; culinary students',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'how to use spices',
    supportingKeywords: ['toasting spices', 'blooming spices in oil', 'whole vs ground spices', 'spice storage', 'pilau masala'],
    description: 'Why spices taste stronger when toasted or cooked in fat, when to add them, and how to store and combine them for deeper flavour.',
    headings: ['Where spice flavour comes from', 'Whole or ground?', 'Toasting and blooming', 'Layering spices through a dish', 'Making your own blends', 'Buying and storing spices'],
    photographs: ['Whole spices toasting in a dry pan', 'Spices sizzling in oil', 'A home-made spice blend in a jar'],
    internalLinks: ['cooking', 'recipeBook', 'article:moroccan-cooking-signature-ingredients'],
    references: [REF.mcgee],
    reviewNotes: [],
  },
  {
    slug: 'stocks-and-sauces',
    slot: 22,
    title: 'Stocks and Sauces: The Foundations of Professional Cooking',
    category: 'professional-cooking-techniques',
    articleType: 'cooking_tutorial',
    audience: 'Culinary students, hotel and restaurant cooks',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'stocks and sauces',
    supportingKeywords: ['how to make chicken stock', 'mother sauces', 'roux', 'reduction', 'thickening sauces'],
    description: 'How to make clear, well-flavoured stocks, the classic mother sauces and the thickening methods professional kitchens use every day.',
    headings: ['What makes a good stock', 'White and brown stocks', 'Thickening: roux, starch and reduction', 'The classic mother sauces', 'Modern and regional sauces', 'Storing stocks safely'],
    photographs: ['Stock simmering with bones and vegetables', 'A roux at different colours', 'Béchamel being whisked'],
    internalLinks: ['cooking', 'techniqueBook', 'recipeBook', 'article:food-storage-and-temperature-control'],
    references: [REF.escoffier, REF.cia, REF.gisslenCooking],
    reviewNotes: ['Name the five mother sauces as presented in the cited textbooks; note that Escoffier’s original grouping differs slightly.'],
  },
  {
    slug: 'origins-of-popular-international-dishes',
    slot: 23,
    title: 'Where Popular Dishes Really Come From: Pizza, Curry, Paella and More',
    category: 'food-history-and-culinary-culture',
    articleType: 'food_history',
    audience: 'Food lovers, tourism and hospitality staff, culinary students',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'origins of popular dishes',
    supportingKeywords: ['history of pizza', 'origin of curry', 'history of paella', 'food myths', 'food history facts'],
    description: 'The documented histories of well-known dishes — and the popular stories about them that historians question.',
    headings: ['How food historians work', 'Pizza and Naples', '“Curry”: one word, many dishes', 'Paella and Valencia', 'Famous food legends to treat with caution'],
    photographs: ['A Neapolitan-style pizza', 'A paella pan', 'A spread of different curries'],
    internalLinks: ['recipeBook', 'article:foundations-of-italian-cuisine', 'article:east-african-culinary-traditions'],
    references: ['Editor to source: a reputable history reference for each dish (e.g. academic food history publications). No claim without a source.'],
    reviewNotes: ['Label legends as legends.'],
  },
  {
    slug: 'dough-development-and-gluten',
    slot: 24,
    title: 'Dough Development and Gluten: Kneading, Resting and Strength',
    category: 'pastry-and-bakery',
    articleType: 'baking_tutorial',
    audience: 'Bread and pastry bakers, bakery trainees',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'gluten development',
    supportingKeywords: ['how to knead dough', 'windowpane test', 'autolyse', 'bread flour vs all-purpose flour', 'dough hydration'],
    description: 'How gluten forms, how kneading, resting and hydration change dough strength, and how to tell when a dough is properly developed.',
    headings: ['What gluten is', 'Flour protein and flour types', 'Kneading by hand and machine', 'Resting and autolyse', 'Hydration and baker’s percentages', 'The windowpane test'],
    photographs: ['The windowpane test', 'Dough before and after kneading', 'Flours with different protein contents'],
    internalLinks: ['baking', 'bakerBook', 'article:how-yeast-works-in-bread', 'article:science-of-bread-fermentation'],
    references: [REF.cauvain, REF.figoni],
    reviewNotes: ['Check flour protein figures against the packaging of flours sold in Uganda.'],
  },

  // ─── Weeks 13–14 ───────────────────────────────────────────────────────────
  {
    slug: 'asian-cooking-techniques',
    slot: 25,
    title: 'Essential Asian Cooking Techniques: Stir-Frying, Steaming and Braising',
    category: 'international-cuisines',
    articleType: 'cooking_tutorial',
    audience: 'Cooks preparing Asian dishes in restaurants, hotels and homes',
    searchIntent: 'Learn how to (practical)',
    mainKeyword: 'Asian cooking techniques',
    supportingKeywords: ['how to stir-fry', 'wok cooking', 'steaming fish', 'red braising', 'velveting chicken'],
    description: 'The techniques behind many East and South-East Asian dishes — stir-frying, steaming and braising — explained with practical tips for any kitchen.',
    headings: ['“Asian cooking” is many cuisines', 'Stir-frying and the wok', 'Steaming', 'Braising and simmering', 'Balancing salty, sweet, sour and heat', 'Cooking with ingredients available in Uganda'],
    photographs: ['Vegetables being stir-fried in a wok', 'Fish steaming in a bamboo basket', 'Mongolian-style beef plated'],
    internalLinks: ['recipeBook', 'cooking', 'article:how-spices-build-flavour'],
    references: ['Young, G. (2004). The Breath of a Wok. New York: Simon & Schuster.'],
    reviewNotes: ['Name the specific cuisine each technique belongs to.'],
  },
  {
    slug: 'discipline-and-professionalism-as-a-chef',
    slot: 26,
    title: 'Discipline and Professionalism in the Kitchen: What It Takes to Grow as a Chef',
    category: 'professional-kitchen-skills',
    articleType: 'educational',
    audience: 'Culinary students, young cooks and parents considering a culinary career',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'how to become a professional chef',
    supportingKeywords: ['chef career Uganda', 'culinary training', 'kitchen discipline', 'chef skills', 'professional attitude'],
    description: 'The habits, attitudes and skills that help cooks grow into professional chefs — from punctuality and teamwork to learning from mistakes.',
    headings: ['Skill is learned through repetition', 'Time, cleanliness and standards', 'Teamwork and communication', 'Taking feedback', 'Looking after yourself', 'Training and next steps'],
    photographs: ['A trainee being coached at a station', 'A clean, organised station at the end of service', 'A team briefing before service'],
    internalLinks: ['cooking', 'about', 'enquiry', 'article:how-a-kitchen-brigade-works'],
    references: [],
    reviewNotes: ['This article relies on Chef Peter’s own perspective. Any personal story or quotation must be written or approved by him.'],
  },
  {
    slug: 'ingredient-substitution-guide',
    slot: 27,
    title: 'Ingredient Substitution: How to Swap Ingredients Without Ruining a Dish',
    category: 'ingredients-and-food-science',
    articleType: 'ingredient_guide',
    audience: 'Home cooks and bakers; cooks adapting international recipes to local ingredients',
    searchIntent: 'Solve a problem',
    mainKeyword: 'ingredient substitutes',
    supportingKeywords: ['buttermilk substitute', 'egg substitute in baking', 'cake flour substitute', 'substituting fresh and dried herbs', 'local substitutes for imported ingredients'],
    description: 'How to choose a substitute by understanding what the original ingredient does — with reliable swaps for baking and cooking, and the ones to avoid.',
    headings: ['First ask: what does this ingredient do?', 'Safe swaps in cooking', 'Why baking substitutions are riskier', 'Reliable baking substitutes', 'Local alternatives to imported ingredients', 'Substitutions to avoid'],
    photographs: ['Milk with lemon juice as a buttermilk substitute', 'Fresh and dried herbs side by side', 'Local and imported ingredients compared'],
    internalLinks: ['cooking', 'baking', 'article:fat-sugar-and-eggs-in-baking', 'article:why-cakes-fail'],
    references: [REF.figoni, REF.mcgee],
    reviewNotes: ['Each substitution must be checked against a cited source or tested before publishing; do not state that Chef Peter tested it unless he did.'],
  },
  {
    slug: 'preserving-traditional-food-knowledge',
    slot: 28,
    title: 'Why Preserving Traditional Food Knowledge Matters',
    category: 'food-history-and-culinary-culture',
    articleType: 'food_history',
    audience: 'Educators, cooks, families and culture enthusiasts',
    searchIntent: 'Learn (informational)',
    mainKeyword: 'traditional food knowledge',
    supportingKeywords: ['indigenous food knowledge', 'traditional cooking methods', 'Ugandan traditional foods', 'food heritage', 'recording family recipes'],
    description: 'Why traditional recipes and food skills are at risk, what is lost when they disappear, and practical ways families, schools and chefs can record and share them.',
    headings: ['What counts as traditional food knowledge', 'Why it is disappearing', 'Food, identity and nutrition', 'How to record a family recipe properly', 'The role of chefs and schools'],
    photographs: ['An elder teaching a young cook', 'Millet and sorghum at a market', 'A handwritten family recipe'],
    internalLinks: ['about', 'recipeBook', 'library', 'article:matooke-history-and-culture-uganda'],
    references: ['Editor to source: FAO or academic publications on indigenous and traditional food systems.'],
    reviewNotes: ['Any community knowledge should be credited to its source and shared with permission.'],
  },
];

/** Slugs of the proposals that have a full draft in drafts.ts */
export const DRAFTED_SLUGS = ['mise-en-place-professional-kitchen', 'cross-contamination-in-the-kitchen', 'how-yeast-works-in-bread', 'why-cakes-fail'];

// ── Schedule ──────────────────────────────────────────────────────────────────
/** First publishing day (a Tuesday). Articles go out on Tuesdays and Fridays. */
export const CALENDAR_START = '2026-11-17';
/** Mondays of weeks with no publishing (end-of-year break). */
export const BREAK_WEEKS = ['2026-12-21', '2026-12-28'];

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Suggested publishing date (YYYY-MM-DD, Kampala) for a slot: Tuesday/Friday, skipping break weeks. */
export function suggestedDate(slot: number): string {
  let weekStartTuesday = CALENDAR_START;
  let remaining = slot;
  for (;;) {
    const monday = addDays(weekStartTuesday, -1);
    if (!BREAK_WEEKS.includes(monday)) {
      if (remaining <= 2) return remaining === 1 ? weekStartTuesday : addDays(weekStartTuesday, 3);
      remaining -= 2;
    }
    weekStartTuesday = addDays(weekStartTuesday, 7);
  }
}
