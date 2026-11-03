-- =============================================================================
-- Migration 001: Enable required PostgreSQL extensions
-- =============================================================================
-- Run order: 1 of 8
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards everywhere)
-- =============================================================================

-- uuid_generate_v4() and gen_random_uuid() — both available after this
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pg_trgm enables fast trigram-based ILIKE full-text searches on articles
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- citext provides case-insensitive text comparisons (used on slug columns)
CREATE EXTENSION IF NOT EXISTS "citext";
