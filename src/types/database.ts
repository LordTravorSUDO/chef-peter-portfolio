/**
 * Supabase database type definitions.
 *
 * These types are manually maintained to mirror the SQL schema in:
 *   supabase/migrations/
 *
 * After any schema change, regenerate automatically with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
 *
 * See: https://supabase.com/docs/guides/api/rest/generating-types
 */

// ---------------------------------------------------------------------------
// Enum literals (mirror public.article_status and public.user_role)
// ---------------------------------------------------------------------------

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';
import type { ArticleType } from '../lib/knowledge/articleTypes';
import type { RecipeData } from '../lib/knowledge/recipe';
export type { ArticleType, RecipeData };
export type UserRole      = 'admin' | 'editor';

// ---------------------------------------------------------------------------
// Database shape — used by createClient<Database>(...)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles:           { Row: Profile;          Insert: ProfileInsert;         Update: ProfileUpdate;         };
      media:              { Row: Media;             Insert: MediaInsert;           Update: MediaUpdate;           };
      categories:         { Row: Category;          Insert: CategoryInsert;        Update: CategoryUpdate;        };
      tags:               { Row: Tag;               Insert: TagInsert;             Update: TagUpdate;             };
      articles:           { Row: Article;           Insert: ArticleInsert;         Update: ArticleUpdate;         };
      article_categories: { Row: ArticleCategory;   Insert: ArticleCategoryInsert; Update: ArticleCategoryUpdate; };
      article_tags:       { Row: ArticleTag;        Insert: ArticleTagInsert;      Update: ArticleTagUpdate;      };
      article_revisions:  { Row: ArticleRevision;   Insert: never;                 Update: never;                 };
      redirects:          { Row: Redirect;          Insert: RedirectInsert;        Update: RedirectUpdate;        };
    };
    Views:     Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      article_status: ArticleStatus;
      user_role:      UserRole;
    };
  };
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export interface Profile {
  id:           string;       // uuid — matches auth.users.id
  display_name: string;
  avatar_url:   string | null;
  role:         UserRole;
  is_active:    boolean;
  created_at:   string;       // ISO 8601
  updated_at:   string;
}

/** Clients never insert profiles directly — the DB trigger handles it. */
export type ProfileInsert = Pick<Profile, 'id'> & Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
export type ProfileUpdate  = Partial<Pick<Profile, 'display_name' | 'avatar_url'>>;

// ---------------------------------------------------------------------------
// media
// ---------------------------------------------------------------------------

export interface Media {
  id:                string;
  storage_path:      string;      // relative path in the article-media bucket
  original_filename: string;
  mime_type:         string;
  file_size_bytes:   number;
  width_px:          number | null;
  height_px:         number | null;
  alt_text:          string | null;
  caption:           string | null;
  credit:            string | null;
  uploaded_by:       string;      // uuid → profiles.id
  created_at:        string;
  updated_at:        string;
}

