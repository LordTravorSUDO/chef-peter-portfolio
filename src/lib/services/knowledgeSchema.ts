/**
 * Detects whether the knowledge-platform migration
 * (supabase/proposed/20261106000000_knowledge_platform.sql) has been applied.
 *
 * Until it is, every query and form in the site uses only the original
 * columns, so the site keeps working on the current database. After the
 * migration, article types, editorial flags, structured recipes and category
 * ordering/activation switch on automatically — no code change needed.
 *
 * Detection asks PostgREST for the new columns with `limit 0` (no rows are
 * read). An "undefined column" error means the migration is not applied.
 * Other errors (network, outage) are not cached, so the check is retried.
 */
import { supabase } from '../supabase';

let cached: Promise<boolean> | null = null;

/** Postgres 42703 = undefined_column; PostgREST PGRST204 = column not in schema cache */
const MISSING_COLUMN = /42703|PGRST204|does not exist|could not find/i;

async function detect(): Promise<boolean> {
  const [articles, categories] = await Promise.all([
    supabase.from('articles').select('article_type,is_featured,is_editors_pick,recipe').limit(0),
    supabase.from('categories').select('sort_order,is_active').limit(0),
  ]);
  for (const res of [articles, categories]) {
    if (res.error) {
      const text = `${res.error.code ?? ''} ${res.error.message ?? ''}`;
      if (MISSING_COLUMN.test(text)) return false;
      throw new Error(res.error.message);
    }
  }
  return true;
}

export function hasKnowledgeSchema(): Promise<boolean> {
  if (!cached) {
    cached = detect().catch((err) => {
      cached = null; // retry on the next call
      console.warn('[knowledge] schema check failed; using the original schema for now:', err);
      return false;
    });
  }
  return cached;
}

/** For tests */
export function resetKnowledgeSchemaCache() {
  cached = null;
}
