// =============================================================================
// HOMEPAGE PRESENTATION CONTENT
// -----------------------------------------------------------------------------
// This file re-presents Chef Peter's EXISTING professional information
// (src/data/chefProfile.ts, booksData.ts and seoPages.ts) in a calmer,
// visitor-friendly voice. Nothing here introduces new employers, countries,
// qualifications, figures, awards or quotations.
//
// `review` fields mark information that Chef Peter must supply or approve.
// They are shown only in content review mode (?review=content) — see
// src/components/site/ReviewNote.tsx and docs/CONTENT_REVIEW.md.
// The original data files are unchanged and remain the source records.
// =============================================================================

export interface StoryParagraph {
  /** Short theme label shown beside the paragraph on large screens */
  theme: string;
  text: string;
  review?: string;
}

export const HERO = {
  eyebrow: 'Chef · Culinary educator · Hospitality consultant',
  lead:
    'A professional chef and teacher based in Kampala, Uganda. Chef Peter runs practical cooking and baking classes, cooks for private clients, and helps hotels, lodges and caterers build kitchens that work — drawing on experience in hotel, in-flight and international kitchens.',
  trustPoints: [
    'Founder of De’Chosen Events Consultants',
    'Kitchen experience in Uganda, elsewhere in Africa and the Gulf',
    'Author of three culinary books',
  ],
};

export const STORY = {
  eyebrow: 'Meet Chef Peter',
  title: 'Cooking, teaching and the discipline in between',
  intro: 'Most people know me as Chef Peter the Teacher. This is how I came to the work I do today.',
  reviewIntro:
    'This biography is written in Chef Peter’s own voice using only the information already in his professional profile. Please read every paragraph and approve or correct the wording.',
  paragraphs: [
    {
      theme: 'Beginnings',
      text:
        'My journey into the culinary arts has been driven by purpose. Over the years I have come to see cooking as more than a profession: it is a discipline that asks for precision, patience, curiosity and respect for culinary tradition.',
      review:
        'Add how and where your culinary journey began — your first kitchen, training or mentor — and the year you started, so the story opens with your own experience.',
    },
    {
      theme: 'Professional kitchens',
      text:
        'I learned my craft in working kitchens: hotel kitchens and banquet operations with the Imperial and Speke groups of hotels, in-flight catering with Newrest Uganda, large-scale catering for a UN base, lodge kitchens such as Calm Waters Eco Lodge, and private households. That variety taught me to understand both the creative and the operational sides of food service.',
      review: 'Confirm the order of these roles and the approximate years for each.',
    },
    {
      theme: 'International experience',
      text:
        'My work has also taken me beyond Uganda — to the Democratic Republic of the Congo, Kenya, South Sudan, the United Arab Emirates, Cameroon and Bosaso in Puntland. There I trained household chefs and kitchen teams, developed menus for private clients and worked in high-volume operations where food safety cannot be compromised. I bring those standards home while promoting Ugandan ingredients and culinary heritage.',
    },
    {
      theme: 'Baking & pastry',
      text:
        'Baking and pastry hold a special place in my work. I practise and teach commercial and artisanal baking — breads and sourdough, laminated pastries, confectionery and wedding cakes — and I help bakery teams build reliable recipes and production routines.',
    },
    {
      theme: 'Teaching',
      text:
        'The name “Chef Peter the Teacher” grew out of years of hands-on classes. I teach individuals, private household chefs, commercial bakery teams and aspiring chefs. My teaching is practical, disciplined and encouraging: learners prepare real products, understand the theory behind each technique, and build the habits of safety, consistency and organisation that a professional kitchen demands.',
      review: 'Add one or two sentences, in your own words, about why teaching matters to you personally.',
    },
    {
      theme: 'Books',
      text:
        'To preserve what I have learned, I have written three books — Secrets of a Successful Baker, the Inter-Continental Recipe Book and In 1000 Ways and More I Cooked — for students, bakers, cooks and hospitality professionals who want practical knowledge they can use in the kitchen.',
    },
    {
      theme: 'Vision',
      text:
        'Today I lead De’Chosen Events Consultants, through which I provide culinary services, consultancy and training. My aim is to strengthen African hospitality through skills, systems and mentorship, and to help the next generation of cooks and bakers build professional careers.',
    },
  ] as StoryParagraph[],
  /** Existing quotation from the profile (StorySection). Awaiting confirmation. */
  pullQuote: 'Cooking is an exact discipline. True culinary art lives where tradition meets scientific precision.',
  pullQuoteReview: 'Confirm that this quotation is in your own words, or provide a replacement.',
  facts: [
    { label: 'Based in', value: 'Kampala, Uganda' },
    { label: 'Company', value: 'Founder, De’Chosen Events Consultants' },
    { label: 'Experience', value: 'Uganda, DR Congo, Kenya, South Sudan, UAE, Cameroon and Puntland' },
    { label: 'Education', value: 'Bachelor’s degree, Makerere University Business School' },
    { label: 'Publications', value: 'Three culinary books' },
  ],
  factsReview:
    'Confirm your total years of experience (the homepage previously said 15+, the About page says 20+) and the full title of your MUBS degree.',
};

