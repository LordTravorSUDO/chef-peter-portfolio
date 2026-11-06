/**
 * Knowledge-platform schema detection from a sample row (pure; used by
 * services/knowledgeSchema.ts). Returns null when there is no row to inspect.
 */
export function rowShowsKnowledgeSchema(table: 'categories' | 'articles', row: Record<string, unknown> | null | undefined): boolean | null {
  if (!row) return null;
  return table === 'categories' ? 'is_active' in row && 'sort_order' in row : 'article_type' in row && 'recipe' in row;
}
