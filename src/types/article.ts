/**
 * Convenience re-exports and UI-level type aliases.
 * Import article types from here rather than from database.ts directly.
 */

export type {
  // Enums
  ArticleStatus,
  UserRole,

  // Core rows
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Media,
  MediaInsert,
  MediaUpdate,
  Category,
  CategoryInsert,
  CategoryUpdate,
  Tag,
  TagInsert,
  TagUpdate,
  Article,
  ArticleInsert,
  ArticleUpdate,
  ArticleCategory,
  ArticleCategoryInsert,
  ArticleTag,
  ArticleTagInsert,
  ArticleRevision,
  Redirect,
  RedirectInsert,
  RedirectUpdate,

  // Enriched UI types
  ArticleWithAuthor,
  ArticleWithFeaturedImage,
  ArticleWithCategory,
  ArticleWithRelations,
  ArticleCard,
} from './database';
