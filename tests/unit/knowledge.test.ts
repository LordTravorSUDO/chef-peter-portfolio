/**
 * Unit tests for the culinary knowledge platform helpers.
 * Run: npx tsx --test tests/unit/knowledge.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHeadingIds, addCallouts, enhanceArticleHtml, readingMinutesFromHtml, headingId } from '../../src/lib/knowledge/articleHtml';
import { normaliseRecipe, qualifiesForRecipeSchema, buildRecipeJsonLd, isoDuration, formatMinutes, totalMinutes, ingredientText } from '../../src/lib/knowledge/recipe';
import { articleTypeOf, ARTICLE_TYPES, ARTICLE_TYPE_MAP } from '../../src/lib/knowledge/articleTypes';
import { sanitiseSearchTerm } from '../../src/lib/knowledge/search';

// ── Headings / table of contents ────────────────────────────────────────────
test('addHeadingIds adds unique ids and builds the TOC', () => {
  const { html, toc } = addHeadingIds('<h2>Keep it cold</h2><p>x</p><h3>Butter <em>sheet</em></h3><h2>Keep it cold</h2>');
  assert.deepEqual(toc.map((t) => [t.id, t.level, t.text]), [
    ['keep-it-cold', 2, 'Keep it cold'],
    ['butter-sheet', 3, 'Butter sheet'],
    ['keep-it-cold-2', 2, 'Keep it cold'],
  ]);
  assert.match(html, /<h2 id="keep-it-cold">Keep it cold<\/h2>/);
  assert.match(html, /<h3 id="butter-sheet">Butter <em>sheet<\/em><\/h3>/);
});

test('addHeadingIds keeps an existing id and ignores empty headings', () => {
  const { html, toc } = addHeadingIds('<h2 id="custom">Title</h2><h2> </h2>');
  assert.equal(toc.length, 1);
  assert.equal(toc[0].id, 'custom');
  assert.equal(html, '<h2 id="custom">Title</h2><h2> </h2>');
});

test('headingId handles accents and punctuation', () => {
  assert.equal(headingId('Crème brûlée: the basics!'), 'creme-brulee-the-basics');
  assert.equal(headingId('???'), 'section');
});

// ── Callouts ───────────────────────────────────────────────────────────────
test('Chef’s tip blockquote becomes a tip callout without the label text', () => {
  const out = addCallouts("<blockquote><p>Chef's tip: Rest the dough for 30 minutes.</p></blockquote>");
  assert.match(out, /^<aside class="callout callout-tip" role="note" aria-label="Chef’s tip">/);
  assert.match(out, /<p class="callout-label">Chef’s tip<\/p><p>Rest the dough for 30 minutes\.<\/p><\/aside>$/);
});

test('bold label with colon outside the bold is removed', () => {
  const out = addCallouts('<blockquote><p><strong>Safety note</strong>: Cool rice quickly.</p></blockquote>');
  assert.match(out, /callout-safety/);
  assert.match(out, /<p>Cool rice quickly\.<\/p>/);
  assert.doesNotMatch(out, /Safety note<\/strong>/);
});

test('bold label with colon inside the bold is removed', () => {
  const out = addCallouts('<blockquote><p><strong>In the Ugandan kitchen:</strong> Use matooke leaves.</p></blockquote>');
  assert.match(out, /callout-local/);
  assert.match(out, /<p>Use matooke leaves\.<\/p>/);
});

test('apostrophe entity in the label is recognised', () => {
  const out = addCallouts('<blockquote><p>Chef&#39;s note: Label every container.</p></blockquote>');
  assert.match(out, /callout-note/);
  assert.match(out, /<p>Label every container\.<\/p>/);
});

test('ordinary quotations are left unchanged', () => {
  const html = '<blockquote><p>Cooking is a discipline.</p></blockquote>';
  assert.equal(addCallouts(html), html);
});

test('callout keeps following paragraphs and does not decode escaped markup', () => {
  const out = addCallouts('<blockquote><p><strong>Tip: &lt;b&gt; is not a tag</strong></p><p>Second.</p></blockquote>');
  assert.match(out, /&lt;b&gt; is not a tag/);
  assert.match(out, /<p>Second\.<\/p><\/aside>$/);
});

test('enhanceArticleHtml combines callouts, ids and word count', () => {
  const r = enhanceArticleHtml('<h2>Method</h2><p>one two three</p><blockquote><p>Tip: four</p></blockquote>');
  assert.equal(r.toc.length, 1);
  assert.match(r.html, /callout-tip/);
  assert.equal(r.wordCount, 6);
});

test('reading time counts words, not HTML tags', () => {
  const words = Array.from({ length: 400 }, () => '<strong>word</strong>').join(' ');
  assert.equal(readingMinutesFromHtml(`<p>${words}</p>`), 2);
  assert.equal(readingMinutesFromHtml(''), 1);
});

// ── Recipe data ────────────────────────────────────────────────────────────
test('normaliseRecipe cleans input and drops blanks', () => {
  const r = normaliseRecipe({
    prep_minutes: '20', cook_minutes: 40, servings: 4, difficulty: 'expert', junk: 'x',
    ingredients: [{ quantity: '1', unit: 'kg', item: ' Matooke ' }, { item: '' }, 'bad'],
    method: ['Peel', '  '], allergens: ['Peanuts (groundnuts)'],
  });
  assert.ok(r);
  assert.equal(r!.prep_minutes, 20);
  assert.equal(r!.difficulty, null);
  assert.deepEqual(r!.ingredients, [{ quantity: '1', unit: 'kg', item: 'Matooke' }]);
  assert.deepEqual(r!.method, ['Peel']);
  assert.equal((r as Record<string, unknown>).junk, undefined);
});

test('normaliseRecipe returns null for empty or invalid data', () => {
  assert.equal(normaliseRecipe(null), null);
  assert.equal(normaliseRecipe([]), null);
  assert.equal(normaliseRecipe({ ingredients: [], method: [] }), null);
});

test('time helpers', () => {
  assert.equal(isoDuration(75), 'PT1H15M');
  assert.equal(isoDuration(60), 'PT1H');
  assert.equal(isoDuration(0), undefined);
  assert.equal(formatMinutes(75), '1 hr 15 min');
  assert.equal(formatMinutes(45), '45 min');
  assert.equal(totalMinutes({ prep_minutes: 10, cook_minutes: 20 }), 30);
  assert.equal(totalMinutes({ prep_minutes: 10, total_minutes: 90 }), 90);
  assert.equal(ingredientText({ quantity: '2', unit: 'tbsp', item: 'ghee', note: 'melted' }), '2 tbsp ghee, melted');
});

test('Recipe schema only for recipe articles with ingredients and steps', () => {
  const full = { ingredients: [{ item: 'flour' }], method: ['Mix'] };
  assert.equal(qualifiesForRecipeSchema('recipe', full), true);
  assert.equal(qualifiesForRecipeSchema('baking_tutorial', full), false);
  assert.equal(qualifiesForRecipeSchema('food_history', full), false);
  assert.equal(qualifiesForRecipeSchema('recipe', { ingredients: [{ item: 'flour' }] }), false);
  assert.equal(qualifiesForRecipeSchema('recipe', null), false);
});

test('buildRecipeJsonLd produces schema.org Recipe fields', () => {
  const ld = buildRecipeJsonLd(
    { name: 'Rolex', description: 'd', url: 'https://x/articles/rolex', authorName: 'Chef Peter the Teacher', imageUrl: 'https://x/i.jpg' },
    { prep_minutes: 10, cook_minutes: 5, servings: 2, ingredients: [{ quantity: '2', item: 'eggs' }], preparation: ['Beat eggs'], method: ['Cook'] },
  );
  assert.equal(ld['@type'], 'Recipe');
  assert.deepEqual(ld.recipeIngredient, ['2 eggs']);
  assert.equal((ld.recipeInstructions as unknown[]).length, 2);
  assert.equal(ld.totalTime, 'PT15M');
  assert.equal(ld.recipeYield, '2 servings');
});

// ── Article types ──────────────────────────────────────────────────────────
test('eight article types; unknown or missing defaults to educational', () => {
  assert.equal(ARTICLE_TYPES.length, 8);
  assert.equal(articleTypeOf({}), 'educational');
  assert.equal(articleTypeOf({ article_type: 'nonsense' }), 'educational');
  assert.equal(articleTypeOf({ article_type: 'recipe' }), 'recipe');
  assert.deepEqual(ARTICLE_TYPE_MAP.food_history.fields, []);
  assert.deepEqual(ARTICLE_TYPE_MAP.educational.fields, []);
  assert.ok(ARTICLE_TYPE_MAP.recipe.fields.includes('ingredients'));
});

// ── Search ─────────────────────────────────────────────────────────────────
test('sanitiseSearchTerm removes PostgREST filter syntax', () => {
  assert.equal(sanitiseSearchTerm('matooke, (beef)*'), 'matooke beef');
  assert.equal(sanitiseSearchTerm('100% "rice":x'), '100 rice x');
  assert.equal(sanitiseSearchTerm('  '), '');
  assert.equal(sanitiseSearchTerm('a'.repeat(200)).length, 80);
});

// ── Image captions ─────────────────────────────────────────────────────────
import { addImageCaptions } from '../../src/lib/knowledge/articleHtml';

test('block images with a title get a figure caption', () => {
  const out = addImageCaptions('<p>Intro</p><img src="a.jpg" alt="Croissants" title="Laminated croissants, day two">');
  assert.equal(out, '<p>Intro</p><figure class="article-figure"><img src="a.jpg" alt="Croissants" title="Laminated croissants, day two"><figcaption>Laminated croissants, day two</figcaption></figure>');
});

test('images without a title, inside paragraphs, or at the start are handled safely', () => {
  assert.equal(addImageCaptions('<p>x</p><img src="a.jpg" alt="a">'), '<p>x</p><img src="a.jpg" alt="a">');
  assert.equal(addImageCaptions('<p>text <img src="a.jpg" title="t"> more</p>'), '<p>text <img src="a.jpg" title="t"> more</p>');
  assert.match(addImageCaptions('<img src="a.jpg" title="First">'), /^<figure class="article-figure">/);
});

test('caption text from the title attribute is escaped', () => {
  assert.match(addImageCaptions('<img src="a.jpg" title="Heat < 70 °C">'), /<figcaption>Heat &lt; 70 °C<\/figcaption>/);
  // A '>' inside the attribute ends the tag match early, so no figure is created — never raw markup in a caption
  assert.doesNotMatch(addImageCaptions('<img src="a.jpg" title="<script>x</script>">'), /<figcaption><script/);
});

import { searchWords } from '../../src/lib/knowledge/search';

test('searchWords splits into meaningful, sanitised words', () => {
  assert.deepEqual(searchWords('How to make the Rolex'), ['make', 'rolex']);
  assert.deepEqual(searchWords('pastry, (bakery)*'), ['pastry', 'bakery']);
  assert.deepEqual(searchWords('the'), ['the']);
  assert.deepEqual(searchWords('a b c'), ['a b c']); // only 1-letter words: search the whole phrase
  assert.equal(searchWords('one two three four five six seven').length, 5);
  assert.deepEqual(searchWords(''), []);
});
