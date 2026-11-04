-- Fix the public.media UPDATE policy.
-- The WITH CHECK subqueries previously reused the table name, so "media.id"
-- bound to the inner row (media_1.id = media_1.id) and returned every row,
-- failing every update once 2+ rows existed. The inner alias "m" now
-- correlates each subquery with the row being updated. USING is unchanged.
DROP POLICY IF EXISTS "Uploader or admin can update media" ON public.media;

CREATE POLICY "Uploader or admin can update media"
  ON public.media FOR UPDATE
  USING ( uploaded_by = auth.uid() OR public.is_admin() )
  WITH CHECK (
    storage_path = (SELECT m.storage_path FROM public.media m WHERE m.id = media.id)
    AND uploaded_by = (SELECT m.uploaded_by FROM public.media m WHERE m.id = media.id)
  );