export type MediaInsert = Omit<Media, 'id' | 'created_at' | 'updated_at'>;
export type MediaUpdate  = Partial<Pick<Media, 'alt_text' | 'caption' | 'credit'>>;

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export interface Category {
  id:          string;
  slug:        string;        // CITEXT in DB — always treated as lowercase
  name:        string;
  description: string | null;
  image_id:    string | null; // uuid → media.id
  /** Knowledge-platform migration (proposed). Absent until it is applied. */
  sort_order?: number;
  /** Knowledge-platform migration (proposed). FALSE hides it from public navigation. */
  is_active?:  boolean;
  created_at:  string;
  updated_at:  string;
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type CategoryUpdate  = Partial<CategoryInsert>;

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------

export interface Tag {
  id:         string;
  slug:       string;         // CITEXT in DB — always treated as lowercase
  name:       string;
  created_at: string;
}

export type TagInsert = Omit<Tag, 'id' | 'created_at'>;
export type TagUpdate  = Partial<TagInsert>;

// ---------------------------------------------------------------------------
// articles
// ---------------------------------------------------------------------------

export interface Article {
  id:                   string;
  slug:                 string;          // CITEXT — URL-safe lowercase
  title:                string;
  excerpt:              string;
  body:                 string;          // sanitised HTML
  /** Computed column — always returned by DB, never sent on insert/update */
  reading_time_minutes: number;
  author_id:            string;          // uuid → profiles.id
  author_display_name:  string;
  featured_image_id:    string | null;   // uuid → media.id
  status:               ArticleStatus;
  published_at:         string | null;   // ISO 8601
  scheduled_for:        string | null;   // ISO 8601
  seo_title:            string | null;
  meta_description:     string | null;
  canonical_url:        string | null;
  noindex:              boolean;
  social_image_id:      string | null;   // uuid → media.id
  view_count:           number;
  // ── Knowledge-platform migration (proposed) — absent until it is applied ──
  /** Editorial format — see src/lib/knowledge/articleTypes.ts */
  article_type?:        ArticleType;
  is_featured?:         boolean;
  is_editors_pick?:     boolean;
  /** Structured recipe / tutorial data — see src/lib/knowledge/recipe.ts */
  recipe?:              RecipeData | null;
  created_at:           string;
  updated_at:           string;
}

/** reading_time_minutes is GENERATED ALWAYS — excluded from all writes */
export type ArticleInsert = Omit<Article,
  'id' | 'reading_time_minutes' | 'view_count' | 'created_at' | 'updated_at'
>;
export type ArticleUpdate  = Partial<Omit<ArticleInsert, 'author_id'>>;

// ---------------------------------------------------------------------------
// article_categories
// ---------------------------------------------------------------------------

export interface ArticleCategory {
  article_id:  string;
  category_id: string;
  is_primary:  boolean;
}

export type ArticleCategoryInsert = ArticleCategory;
export type ArticleCategoryUpdate = Pick<ArticleCategory, 'is_primary'>;

// ---------------------------------------------------------------------------
// article_tags
// ---------------------------------------------------------------------------

export interface ArticleTag {
  article_id: string;
  tag_id:     string;
}

export type ArticleTagInsert = ArticleTag;
export type ArticleTagUpdate = Record<string, never>; // join table has no updatable columns

// ---------------------------------------------------------------------------
// article_revisions (read-only from client — written only by DB trigger)
// ---------------------------------------------------------------------------

export interface ArticleRevision {
  id:          string;
  article_id:  string;
  revision_no: number;
  title:       string;
  body:        string;
  excerpt:     string;
  saved_by:    string;      // uuid → profiles.id
  change_note: string | null;
  created_at:  string;
}

// ---------------------------------------------------------------------------
// redirects
// ---------------------------------------------------------------------------

export interface Redirect {
  id:          string;
  from_path:   string;      // must start with /
  to_path:     string;
  status_code: 301 | 302;
  article_id:  string | null;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

export type RedirectInsert = Omit<Redirect, 'id' | 'created_at' | 'updated_at'>;
export type RedirectUpdate  = Partial<RedirectInsert>;

// ---------------------------------------------------------------------------
// Derived / enriched types used in UI queries
// ---------------------------------------------------------------------------

/** Article with its resolved author profile */
export interface ArticleWithAuthor extends Article {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
}

/** Article with resolved featured image */
export interface ArticleWithFeaturedImage extends Article {
  /** caption/credit are present when the query selects media(*) (public article page) */
  featured_image: (Pick<Media, 'id' | 'storage_path' | 'alt_text' | 'width_px' | 'height_px'> & Partial<Pick<Media, 'caption' | 'credit'>>) | null;
}

/** Article with primary category (for listing cards) */
export interface ArticleWithCategory extends Article {
  article_categories: Array<{
    is_primary: boolean;
    categories: Pick<Category, 'id' | 'slug' | 'name'> | null;
  }>;
}

/** Article with all relations for the full article page render */
export interface ArticleWithRelations extends ArticleWithAuthor, ArticleWithFeaturedImage {
  article_categories: Array<{
    is_primary: boolean;
    categories: Category | null;
  }>;
  article_tags: Array<{
    tags: Tag | null;
  }>;
  /** Present when the query selects the social_image relation (admin editor, preview) */
  social_image?: Pick<Media, 'id' | 'storage_path' | 'alt_text'> | null;
}

/** Slim card projection used in /articles listing — avoids fetching body */
export interface ArticleCard
  extends Pick<Article,
    'id' | 'slug' | 'title' | 'excerpt' | 'reading_time_minutes' |
    'published_at' | 'status' | 'featured_image_id' |
    'article_type' | 'is_featured' | 'is_editors_pick'
  > {
  updated_at?: string;
  article_categories: Array<{
    is_primary: boolean;
    categories: Pick<Category, 'id' | 'slug' | 'name'> | null;
  }>;
  article_tags: Array<{
    tags: Pick<Tag, 'id' | 'slug' | 'name'> | null;
  }>;
  featured_image: Pick<Media, 'storage_path' | 'alt_text'> | null;
}
