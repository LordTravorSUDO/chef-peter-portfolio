/**
 * Article page building blocks: table of contents, recipe/tutorial card,
 * author biography, previous/next navigation and share links.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, Link as LinkIcon, Users, ChefHat, Gauge } from 'lucide-react';
import type { TocEntry } from '../../lib/knowledge/articleHtml';
import type { ArticleType, StructuredField } from '../../lib/knowledge/articleTypes';
import { ARTICLE_TYPE_MAP } from '../../lib/knowledge/articleTypes';
import type { AuthorProfileView } from '../../data/authorProfile';
import { DIFFICULTY_LABEL, formatMinutes, totalMinutes, type RecipeData, type RecipeIngredient } from '../../lib/knowledge/recipe';

// ---------------------------------------------------------------------------
// Table of contents
// ---------------------------------------------------------------------------
export function TableOfContents({ toc, variant }: { toc: TocEntry[]; variant: 'sidebar' | 'inline' }) {
  const list = (
    <ol className="space-y-2 text-[0.9375rem]">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? 'pl-4' : ''}>
          <a href={`#${t.id}`} className="block leading-snug text-ink-soft hover:text-ink hover:underline hover:decoration-gold hover:underline-offset-4">
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === 'inline') {
    return (
      <details className="group rounded-[var(--radius-card)] border border-sand bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
          On this page
          <span aria-hidden="true" className="text-gold-deep transition-transform group-open:rotate-45">+</span>
        </summary>
        <nav aria-label="On this page" className="border-t border-sand px-5 py-4">
          {list}
        </nav>
      </details>
    );
  }

  return (
    <nav aria-label="On this page" className="sticky top-24 hidden lg:block">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">On this page</p>
      <div className="mt-4 border-l border-sand pl-4">{list}</div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Recipe / tutorial card
// ---------------------------------------------------------------------------
const CARD_TITLE: Partial<Record<ArticleType, string>> = {
  recipe: 'Recipe',
  cooking_tutorial: 'Tutorial essentials',
  baking_tutorial: 'Formula and method',
  ingredient_guide: 'Quick reference',
  kitchen_guide: 'Quick reference',
  food_safety_guide: 'Quick reference',
};

function groupIngredients(list: RecipeIngredient[]) {
  const groups: Array<{ name: string; items: RecipeIngredient[] }> = [];
  for (const i of list) {
    const name = i.group ?? '';
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(i);
    else groups.push({ name, items: [i] });
  }
  return groups;
}

function Steps({ title, steps, start = 1 }: { title: string; steps: string[]; start?: number }) {
  return (
    <div>
      <h3 className="font-serif text-[1.25rem] font-semibold text-ink">{title}</h3>
      <ol className="mt-4 space-y-4" start={start}>
        {steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-charcoal text-[0.8125rem] font-semibold text-cream">
              {start + i}
            </span>
            <p className="leading-relaxed text-ink-soft">{s}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RecipeCard({ type, recipe, title }: { type: ArticleType; recipe: RecipeData; title: string }) {
  const allowed = new Set<StructuredField>(ARTICLE_TYPE_MAP[type].fields);
  const has = (f: StructuredField) => allowed.has(f);
  const total = totalMinutes(recipe);

  const facts: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
  if (has('times')) {
    if (recipe.prep_minutes) facts.push({ icon: <Clock className="h-4 w-4" />, label: 'Preparation', value: formatMinutes(recipe.prep_minutes) });
    if (recipe.cook_minutes) facts.push({ icon: <Clock className="h-4 w-4" />, label: type === 'baking_tutorial' ? 'Baking' : 'Cooking', value: formatMinutes(recipe.cook_minutes) });
    if (total) facts.push({ icon: <Clock className="h-4 w-4" />, label: 'Total', value: formatMinutes(total) });
  }
  if (has('servings') && (recipe.yield || recipe.servings)) {
    facts.push({ icon: <Users className="h-4 w-4" />, label: recipe.yield ? 'Makes' : 'Serves', value: recipe.yield || String(recipe.servings) });
  }
  if (has('difficulty') && recipe.difficulty) {
    facts.push({ icon: <Gauge className="h-4 w-4" />, label: 'Level', value: DIFFICULTY_LABEL[recipe.difficulty] });
  }

  const ingredients = has('ingredients') ? recipe.ingredients ?? [] : [];
  const equipment = has('equipment') ? recipe.equipment ?? [] : [];
  const prep = has('preparation') ? recipe.preparation ?? [] : [];
  const method = has('method') ? recipe.method ?? [] : [];

  return (
    <section id="recipe" aria-labelledby="recipe-title" className="my-12 scroll-mt-24 overflow-hidden rounded-[var(--radius-card)] border border-sand bg-card">
      <div className="border-b border-sand bg-paper px-5 py-5 sm:px-8">
        <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">
          <ChefHat className="h-4 w-4" aria-hidden="true" /> {CARD_TITLE[type] ?? 'Reference'}
        </p>
        <h2 id="recipe-title" className="mt-1 font-serif text-[1.5rem] font-semibold leading-snug text-ink">
          {title}
        </h2>
        {facts.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">
                  <span aria-hidden="true">{f.icon}</span>
                  {f.label}
                </dt>
                <dd className="mt-1 font-semibold text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="space-y-10 px-5 py-8 sm:px-8">
        {(ingredients.length > 0 || equipment.length > 0) && (
          <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
            {ingredients.length > 0 && (
              <div>
                <h3 className="font-serif text-[1.25rem] font-semibold text-ink">Ingredients</h3>
                {groupIngredients(ingredients).map((g) => (
                  <div key={g.name || 'main'} className="mt-4">
                    {g.name && <h4 className="text-[0.875rem] font-semibold uppercase tracking-[0.08em] text-muted">{g.name}</h4>}
                    <ul className="mt-2 divide-y divide-sand/70">
                      {g.items.map((i, idx) => (
                        <li key={idx} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 text-[0.975rem]">
                          <span className="font-semibold tabular-nums text-ink">{[i.quantity, i.unit].filter(Boolean).join(' ')}</span>
                          <span className="text-ink-soft">
                            {i.item}
                            {i.note && <span className="text-muted">, {i.note}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {equipment.length > 0 && (
              <div>
                <h3 className="font-serif text-[1.25rem] font-semibold text-ink">Equipment</h3>
                <ul className="mt-4 space-y-2">
                  {equipment.map((e) => (
                    <li key={e} className="flex gap-2.5 text-[0.975rem] text-ink-soft">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {prep.length > 0 && <Steps title="Preparation" steps={prep} />}
        {method.length > 0 && <Steps title={type === 'baking_tutorial' ? 'Method' : 'Cooking method'} steps={method} start={prep.length + 1} />}

        {((has('chef_notes') && recipe.chef_notes) || (has('storage') && recipe.storage) || (has('allergens') && recipe.allergens?.length)) && (
          <div className="grid gap-6 md:grid-cols-3">
            {has('chef_notes') && recipe.chef_notes && (
              <div className="rounded-md bg-gold-wash p-5 md:col-span-3">
                <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">Chef’s notes</h3>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{recipe.chef_notes}</p>
              </div>
            )}
            {has('storage') && recipe.storage && (
              <div className={recipe.allergens?.length ? 'md:col-span-2' : 'md:col-span-3'}>
                <h3 className="font-serif text-[1.125rem] font-semibold text-ink">Storage</h3>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{recipe.storage}</p>
              </div>
            )}
            {has('allergens') && recipe.allergens && recipe.allergens.length > 0 && (
              <div>
                <h3 className="font-serif text-[1.125rem] font-semibold text-ink">Allergens</h3>
                <p className="mt-2 text-ink-soft">Contains: {recipe.allergens.join(', ')}.</p>
                <p className="mt-1 text-[0.8125rem] text-muted">Check the labels of the products you use.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Author biography (central profile — see src/lib/services/authors.ts)
// ---------------------------------------------------------------------------
export function AuthorBio({ profile }: { profile: AuthorProfileView }) {
  return (
    <aside aria-label="About the author" className="mt-14 flex flex-col gap-5 rounded-[var(--radius-card)] border border-sand bg-paper p-6 sm:flex-row sm:items-start sm:p-8">
      {profile.photoUrl && (
        <img
          src={profile.photoUrl}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-full object-cover object-[51%_30%] ring-1 ring-sand"
        />
      )}
      <div>
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">About the author</p>
        <p className="mt-1 font-serif text-[1.375rem] font-semibold text-ink">{profile.name}</p>
        {profile.jobTitle && <p className="text-[0.9375rem] text-muted">{profile.jobTitle}</p>}
        <p className="mt-2 leading-relaxed text-ink-soft">
          {profile.shortBio || 'Contributor to Chef Peter the Teacher’s culinary library.'}
        </p>
        {profile.profileUrl && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
            <a href={profile.profileUrl} className="font-semibold text-ink underline decoration-gold underline-offset-4">Full profile</a>
            {profile.source !== 'generic' && (
              <>
                <a href="/cooking-classes-kampala" className="font-semibold text-ink underline decoration-gold underline-offset-4">Cooking classes</a>
                <a href="/baking-pastry-classes" className="font-semibold text-ink underline decoration-gold underline-offset-4">Baking classes</a>
              </>
            )}
          </p>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Previous / next
// ---------------------------------------------------------------------------
type NavLink = { slug: string; title: string } | null;

export function ArticleNavigation({ previous, next }: { previous: NavLink; next: NavLink }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="More articles" className="mt-12 grid gap-4 border-y border-sand py-6 sm:grid-cols-2">
      {previous ? (
        <Link to={`/articles/${previous.slug}`} rel="prev" className="group">
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous article
          </span>
          <span className="mt-1 block font-serif text-[1.125rem] leading-snug text-ink group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`/articles/${next.slug}`} rel="next" className="group sm:text-right">
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted sm:justify-end">
            Next article <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="mt-1 block font-serif text-[1.125rem] leading-snug text-ink group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-sand-strong px-3 py-1.5 text-[0.875rem] text-ink-soft hover:border-ink hover:text-ink"
        >
          {l.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
      <button
        type="button"
        onClick={() =>
          navigator.clipboard
            ?.writeText(url)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            })
            .catch(() => {})
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-sand-strong px-3 py-1.5 text-[0.875rem] text-ink-soft hover:border-ink hover:text-ink"
      >
        {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <LinkIcon className="h-4 w-4" aria-hidden="true" />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
