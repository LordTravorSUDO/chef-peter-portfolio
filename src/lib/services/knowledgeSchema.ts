/**
 * Detects whether the knowledge-platform migration
 * (supabase/proposed/20261106000000_knowledge_platform.sql) has been applied.
 *
 * Until it is, every query and form in the site uses only the original
 * columns, so the site keeps working on the current database. After the
 * migration, article types, editorial flags, structured recipes and category
 * ordering/activation switch on automatically — no code change needed.
 *
 * Detection reads ONE row with all its columns (categories first, which are
 * small) and looks for the new columns in it. Unlike asking for a missing
 * column, this never produces a failed request, so visitors' browsers show no
 * errors before the migration is applied. With no rows to look at, the
 * original schema is assumed (there is nothing to display anyway).
 * Other errors (network, outage) are not cached, so the check is retried.
 */
import { supabase } from '../supabase';
import { rowShowsKnowledgeSchema } from '../knowledge/schemaDetect';

export { rowShowsKnowledgeSchema };

let cached: Promise<boolean> | null = null;

async function detect(): Promise<boolean> {
  for (const table of ['categories', 'articles'] as const) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) throw new Error(error.message);
    const verdict = rowShowsKnowledgeSchema(table, (data as Array<Record<string, unknown>> | null)?.[0]);
    if (verdict !== null) return verdict;
  }
  return false;
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
