/**
 * Structured recipe / tutorial data stored in articles.recipe (JSONB).
 *
 * Every field is optional. Quantities are free text so authors can write
 * "1½", "2–3" or "to taste" exactly as they would in a cookbook.
 */
import type { ArticleType } from './articleTypes';

export interface RecipeIngredient {
  /** Optional sub-heading, e.g. "For the sauce" */
  group?: string;
  quantity?: string;
  unit?: string;
  item: string;
  /** e.g. "finely chopped" */
  note?: string;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface RecipeData {
  version?: 1;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  /** If omitted, prep + cook is shown */
  total_minutes?: number | null;
  servings?: number | null;
  /** Free-text yield, e.g. "12 croissants" or "1 × 20 cm cake" */
  yield?: string;
  difficulty?: Difficulty | null;
  ingredients?: RecipeIngredient[];
  equipment?: string[];
  /** Preparation steps (mise en place) */
  preparation?: string[];
  /** Cooking / baking method steps */
  method?: string[];
  chef_notes?: string;
  storage?: string;
  allergens?: string[];
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Common allergens offered as quick choices in the CMS. */
export const COMMON_ALLERGENS = [
  'Gluten (wheat)', 'Milk', 'Eggs', 'Peanuts (groundnuts)', 'Tree nuts', 'Soya', 'Fish', 'Shellfish', 'Sesame', 'Celery', 'Mustard', 'Sulphites',
];

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/**
 * Cleans untrusted JSON (from the database or the editor) into RecipeData.
 * Unknown keys are dropped; blank entries are removed.
 * Returns null when nothing meaningful remains.
 */
export function normaliseRecipe(raw: unknown): RecipeData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const ingredients: RecipeIngredient[] = Array.isArray(r.ingredients)
    ? r.ingredients
        .map((i): RecipeIngredient | null => {
          if (!i || typeof i !== 'object') return null;
          const o = i as Record<string, unknown>;
          const item = str(o.item);
          if (!item) return null;
          const out: RecipeIngredient = { item };
          if (str(o.group)) out.group = str(o.group);
          if (str(o.quantity)) out.quantity = str(o.quantity);
          if (str(o.unit)) out.unit = str(o.unit);
          if (str(o.note)) out.note = str(o.note);
          return out;
        })
        .filter((i): i is RecipeIngredient => i !== null)
    : [];

  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(str(r.difficulty))
    ? (str(r.difficulty) as Difficulty)
    : null;

  const data: RecipeData = {
    version: 1,
    prep_minutes: num(r.prep_minutes),
    cook_minutes: num(r.cook_minutes),
    total_minutes: num(r.total_minutes),
    servings: num(r.servings),
    yield: str(r.yield) || undefined,
    difficulty,
    ingredients,
    equipment: strList(r.equipment),
    preparation: strList(r.preparation),
    method: strList(r.method),
    chef_notes: str(r.chef_notes) || undefined,
    storage: str(r.storage) || undefined,
    allergens: strList(r.allergens),
  };

  return hasRecipeContent(data) ? data : null;
}

export function hasRecipeContent(r: RecipeData | null | undefined): boolean {
  if (!r) return false;
  return Boolean(
    r.prep_minutes || r.cook_minutes || r.total_minutes || r.servings || r.yield || r.difficulty ||
      r.ingredients?.length || r.equipment?.length || r.preparation?.length || r.method?.length ||
      r.chef_notes || r.storage || r.allergens?.length,
  );
}

export function totalMinutes(r: RecipeData): number | null {
  if (r.total_minutes) return r.total_minutes;
  const sum = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  return sum > 0 ? sum : null;
}

/** "1 hr 15 min", "45 min" */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

/** ISO 8601 duration for schema.org, e.g. PT1H15M */
export function isoDuration(minutes: number | null | undefined): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

export function ingredientText(i: RecipeIngredient): string {
  return [i.quantity, i.unit, i.item].filter(Boolean).join(' ') + (i.note ? `, ${i.note}` : '');
}

/**
 * A recipe qualifies for Recipe structured data only when it is a 'recipe'
 * type article with at least one ingredient and at least one instruction.
 * Tutorials, guides and history features never emit Recipe markup.
 */
export function qualifiesForRecipeSchema(type: ArticleType, r: RecipeData | null | undefined): r is RecipeData {
  return type === 'recipe' && !!r && (r.ingredients?.length ?? 0) > 0 && ((r.preparation?.length ?? 0) + (r.method?.length ?? 0)) > 0;
}

export interface RecipeSchemaInput {
  name: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  authorName: string;
  datePublished?: string | null;
  category?: string | null;
  keywords?: string[];
}

/** schema.org Recipe JSON-LD. Call only when qualifiesForRecipeSchema() is true. */
export function buildRecipeJsonLd(input: RecipeSchemaInput, r: RecipeData): Record<string, unknown> {
  const steps = [...(r.preparation ?? []), ...(r.method ?? [])];
  const total = totalMinutes(r);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: input.name,
    description: input.description,
    url: input.url,
    author: { '@type': 'Person', name: input.authorName },
    recipeIngredient: (r.ingredients ?? []).map(ingredientText),
    recipeInstructions: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
  };
  if (input.imageUrl) ld.image = [input.imageUrl];
  if (input.datePublished) ld.datePublished = input.datePublished;
  if (input.category) ld.recipeCategory = input.category;
  if (input.keywords?.length) ld.keywords = input.keywords.join(', ');
  if (r.prep_minutes) ld.prepTime = isoDuration(r.prep_minutes);
  if (r.cook_minutes) ld.cookTime = isoDuration(r.cook_minutes);
  if (total) ld.totalTime = isoDuration(total);
  if (r.yield || r.servings) ld.recipeYield = r.yield || `${r.servings} servings`;
  return ld;
}
