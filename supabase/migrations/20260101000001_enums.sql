-- =============================================================================
-- Migration 002: Create shared enum types
-- =============================================================================
-- Run order: 2 of 8
-- =============================================================================

-- Article lifecycle states
DO $$ BEGIN
  CREATE TYPE public.article_status AS ENUM (
    'draft',       -- saved but not visible to the public
    'published',   -- live and publicly readable
    'scheduled',   -- will become published at scheduled_for timestamp
    'archived'     -- removed from public listing but not deleted
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User roles within the CMS
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'admin',   -- full create / edit / delete / publish access
    'editor'   -- create and edit; cannot publish or delete
    -- Future roles can be added here without breaking existing data
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
