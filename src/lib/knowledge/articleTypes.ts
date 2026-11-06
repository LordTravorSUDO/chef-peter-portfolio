/**
 * Article formats for the culinary knowledge platform.
 *
 * Each format declares which optional structured sections the CMS offers
 * (`fields`) and an optional starter outline (`template`) the editor can
 * insert. Outlines contain headings and writing prompts only — never facts —
 * so the author supplies all content.
 *
 * The value is stored in articles.article_type (proposed migration).
 * Existing articles without a type are treated as 'educational'.
 */

export type ArticleType =
  | 'educational'
  | 'cooking_tutorial'
  | 'recipe'
  | 'kitchen_guide'
  | 'food_history'
  | 'ingredient_guide'
  | 'baking_tutorial'
  | 'food_safety_guide';

/** Structured sections that a format may use (see recipe.ts). */
export type StructuredField =
  | 'times'
  | 'servings'
  | 'difficulty'
  | 'ingredients'
  | 'equipment'
  | 'preparation'
  | 'method'
  | 'chef_notes'
  | 'storage'
  | 'allergens'
  | 'sections';

export interface ArticleTypeInfo {
  value: ArticleType;
  label: string;
  /** One line shown in the CMS and as a filter description */
  description: string;
  fields: StructuredField[];
  template: string;
}

const ALL_RECIPE_FIELDS: StructuredField[] = [
  'times', 'servings', 'difficulty', 'ingredients', 'equipment', 'preparation', 'method', 'chef_notes', 'storage', 'allergens', 'sections',
];

const prompt = (text: string) => `<p><em>[${text}]</em></p>`;