// -----------------------------------------------------------------------------
// CAREER — organised for employers, clients, students and collaborators.
// Derived from CHEF_PROFILE.experiences and CHEF_PROFILE.locations.
// -----------------------------------------------------------------------------
export interface CareerOrganisation {
  name: string;
  location: string;
}

export interface CareerEntry {
  id: string;
  sector: string;
  role: string;
  organisations: CareerOrganisation[];
  summary: string;
  responsibilities: string[];
  review?: string;
}

export const CAREER: CareerEntry[] = [
  {
    id: 'dechosen-founder',
    sector: 'Leadership & consultancy',
    role: 'Founder & Lead Hospitality Consultant',
    organisations: [{ name: 'De’Chosen Events Consultants', location: 'Kampala, Uganda' }],
    summary:
      'Leads hospitality advisory, event culinary production and structured culinary and baking training programmes in East Africa.',
    responsibilities: [
      'Hospitality and event advisory for hotels, lodges and private clients',
      'Event catering planning and culinary production',
      'Hands-on culinary and baking classes for students, bakery staff and private chefs',
    ],
    review: 'Confirm the year De’Chosen Events Consultants was founded.',
  },
  {
    id: 'calm-waters',
    sector: 'Hotels & lodges',
    role: 'Lead Culinary Consultant',
    organisations: [{ name: 'Calm Waters Eco Lodge', location: 'Uganda' }],
    summary:
      'Directs culinary operations, menu development and service standards for the lodge’s guest dining.',
    responsibilities: [
      'Farm-to-table menus that combine local Ugandan dishes with international cooking',
      'Standardised kitchen operations and food-cost control',
    ],
    review: 'Confirm dates and whether this role is current.',
  },
  {
    id: 'hotel-groups',
    sector: 'Hotels & lodges',
    role: 'Hotel kitchen and banquet operations',
    organisations: [
      { name: 'Imperial Group of Hotels', location: 'Uganda' },
      { name: 'Speke Group of Hotels', location: 'Uganda' },
    ],
    summary: 'Worked in the kitchen divisions of two of Uganda’s established hotel groups.',
    responsibilities: [
      'Banquet production and fine-dining kitchens',
      'Service for VIP guests and events',
    ],
    review: 'Confirm your job title and years at each hotel group.',
  },
  {
    id: 'aviation-institutional',
    sector: 'In-flight & high-volume catering',
    role: 'Senior Culinary & In-Flight Operations Specialist',
    organisations: [
      { name: 'Newrest Uganda In-Flights', location: 'Uganda' },
      { name: 'UN base catering operations', location: 'South Sudan' },
      { name: 'Visit Africa Uganda (Watoto Ltd)', location: 'Uganda' },
    ],
    summary:
      'Large-scale and secure catering operations with strict food-safety requirements, and Ugandan culinary experiences for international visitors.',
    responsibilities: [
      'Airline meal preparation to international in-flight catering standards',
      'High-volume kitchen logistics for a UN base, following international hygiene and HACCP practice',
      'Traditional Ugandan food experiences for international guests and delegations',
    ],
    review:
      'Confirm your title at each organisation, the years, and the correct way to name the UN base operation (mission or contractor).',
  },
  {
    id: 'puntland',
    sector: 'International assignments',
    role: 'Culinary operations — port and workforce catering',
    organisations: [
      { name: 'Green Castle International', location: 'Bosaso, Puntland' },
      { name: 'DP World — Bosaso Port operations', location: 'Bosaso, Puntland' },
    ],
    summary: 'Managed high-volume dining for a multinational workforce at Bosaso Port.',
    responsibilities: [
      'Workforce dining systems for multinational teams',
      'Food-safety protocols for high-volume production',
    ],
    review: 'Confirm your job title, years and permission to name DP World.',
  },
  {
    id: 'global-specialist',
    sector: 'International assignments',
    role: 'International Culinary Specialist & Trainer',
    organisations: [
      { name: 'Private families, hotels and institutions', location: 'DR Congo, Kenya, South Sudan, UAE, Cameroon' },
    ],
    summary:
      'Culinary training, custom menu development and kitchen management for private families, hotels and institutions in Central and East Africa and the Gulf.',
    responsibilities: [
      'Training private household chefs and kitchen supervisors',
      'International menus tailored to clients’ dietary and cultural requirements',
      'Kitchen audits and staff development',
    ],
    review:
      'Confirm the countries, years and approximate number of chefs trained (the previous site stated “50+ across 5 countries”).',
  },
];

// -----------------------------------------------------------------------------
// SERVICES — six clearly distinguished pathways.
// Derived from CHEF_PROFILE.services and the SEO landing pages.
// `enquiry` is the value pre-selected in the enquiry form.
// -----------------------------------------------------------------------------
export interface ServicePathway {
  id: string;
  group: 'learn' | 'work';
  title: string;
  summary: string;
  forWhom: string;
  includes: string[];
  href: string;
  linkLabel: string;
  enquiry: string;
}

