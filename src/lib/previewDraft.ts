/**
 * Preview of unsaved changes.
 *
 * When the editor's Preview button is pressed, the current (possibly unsaved)
 * editor state is stored in this browser's localStorage under the article id.
 * The preview page overlays it on the saved article, so the administrator sees
 * exactly what will be published — without saving, and therefore without
 * changing a live article. Nothing leaves the browser.
 */
import type { ArticleType } from './knowledge/articleTypes';
import type { RecipeData } from './knowledge/recipe';

export interface PreviewDraft {
  savedAt: number;
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  featuredImage: { storage_path: string; alt_text: string | null } | null;
  primaryCategory: { name: string; slug: string } | null;
  tags: string[];
  articleType?: ArticleType;
  recipe?: RecipeData;
}

const KEY = (id: string) => `cms-preview-draft:${id}`;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function savePreviewDraft(id: string, draft: Omit<PreviewDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(KEY(id), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* storage unavailable (private mode / full): preview falls back to the saved version */
  }
}

export function readPreviewDraft(id: string): PreviewDraft | null {
  try {
    const raw = localStorage.getItem(KEY(id));
    if (!raw) return null;
    const draft = JSON.parse(raw) as PreviewDraft;
    if (!draft || typeof draft.savedAt !== 'number' || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY(id));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearPreviewDraft(id: string): void {
  try {
    localStorage.removeItem(KEY(id));
  } catch {
    /* ignore */
  }
}
