/**
 * Structured data (schema.org JSON-LD) — single source of truth.
 *
 * Every page describes the same few entities with stable @id values, so
 * search engines can connect them:
 *
 *   #website  WebSite        — chefpetertheteacher.com
 *   #chef-peter  Person      — Chef Peter the Teacher
 *   #dechosen  Organization  — De'Chosen Events Consultants (founded by Chef Peter)
 *   /culinary-books#<id>  Book — each published book
 *
 * The full description of an entity appears once (site-wide graph in
 * index.html, injected at build time); page-level data refers to it by @id.
 *
 * Accuracy rules: only facts already published on the site are used. No
 * ratings, prices, ISBNs, dates or awards that have not been confirmed.
 * Pure data — safe in the browser, in the prerender and in Node scripts.
 */
import { CHEF_PROFILE } from '../../data/chefProfile';
import { PUBLISHED_BOOKS } from '../../data/booksData';
import { BOOK_SUBJECT_AREAS } from '../../data/siteContent';
import type { SeoPage } from '../../data/seoPages';

export const SITE_URL = 'https://www.chefpetertheteacher.com';
export const SITE_NAME = 'Chef Peter the Teacher';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/chef-peter.jpg`;
/** Natural size of the default share image (public/images/chef-peter.jpg) */
export const DEFAULT_OG_IMAGE_SIZE = { width: 1365, height: 768 };

export const IDS = {
  website: `${SITE_URL}/#website`,
  person: `${SITE_URL}/#chef-peter`,
  organization: `${SITE_URL}/#dechosen`,
  book: (id: string) => `${SITE_URL}/culinary-books#${id}`,
};

type Json = Record<string, unknown>;

const ref = (id: string) => ({ '@id': id });

/** Topics Chef Peter teaches and advises on (from his published competencies). */
const KNOWS_ABOUT = [
  'Culinary training',
  'Baking and pastry',
  'Commercial bakery production',
  'Professional cooking techniques',
  'International cuisine',
  'Ugandan and African cuisine',
  'Menu engineering and food costing',
  'Kitchen operations and workflow',
  'Food safety and hygiene (HACCP)',
  'Hospitality consultancy',
  'Private chef services',
  'Event catering',
];

export function websiteNode(): Json {
  return {
    '@type': 'WebSite',
    '@id': IDS.website,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: 'Professional chef, culinary educator and hospitality consultant in Kampala, Uganda — services, published books and a culinary education library.',
    inLanguage: 'en',
    publisher: ref(IDS.person),
  };
}

export function personNode(): Json {
  const c = CHEF_PROFILE.contactDetails;
  return {
    '@type': 'Person',
    '@id': IDS.person,
    name: SITE_NAME,
    alternateName: 'Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa',
    jobTitle: 'Chef, culinary educator and hospitality consultant',
    description:
      'Professional chef, culinary educator and founder of De’Chosen Events Consultants in Kampala, Uganda. He teaches practical cooking and baking, advises hotels, lodges and caterers, and is the author of three culinary books.',
    url: `${SITE_URL}/about-chef-peter`,
    image: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_SIZE },
    email: `mailto:${c.email}`,
    telephone: c.phoneRaw,
    address: { '@type': 'PostalAddress', addressLocality: 'Kampala', addressCountry: 'UG' },
    worksFor: ref(IDS.organization),
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Makerere University Business School' },
    knowsAbout: KNOWS_ABOUT,
    sameAs: ['https://www.linkedin.com/in/yiga-edward-peter-49b09b433/'],
  };
}

export function organizationNode(): Json {
  const c = CHEF_PROFILE.contactDetails;
  return {
    '@type': 'Organization',
    '@id': IDS.organization,
    name: CHEF_PROFILE.companyName,
    description: 'Culinary services, hospitality and events consultancy, and culinary and baking training, founded by Chef Peter the Teacher.',
    founder: ref(IDS.person),
    email: `mailto:${c.email}`,
    telephone: c.phoneRaw,
    address: { '@type': 'PostalAddress', addressLocality: 'Kampala', addressCountry: 'UG' },
    areaServed: { '@type': 'Country', name: 'Uganda' },
  };
}