export const SERVICE_PATHWAYS: ServicePathway[] = [
  {
    id: 'culinary-education',
    group: 'learn',
    title: 'Culinary classes & training',
    summary:
      'Practical cooking classes, mainly hands-on and supported by short theory sessions on safety, ingredients and technique.',
    forWhom: 'Beginners, aspiring chefs, home cooks, household chefs and working kitchen teams',
    includes: [
      'Knife skills, stocks, sauces and core cookery methods',
      'Ugandan and international dishes',
      'Food hygiene, costing and presentation',
    ],
    href: '/cooking-classes-kampala',
    linkLabel: 'About the cooking classes',
    enquiry: 'Culinary classes & training',
  },
  {
    id: 'bakery-training',
    group: 'learn',
    title: 'Baking & pastry training',
    summary:
      'Breads, cakes, pastry and confectionery, with the ingredient science and production discipline needed for consistent results.',
    forWhom: 'Home bakers, new bakery businesses, bakery staff and culinary students',
    includes: [
      'Bread, sourdough and enriched doughs',
      'Laminated pastry, cakes and celebration-cake finishing',
      'Bakery formulas, costing and hygiene',
    ],
    href: '/baking-pastry-classes',
    linkLabel: 'About the baking classes',
    enquiry: 'Baking & pastry training',
  },
  {
    id: 'private-chef',
    group: 'work',
    title: 'Private chef services',
    summary:
      'Planned private dining at home, in a villa, office or private venue — menu, ingredients, cooking and presentation handled for you.',
    forWhom: 'Families, visitors, executives and VIP guests in Kampala, Entebbe and across Uganda',
    includes: [
      'Personalised menus with dietary needs considered',
      'Ugandan and international cuisine',
      'Household menu planning and staff guidance',
    ],
    href: '/private-chef-uganda',
    linkLabel: 'About private chef services',
    enquiry: 'Private chef services',
  },
  {
    id: 'menu-engineering',
    group: 'work',
    title: 'Menu engineering & development',
    summary:
      'Menus that are distinctive, consistent and profitable — from concept and recipe standards to costing and plating.',
    forWhom: 'Restaurants, hotels, lodges and caterers introducing or improving a menu',
    includes: [
      'Signature dishes and menu concepts',
      'Standard recipes, portions and yield analysis',
      'Food-cost and selling-price guidance',
    ],
    href: '/culinary-consultant-uganda',
    linkLabel: 'About menu and culinary consultancy',
    enquiry: 'Menu engineering & development',
  },
  {
    id: 'kitchen-consultancy',
    group: 'work',
    title: 'Culinary & kitchen consultancy',
    summary:
      'Practical support to improve food quality, workflow and food safety in commercial kitchens, including high-volume operations.',
    forWhom: 'Hotel, lodge, restaurant, bakery and institutional kitchens',
    includes: [
      'Kitchen workflow and production planning',
      'SOPs, stock control and food-safety routines',
      'Hands-on staff coaching and follow-up',
    ],
    href: '/culinary-consultant-uganda',
    linkLabel: 'About culinary consultancy',
    enquiry: 'Culinary & kitchen consultancy',
  },
  {
    id: 'hospitality-advisory',
    group: 'work',
    title: 'Hospitality & events advisory',
    summary:
      'Advice through De’Chosen Events Consultants for hospitality owners, new venues and events — from concept to opening and beyond.',
    forWhom: 'Hotel and lodge owners, investors, developers and event organisers',
    includes: [
      'Operational reviews and improvement plans',
      'Kitchen set-up, equipment and supplier selection',
      'Event catering and banquet planning',
    ],
    href: '/hospitality-consultancy',
    linkLabel: 'About hospitality consultancy',
    enquiry: 'Hospitality & events advisory',
  },
];

/** Options for the enquiry forms (contact section + modal). */
export const ENQUIRY_OPTIONS: string[] = [
  ...SERVICE_PATHWAYS.map((s) => s.enquiry),
  'Wedding cake & confectionery commission',
  'Book enquiry',
  'Something else',
];

// -----------------------------------------------------------------------------
// BOOKS — subject area for each existing book (derived from its subtitle and
// topics in booksData.ts).
// -----------------------------------------------------------------------------
export const BOOK_SUBJECT_AREAS: Record<string, string> = {
  'secrets-of-a-successful-baker': 'Baking & bakery management',
  'inter-continental-recipe-book': 'International cuisine for professional kitchens',
  'in-1000-ways-and-more-i-cooked': 'Culinary technique & menu creation',
};

export const BOOKS_REVIEW =
  'Supply the publication details for each book — publisher (or self-published), year, ISBN, format, price and how readers can obtain a copy — and confirm whether the listed topics match the actual chapters.';
