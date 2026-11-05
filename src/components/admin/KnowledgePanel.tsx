/**
 * Knowledge-platform fields in the article editor:
 *   - Article format (type) + starter outline
 *   - Featured / Editor's selection flags
 *   - Structured recipe / tutorial information (only the sections that suit
 *     the chosen format are shown — history features and general guides get none)
 *   - Writing guide
 *
 * Format, flags and structured data are stored in columns added by the
 * proposed knowledge-platform migration. Until it is applied (`enabled` is
 * false) those controls are shown as unavailable and nothing extra is saved;
 * outlines and the writing guide still work.
 */
import React, { useId, useState } from 'react';
import { ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { ARTICLE_TYPES, ARTICLE_TYPE_MAP, type ArticleType, type StructuredField } from '../../lib/knowledge/articleTypes';
import { COMMON_ALLERGENS, type RecipeData, type RecipeIngredient } from '../../lib/knowledge/recipe';

const box = 'bg-white rounded-xl border border-[#DDE3EA] p-5 space-y-4';
const label = 'block text-sm font-medium text-[#1A2B40]';
const hint = 'text-xs text-[#6B7A8D]';
const field =
  'mt-1 block w-full rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 text-sm text-[#1A2B40] focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/15';

export interface KnowledgeState {
  articleType: ArticleType;
  isFeatured: boolean;
  isEditorsPick: boolean;
  recipe: RecipeData;
}

interface Props {
  enabled: boolean;
  value: KnowledgeState;
  onChange: (next: KnowledgeState) => void;
  onInsertOutline: (type: ArticleType) => void;
  bodyIsEmpty: boolean;
}

const lines = (list?: string[]) => (list ?? []).join('\n');
const toLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const numOrNull = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v))) || null);