export const ARTICLE_TYPES: ArticleTypeInfo[] = [
  {
    value: 'educational',
    label: 'Educational article',
    description: 'Explains a culinary topic, idea or principle.',
    fields: [],
    template: [
      '<h2>Introduction</h2>', prompt('What will the reader understand by the end? Why does it matter in the kitchen?'),
      '<h2>Key ideas</h2>', prompt('Explain each idea in plain language. Define technical terms the first time you use them.'),
      '<h2>In practice</h2>', prompt('Show how this applies in a working kitchen — with an African and an international example.'),
      '<blockquote><p>Chef’s tip: [one practical tip from experience]</p></blockquote>',
      '<h2>Summary</h2>', prompt('Three or four short points the reader should remember.'),
    ].join(''),
  },
  {
    value: 'cooking_tutorial',
    label: 'Cooking tutorial',
    description: 'Teaches a technique step by step, with optional ingredients and equipment.',
    fields: ALL_RECIPE_FIELDS.filter((f) => f !== 'difficulty'),
    template: [
      '<h2>What you will learn</h2>', prompt('The technique and the result the reader should achieve.'),
      '<h2>Understanding the technique</h2>', prompt('What happens to the food and why each step matters.'),
      '<h2>Step by step</h2>', '<ol><li>[Step]</li><li>[Step]</li></ol>',
      '<h2>Common mistakes and how to fix them</h2>', prompt('Problems learners meet and their causes.'),
      '<blockquote><p>In the Ugandan kitchen: [how to apply this with locally available ingredients and equipment]</p></blockquote>',
    ].join(''),
  },
  {
    value: 'recipe',
    label: 'Recipe',
    description: 'A tested recipe with ingredients, quantities, times and method. Eligible for Recipe rich results.',
    fields: ALL_RECIPE_FIELDS,
    template: [
      '<h2>About this dish</h2>', prompt('Where the dish fits in a menu and what makes it work. Only state origins you can confirm.'),
      '<h2>Before you start</h2>', prompt('Advance preparation, ingredient substitutions available in Uganda, food-safety points.'),
      '<blockquote><p>Chef’s tip: [one practical tip]</p></blockquote>',
      '<h2>Serving suggestions</h2>', prompt('Accompaniments and presentation.'),
    ].join(''),
  },
  {
    value: 'kitchen_guide',
    label: 'Professional kitchen guide',
    description: 'Organisation, costing, systems and standards for working kitchens.',
    fields: ['equipment', 'chef_notes', 'sections'],
    template: [
      '<h2>Why this matters</h2>', prompt('The problem this guide solves for a kitchen team.'),
      '<h2>The system</h2>', prompt('Explain the method, with a worked example (figures, checklist or schedule).'),
      '<h2>Putting it into practice</h2>', '<ol><li>[Action]</li><li>[Action]</li></ol>',
      '<blockquote><p>Chef’s note: [advice for supervisors and managers]</p></blockquote>',
    ].join(''),
  },
  {
    value: 'food_history',
    label: 'Food history feature',
    description: 'The history and culture behind a dish, ingredient or tradition.',
    fields: [],
    template: [
      '<h2>Introduction</h2>', prompt('The dish or tradition and why it is interesting.'),
      '<h2>Origins</h2>', prompt('What is known — and what is uncertain. Cite sources; do not present legend as fact.'),
      '<h2>How it changed</h2>', prompt('How it travelled, adapted or is prepared today.'),
      '<h2>On the table today</h2>', prompt('Its place in Ugandan, African or international cooking now.'),
      '<h2>Sources and further reading</h2>', '<ul><li>[Source]</li></ul>',
    ].join(''),
  },
  {
    value: 'ingredient_guide',
    label: 'Ingredient guide',
    description: 'Selecting, storing and using a particular ingredient.',
    fields: ['storage', 'allergens', 'chef_notes', 'sections'],
    template: [
      '<h2>What it is</h2>', prompt('Description, varieties and local names where relevant.'),
      '<h2>Choosing good quality</h2>', prompt('What to look for at the market or from suppliers.'),
      '<h2>How to use it</h2>', prompt('Preparation methods and dishes it suits.'),
      '<blockquote><p>In the Ugandan kitchen: [local availability, seasons and substitutes]</p></blockquote>',
    ].join(''),
  },
  {
    value: 'baking_tutorial',
    label: 'Baking and pastry tutorial',
    description: 'A baking or pastry technique or product, with formula and method.',
    fields: ALL_RECIPE_FIELDS,
    template: [
      '<h2>What you will make</h2>', prompt('The product and the qualities to aim for (volume, crumb, colour, texture).'),
      '<h2>How the formula works</h2>', prompt('Role of each main ingredient; baker’s percentages if useful.'),
      '<h2>Troubleshooting</h2>', prompt('Common faults, their causes and corrections.'),
      '<blockquote><p>Chef’s tip: [practical advice, e.g. working in a warm kitchen]</p></blockquote>',
    ].join(''),
  },
  {
    value: 'food_safety_guide',
    label: 'Food safety guide',
    description: 'Safe handling, storage, hygiene and temperature control.',
    fields: ['equipment', 'chef_notes', 'sections'],
    template: [
      '<h2>The risk</h2>', prompt('What can go wrong and why. Use recognised guidance only.'),
      '<h2>Safe practice</h2>', '<ol><li>[Step]</li><li>[Step]</li></ol>',
      '<blockquote><p>Safety note: [the critical point to remember]</p></blockquote>',
      '<h2>Checklist</h2>', '<ul><li>[Check]</li></ul>',
      '<h2>Sources</h2>', prompt('Cite the food-safety authority or standard used (e.g. Codex Alimentarius, UNBS, WHO).'),
    ].join(''),
  },
];

export const ARTICLE_TYPE_MAP: Record<ArticleType, ArticleTypeInfo> = Object.fromEntries(
  ARTICLE_TYPES.map((t) => [t.value, t]),
) as Record<ArticleType, ArticleTypeInfo>;

export function isArticleType(value: unknown): value is ArticleType {
  return typeof value === 'string' && value in ARTICLE_TYPE_MAP;
}

/** Type of an article, defaulting to 'educational' (also before the migration). */
export function articleTypeOf(article: { article_type?: string | null }): ArticleType {
  return isArticleType(article.article_type) ? article.article_type : 'educational';
}

export function articleTypeLabel(article: { article_type?: string | null }): string {
  return ARTICLE_TYPE_MAP[articleTypeOf(article)].label;
}
