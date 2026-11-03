-- =============================================================================
-- Migration 004: media table + Storage bucket policy
-- =============================================================================
-- Run order: 4 of 8
--
-- The media table is the metadata registry for files stored in the
-- Supabase Storage bucket named "article-media".
-- File bytes live in Storage; this table records who uploaded what and why.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.media (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Storage object path within the "article-media" bucket
  -- e.g. "covers/2026/sourdough-loaf.webp"
  storage_path      TEXT         NOT NULL UNIQUE,
  original_filename TEXT         NOT NULL,
  mime_type         TEXT         NOT NULL,
  -- File size in bytes
  file_size_bytes   BIGINT       NOT NULL CHECK (file_size_bytes > 0),
  -- Pixel dimensions — null for non-image files
  width_px          INT,
  height_px         INT,
  -- Descriptive metadata
  alt_text          TEXT,
  caption           TEXT,
  credit            TEXT,        -- photographer / source attribution
  -- Ownership
  uploaded_by       UUID         NOT NULL REFERENCES public.profiles(id)
                                   ON DELETE RESTRICT,  -- block profile deletion if media exists
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.media IS
  'Metadata registry for files stored in the article-media Storage bucket.';
COMMENT ON COLUMN public.media.storage_path IS
  'Relative path within the article-media bucket. Use supabase.storage.from(''article-media'').getPublicUrl(storage_path) to resolve.';

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON public.media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_mime        ON public.media(mime_type);

DROP TRIGGER IF EXISTS media_updated_at ON public.media;
CREATE TRIGGER media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Public can read all media metadata (needed to render images in articles)
CREATE POLICY "Public can read media"
  ON public.media FOR SELECT
  USING (TRUE);

-- Any authenticated user (admin or editor) may upload
CREATE POLICY "Authenticated users can insert media"
  ON public.media FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()   -- uploader must match the caller
  );

-- Uploader or admin may update metadata (alt text, caption, credit)
CREATE POLICY "Uploader or admin can update media"
  ON public.media FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    -- storage_path and uploaded_by are immutable after insert
    storage_path = (SELECT storage_path FROM public.media WHERE id = media.id)
    AND uploaded_by = (SELECT uploaded_by FROM public.media WHERE id = media.id)
  );

-- Only admins may delete media records (prevent orphan/dangling references)
CREATE POLICY "Admins can delete media"
  ON public.media FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- NOTE: Storage bucket policies must be created via the Supabase Dashboard
-- or via supabase/config.toml (CLI). They cannot be set in SQL migrations.
-- See docs/supabase-setup.md for the exact bucket configuration steps.
-- =============================================================================