/** Site-wide graph: injected into index.html at build time (every page). */
export function siteGraph(): Json {
  return { '@context': 'https://schema.org', '@graph': [websiteNode(), personNode(), organizationNode()] };
}

export function bookNodes(): Json[] {
  return PUBLISHED_BOOKS.map((b) => ({
    '@type': 'Book',
    '@id': IDS.book(b.id),
    name: b.title,
    alternativeHeadline: b.subtitle,
    description: b.description,
    author: ref(IDS.person),
    url: `${SITE_URL}/culinary-books#${b.id}`,
    image: `${SITE_URL}${b.coverImage}`,
    inLanguage: 'en',
    genre: BOOK_SUBJECT_AREAS[b.id],
    audience: { '@type': 'Audience', audienceType: b.targetAudience },
  }));
}

export function breadcrumbNode(items: Array<{ name: string; path?: string }>): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path !== undefined ? { item: `${SITE_URL}${it.path}` } : {}),
    })),
  };
}

/** Homepage: the books (on the page) — the identity graph comes from index.html. */
export function homeGraph(): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        isPartOf: ref(IDS.website),
        about: ref(IDS.person),
        primaryImageOfPage: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
      },
      ...bookNodes(),
    ],
  };
}

const SERVICE_TYPES: Record<string, string> = {
  '/private-chef-uganda': 'Private chef services',
  '/culinary-consultant-uganda': 'Culinary consultancy',
  '/cooking-classes-kampala': 'Culinary training',
  '/baking-pastry-classes': 'Baking and pastry training',
  '/hospitality-consultancy': 'Hospitality consultancy',
};

/** Structured data for an SEO landing page (rendered in the page and prerendered). */
export function landingGraph(page: SeoPage): Json {
  const url = `${SITE_URL}${page.path}`;
  const graph: Json[] = [];

  if (page.path === '/about-chef-peter') {
    graph.push({
      '@type': 'ProfilePage',
      '@id': `${url}#webpage`,
      url,
      name: page.metaTitle,
      description: page.description,
      isPartOf: ref(IDS.website),
      mainEntity: ref(IDS.person),
    });
  } else if (page.path === '/culinary-books') {
    graph.push(
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: page.metaTitle,
        description: page.description,
        isPartOf: ref(IDS.website),
        about: ref(IDS.person),
        mainEntity: { '@type': 'ItemList', itemListElement: PUBLISHED_BOOKS.map((b, i) => ({ '@type': 'ListItem', position: i + 1, item: ref(IDS.book(b.id)) })) },
      },
      ...bookNodes(),
    );
  } else {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: page.title,
      serviceType: SERVICE_TYPES[page.path] ?? page.title,
      description: page.description,
      url,
      provider: ref(IDS.person),
      brand: ref(IDS.organization),
      areaServed: { '@type': 'Country', name: 'Uganda' },
      audience: { '@type': 'Audience', audienceType: page.audience.join('; ') },
    });
  }

  if (page.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
  }
  graph.push(breadcrumbNode([{ name: 'Home', path: '/' }, { name: page.title }]));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Serialise JSON-LD safely for embedding in HTML. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/**
 * Document title for an article: "<title> | Chef Peter the Teacher", shortened
 * to "| Chef Peter" or no suffix when the full title would be truncated in
 * search results (~65 characters). Mirrored in middleware.ts.
 */
export function articleDocumentTitle(title: string): string {
  const t = title.trim();
  for (const suffix of [` | ${SITE_NAME}`, ' | Chef Peter']) if ((t + suffix).length <= 65) return t + suffix;
  return t;
}
