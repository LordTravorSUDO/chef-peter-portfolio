/**
 * Internal links between Chef Peter's biography, services, books, the
 * Culinary Library and enquiries.
 *
 * Every link points to a page that always exists (a prerendered landing
 * page, a book section on /culinary-books, the library or the homepage
 * enquiry form). Category pages are not linked from here because a
 * category may have no published articles.
 *
 * Descriptions describe what is on the target page; they make no new claims.
 */
import { headingId } from '../lib/knowledge/articleHtml';

export interface InternalLink {
  href: string;
  label: string;
  description: string;
}

/** Anchor of a book's section on /culinary-books (matches the Book structured data URL). */
export const bookAnchor = (bookTitle: string) => `/culinary-books#${headingId(bookTitle)}`;

export const LINKS = {
  about: { href: '/about-chef-peter', label: 'About Chef Peter', description: 'Career, qualifications, countries of work and published books.' },
  books: { href: '/culinary-books', label: 'Culinary books', description: 'Chef Peter’s three books on baking, international recipes and cooking technique.' },
  library: { href: '/articles', label: 'The Culinary Library', description: 'Free lessons, techniques and recipes from Chef Peter the Teacher.' },
  cooking: { href: '/cooking-classes-kampala', label: 'Cooking classes in Kampala', description: 'Practical, hands-on training in core culinary skills and kitchen theory.' },
  baking: { href: '/baking-pastry-classes', label: 'Baking and pastry classes', description: 'Bread, cakes, pastry and commercial bakery training.' },
  consultant: { href: '/culinary-consultant-uganda', label: 'Culinary consultancy', description: 'Menu development, kitchen systems and staff training for food businesses.' },
  hospitality: { href: '/hospitality-consultancy', label: 'Hospitality consultancy', description: 'Operational reviews, standards, SOPs and follow-up for hospitality businesses.' },
  privateChef: { href: '/private-chef-uganda', label: 'Private chef services', description: 'Private dining for homes, villas, offices and special occasions.' },
  bakerBook: { href: bookAnchor('Secrets of a Successful Baker'), label: 'Secrets of a Successful Baker', description: 'Chef Peter’s book on commercial and artisanal baking techniques.' },
  recipeBook: { href: bookAnchor('Inter-Continental Recipe Book'), label: 'Inter-Continental Recipe Book', description: 'Chef Peter’s book of international recipes for professional kitchens.' },
  techniqueBook: { href: bookAnchor('In 1000 Ways and More I Cooked'), label: 'In 1000 Ways and More I Cooked', description: 'Chef Peter’s book on culinary techniques, flavour and menu creation.' },
  enquiry: { href: '/#contact', label: 'Send an enquiry', description: 'Ask about training, consultancy, private dining or the books.' },
} satisfies Record<string, InternalLink>;

export type LinkKey = keyof typeof LINKS;

/** "Explore more" links for each landing page (the page itself is never listed). */
export const LANDING_RELATED: Record<string, LinkKey[]> = {
  '/private-chef-uganda': ['about', 'cooking', 'recipeBook', 'library'],
  '/culinary-consultant-uganda': ['hospitality', 'cooking', 'about', 'books'],
  '/cooking-classes-kampala': ['baking', 'techniqueBook', 'library', 'about'],
  '/baking-pastry-classes': ['bakerBook', 'cooking', 'library', 'about'],
  '/hospitality-consultancy': ['consultant', 'cooking', 'about', 'books'],
  '/about-chef-peter': ['cooking', 'consultant', 'books', 'library'],
  '/culinary-books': ['about', 'baking', 'cooking', 'library'],
};

export function landingRelatedLinks(path: string): InternalLink[] {
  return (LANDING_RELATED[path] ?? ['about', 'books', 'library']).map((k) => LINKS[k]).filter((l) => l.href !== path);
}

/** Training, consultancy and book links that match an article's categories. */
const CATEGORY_LINKS: Record<string, LinkKey[]> = {
  'pastry-and-bakery': ['baking', 'bakerBook'],
  'international-cuisines': ['recipeBook', 'cooking'],
  'professional-cooking-techniques': ['cooking', 'techniqueBook'],
  'ingredients-and-food-science': ['cooking', 'bakerBook'],
  'food-safety-and-hygiene': ['hospitality', 'consultant'],
  'professional-kitchen-skills': ['consultant', 'cooking'],
  'food-history-and-culinary-culture': ['recipeBook', 'about'],
};

/** Up to `max` distinct links for the given category slugs (primary first), always ending with About. */
export function articleLearningLinks(categorySlugs: string[], max = 3): InternalLink[] {
  const keys: LinkKey[] = [];
  for (const slug of categorySlugs) for (const k of CATEGORY_LINKS[slug] ?? []) if (!keys.includes(k)) keys.push(k);
  if (keys.length === 0) keys.push('cooking', 'books');
  const picked = keys.slice(0, max - 1);
  if (!picked.includes('about')) picked.push('about');
  return picked.map((k) => LINKS[k]);
}
