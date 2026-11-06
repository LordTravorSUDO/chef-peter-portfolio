/**
 * Editorial calendar ↔ CMS.
 *
 * Creates a DRAFT article from a calendar proposal. It never publishes or
 * schedules: the administrator reviews, edits and schedules the draft in the
 * article editor, which refuses to publish while editorial notes remain.
 */
import { supabase } from '../supabase';
import type { ArticleProposal } from '../../data/editorial/calendar';
import { draftContent } from '../editorial/draftFromProposal';
import { createArticle, sanitiseHtml, isSlugAvailable } from './articles';
import { getCategories, setArticleCategories } from './taxonomy';
import { hasKnowledgeSchema } from './knowledgeSchema';
import type { ArticleStatus } from '../../types/database';

export interface CalendarArticleState {
  id: string;
  slug: string;
  status: ArticleStatus;
  scheduled_for: string | null;
  published_at: string | null;
  updated_at: string;
}

/** CMS articles whose slug matches a calendar proposal (admin RLS sees every status). */
export async function getCalendarArticles(slugs: string[]): Promise<Record<string, CalendarArticleState>> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, status, scheduled_for, published_at, updated_at')
    .in('slug', slugs);
  if (error) throw new Error(`Could not load the calendar articles: ${error.message}`);
  return Object.fromEntries(((data ?? []) as CalendarArticleState[]).map((a) => [String(a.slug).toLowerCase(), a]));
}

/** Creates the draft and assigns its category. Returns the new article id. */
export async function createDraftFromProposal(
  proposal: ArticleProposal,
  author: { id: string; displayName: string },
): Promise<string> {
  if (!(await isSlugAvailable(proposal.slug))) {
    throw new Error(`An article with the address “${proposal.slug}” already exists. Open it from the Articles page instead.`);
  }
  const c = draftContent(proposal);
  const knowledge = await hasKnowledgeSchema();
  const id = await createArticle({
    title: c.title,
    slug: c.slug,
    excerpt: c.excerpt,
    body: sanitiseHtml(c.body),
    featured_image_id: null,
    social_image_id: null,
    seo_title: null,
    meta_description: c.meta_description,
    canonical_url: null,
    noindex: false,
    status: 'draft',
    published_at: null,
    scheduled_for: null,
    author_id: author.id,
    author_display_name: author.displayName,
    ...(knowledge ? { article_type: c.article_type } : {}),
  });
  // Category is optional: if it does not exist yet the draft is still created
  const category = (await getCategories()).find((cat) => cat.slug === proposal.category);
  if (category) {
    try {
      await setArticleCategories(id, [{ categoryId: category.id, isPrimary: true }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      throw new Error(`The draft was created, but its category could not be set: ${msg}`);
    }
  }
  return id;
}