export default function KnowledgePanel({ enabled, value, onChange, onInsertOutline, bodyIsEmpty }: Props) {
  const uid = useId();
  const type = value.articleType;
  const info = ARTICLE_TYPE_MAP[type];
  const has = (f: StructuredField) => info.fields.includes(f);
  const r = value.recipe;
  const setRecipe = (patch: Partial<RecipeData>) => onChange({ ...value, recipe: { ...r, ...patch } });

  return (
    <>
      {/* ── Format ─────────────────────────────────────────────────────── */}
      <div className={box}>
        <div>
          <label htmlFor={`${uid}-type`} className={label}>Article format</label>
          <select
            id={`${uid}-type`}
            className={field}
            value={type}
            disabled={!enabled}
            onChange={(e) => onChange({ ...value, articleType: e.target.value as ArticleType })}
          >
            {ARTICLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className={`${hint} mt-1`}>{info.description}</p>
          {!enabled && (
            <p className="mt-2 rounded-md bg-[#1B365D]/5 px-3 py-2 text-xs text-[#1A2B40]">
              Formats, featured flags and recipe fields are saved after the knowledge-platform database upgrade
              (awaiting approval). You can already insert an outline below.
            </p>
          )}
        </div>

        <OutlineChooser current={type} onInsert={onInsertOutline} bodyIsEmpty={bodyIsEmpty} />

        <fieldset disabled={!enabled} className="space-y-2 disabled:opacity-60">
          <legend className={label}>Library placement</legend>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.isFeatured} onChange={(e) => onChange({ ...value, isFeatured: e.target.checked })} className="w-4 h-4 accent-[#1B365D]" />
            <span className="text-sm text-[#1A2B40]">Featured article (top of the library)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.isEditorsPick} onChange={(e) => onChange({ ...value, isEditorsPick: e.target.checked })} className="w-4 h-4 accent-[#1B365D]" />
            <span className="text-sm text-[#1A2B40]">Editor’s selection</span>
          </label>
          <p className={hint}>If several articles are featured, the most recently published one is shown.</p>
        </fieldset>
      </div>

      {/* ── Structured fields ──────────────────────────────────────────── */}
      {enabled && info.fields.length > 0 && (
        <div className={box}>
          <div>
            <p className="text-sm font-semibold text-[#1A2B40]">
              {type === 'recipe' ? 'Recipe details' : 'Structured details'} <span className="font-normal text-[#6B7A8D]">(optional)</span>
            </p>
            <p className={hint}>
              Shown as a card on the article.{' '}
              {type === 'recipe'
                ? 'A recipe with at least one ingredient and one step also gets Recipe rich-result markup for search engines.'
                : 'Recipe markup is only used for the Recipe format.'}
            </p>
          </div>

          {has('times') && (
            <div className="grid grid-cols-3 gap-3">
              <NumberField id={`${uid}-prep`} label="Prep (min)" value={r.prep_minutes} onChange={(v) => setRecipe({ prep_minutes: v })} />
              <NumberField id={`${uid}-cook`} label={type === 'baking_tutorial' ? 'Bake (min)' : 'Cook (min)'} value={r.cook_minutes} onChange={(v) => setRecipe({ cook_minutes: v })} />
              <NumberField id={`${uid}-total`} label="Total (min)" value={r.total_minutes} onChange={(v) => setRecipe({ total_minutes: v })} hintText="Blank = prep + cook" />
            </div>
          )}

          {(has('servings') || has('difficulty')) && (
            <div className="grid grid-cols-2 gap-3">
              {has('servings') && (
                <>
                  <NumberField id={`${uid}-serves`} label="Servings" value={r.servings} onChange={(v) => setRecipe({ servings: v })} />
                  <div>
                    <label htmlFor={`${uid}-yield`} className={label}>Yield</label>
                    <input id={`${uid}-yield`} className={field} value={r.yield ?? ''} placeholder="e.g. 12 rolls" onChange={(e) => setRecipe({ yield: e.target.value })} />
                  </div>
                </>
              )}
              {has('difficulty') && (
                <div>
                  <label htmlFor={`${uid}-level`} className={label}>Level</label>
                  <select id={`${uid}-level`} className={field} value={r.difficulty ?? ''} onChange={(e) => setRecipe({ difficulty: (e.target.value || null) as RecipeData['difficulty'] })}>
                    <option value="">Not stated</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {has('ingredients') && (
            <IngredientsEditor uid={uid} list={r.ingredients ?? []} onChange={(ingredients) => setRecipe({ ingredients })} />
          )}

          {has('equipment') && (
            <LinesField id={`${uid}-equip`} label="Equipment" help="One item per line" value={lines(r.equipment)} onChange={(t) => setRecipe({ equipment: toLines(t) })} />
          )}
          {has('preparation') && (
            <LinesField id={`${uid}-prep-steps`} label="Preparation steps" help="One step per line — numbered automatically" value={lines(r.preparation)} onChange={(t) => setRecipe({ preparation: toLines(t) })} />
          )}
          {has('method') && (
            <LinesField id={`${uid}-method`} label={type === 'baking_tutorial' ? 'Method steps' : 'Cooking method steps'} help="One step per line — continues the numbering" value={lines(r.method)} onChange={(t) => setRecipe({ method: toLines(t) })} />
          )}
          {has('chef_notes') && (
            <TextField id={`${uid}-notes`} label="Chef’s notes" value={r.chef_notes ?? ''} onChange={(t) => setRecipe({ chef_notes: t })} />
          )}
          {has('storage') && (
            <TextField id={`${uid}-storage`} label="Storage" value={r.storage ?? ''} onChange={(t) => setRecipe({ storage: t })} />
          )}
          {has('allergens') && (
            <fieldset>
              <legend className={label}>Allergens</legend>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {COMMON_ALLERGENS.map((a) => {
                  const checked = r.allergens?.includes(a) ?? false;
                  return (
                    <label key={a} className="flex items-center gap-2 text-sm text-[#1A2B40] cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#1B365D]"
                        checked={checked}
                        onChange={() =>
                          setRecipe({ allergens: checked ? (r.allergens ?? []).filter((x) => x !== a) : [...(r.allergens ?? []), a] })
                        }
                      />
                      {a}
                    </label>
                  );
                })}
              </div>
              <p className={`${hint} mt-2`}>Tick only allergens present in the recipe as written.</p>
            </fieldset>
          )}
        </div>
      )}

      <WritingGuide />
    </>
  );
}

// ---------------------------------------------------------------------------
function OutlineChooser({ current, onInsert, bodyIsEmpty }: { current: ArticleType; onInsert: (t: ArticleType) => void; bodyIsEmpty: boolean }) {
  const [choice, setChoice] = useState<ArticleType>(current);
  const id = useId();
  return (
    <div className="rounded-lg border border-dashed border-[#DDE3EA] p-3">
      <label htmlFor={id} className={label}>Starter outline</label>
      <div className="mt-1 flex gap-2">
        <select id={id} className={`${field} mt-0`} value={choice} onChange={(e) => setChoice(e.target.value as ArticleType)}>
          {ARTICLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (bodyIsEmpty || window.confirm('Add the outline to the end of the current article text?')) onInsert(choice);
          }}
          className="shrink-0 rounded-lg bg-[#1B365D] px-3 py-2 text-sm font-medium text-white hover:bg-[#142a4a]"
        >
          Insert
        </button>
      </div>
      <p className={`${hint} mt-1`}>Headings and writing prompts in [brackets] — replace every prompt before publishing.</p>
    </div>
  );
}

function NumberField({ id, label: text, value, onChange, hintText }: { id: string; label: string; value?: number | null; onChange: (v: number | null) => void; hintText?: string }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <input id={id} type="number" min={0} inputMode="numeric" className={field} value={value ?? ''} onChange={(e) => onChange(numOrNull(e.target.value))} />
      {hintText && <p className={`${hint} mt-0.5`}>{hintText}</p>}
    </div>
  );
}

function LinesField({ id, label: text, help, value, onChange }: { id: string; label: string; help: string; value: string; onChange: (t: string) => void }) {
  // Keep the raw text while typing so blank lines are not removed mid-edit
  const [draft, setDraft] = useState(value);
  return (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <textarea id={id} rows={4} className={field} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onChange(draft)} />
      <p className={`${hint} mt-0.5`}>{help}</p>
    </div>
  );
}

