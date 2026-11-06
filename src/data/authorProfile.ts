// =============================================================================
// APPROVED AUTHOR PROFILE — Chef Peter the Teacher
// -----------------------------------------------------------------------------
// The single default source for Chef Peter's public author biography and photo.
// Used by article pages, the library and the CMS preview whenever no profile
// has been saved in the CMS (CMS → Author profile). Once the proposed
// author_profiles table exists and a profile is saved there, the saved
// version is shown instead.
//
// The wording only uses information already in his professional profile.
// =============================================================================

export interface AuthorProfileView {
  name: string;
  jobTitle: string | null;
  shortBio: string | null;
  longBio: string | null;
  photoUrl: string | null;
  photoAlt: string;
  profileUrl: string | null;
  /** 'cms' = saved in the CMS; 'default' = this file; 'generic' = name only */
  source: 'cms' | 'default' | 'generic';
}

export const DEFAULT_AUTHOR: AuthorProfileView = {
  name: 'Chef Peter the Teacher',
  jobTitle: 'Professional chef, culinary educator and hospitality consultant',
  shortBio:
    'Professional chef, culinary educator and founder of De’Chosen Events Consultants in Kampala. Chef Peter teaches practical cooking and baking, advises hotels, lodges and caterers, and is the author of three culinary books.',
  longBio:
    'Chef Peter the Teacher is a professional chef, culinary educator and founder of De’Chosen Events Consultants in Kampala, Uganda. His experience spans hotel kitchens, in-flight and high-volume catering, lodges, private households and international assignments in East and Central Africa, the Horn of Africa and the Gulf. He teaches practical cooking and baking classes and is the author of three culinary books. The Culinary Library shares the practical knowledge he teaches in his classes.',
  photoUrl: '/images/chef-peter.jpg',
  photoAlt: 'Chef Peter the Teacher',
  profileUrl: '/about-chef-peter',
  source: 'default',
};

/** True when a byline refers to Chef Peter (so the approved profile applies). */
export const isChefPeterByline = (name: string | null | undefined) => !name || /chef\s*peter|peter the teacher/i.test(name);