function TextField({ id, label: text, value, onChange }: { id: string; label: string; value: string; onChange: (t: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <textarea id={id} rows={3} className={field} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function IngredientsEditor({ uid, list, onChange }: { uid: string; list: RecipeIngredient[]; onChange: (l: RecipeIngredient[]) => void }) {
  const update = (i: number, patch: Partial<RecipeIngredient>) => onChange(list.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <fieldset>
      <legend className={label}>Ingredients</legend>
      <p className={hint}>Quantity as written (e.g. “1½”, “to taste”). Use “Group” for sub-headings such as “For the sauce”.</p>
      <div className="mt-2 space-y-2">
        {list.map((row, i) => (
          <div key={i} className="rounded-lg border border-[#DDE3EA] p-2">
            <div className="grid grid-cols-[4.5rem_4.5rem_1fr] gap-2">
              <input aria-label={`Ingredient ${i + 1} quantity`} placeholder="Qty" className={`${field} mt-0`} value={row.quantity ?? ''} onChange={(e) => update(i, { quantity: e.target.value })} />
              <input aria-label={`Ingredient ${i + 1} unit`} placeholder="Unit" className={`${field} mt-0`} value={row.unit ?? ''} onChange={(e) => update(i, { unit: e.target.value })} />
              <input aria-label={`Ingredient ${i + 1} name`} placeholder="Ingredient" className={`${field} mt-0`} value={row.item} onChange={(e) => update(i, { item: e.target.value })} />
            </div>
            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <input aria-label={`Ingredient ${i + 1} note`} placeholder="Note (e.g. chopped)" className={`${field} mt-0`} value={row.note ?? ''} onChange={(e) => update(i, { note: e.target.value })} />
              <input aria-label={`Ingredient ${i + 1} group`} placeholder="Group (optional)" className={`${field} mt-0`} value={row.group ?? ''} onChange={(e) => update(i, { group: e.target.value })} />
              <div className="flex">
                <button type="button" onClick={() => move(i, -1)} aria-label={`Move ingredient ${i + 1} up`} className="p-1.5 text-[#6B7A8D] hover:text-[#1B365D]"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} aria-label={`Move ingredient ${i + 1} down`} className="p-1.5 text-[#6B7A8D] hover:text-[#1B365D]"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => onChange(list.filter((_, idx) => idx !== i))} aria-label={`Remove ingredient ${i + 1}`} className="p-1.5 text-[#6B7A8D] hover:text-[#C0392B]"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        id={`${uid}-add-ingredient`}
        onClick={() => onChange([...list, { item: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EA] px-3 py-1.5 text-sm text-[#1B365D] hover:bg-[#F4F6F8]"
      >
        <Plus className="w-4 h-4" /> Add ingredient
      </button>
    </fieldset>
  );
}

function WritingGuide() {
  return (
    <details className="group bg-white rounded-xl border border-[#DDE3EA]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 text-sm font-medium text-[#1A2B40] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#4A777A]" /> Writing guide for the library</span>
        <ChevronDown className="w-4 h-4 text-[#6B7A8D] transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-[#DDE3EA] p-5 text-sm leading-relaxed text-[#1A2B40]">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Open with the purpose:</strong> the introduction (excerpt) says what the reader will learn and why it matters.</li>
          <li><strong>Explain terms</strong> the first time you use them, in plain language, without losing technical accuracy.</li>
          <li><strong>Use real examples</strong> from Ugandan, African and international kitchens, and say how a technique works with locally available ingredients and equipment.</li>
          <li><strong>Never guess facts.</strong> Only state origins, dates, temperatures or food-safety rules you can support; cite the source (e.g. Codex Alimentarius, WHO, UNBS) for safety guidance.</li>
          <li><strong>Structure:</strong> use Heading 2 for main sections (three or more create a table of contents), numbered lists for steps, and short paragraphs.</li>
          <li><strong>Images:</strong> add alt text and a caption in the Media library; the caption appears under the image.</li>
        </ul>
        <div>
          <p className="font-medium">Highlighted boxes</p>
          <p className="text-[#6B7A8D]">Use the Quote button and start the first line with one of these labels:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[#6B7A8D]">
            <li><code>Chef’s tip:</code> — practical advice</li>
            <li><code>Chef’s note:</code> — background or explanation</li>
            <li><code>Safety note:</code> — food-safety warning</li>
            <li><code>In the Ugandan kitchen:</code> — local ingredients, equipment or practice</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
