
-- Extend media table with DAM metadata
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS alt text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS media_set_updated_at ON public.media;
CREATE TRIGGER media_set_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Usage tracking table: where is a media used?
CREATE TABLE IF NOT EXISTS public.media_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  context text NOT NULL,           -- e.g. 'homepage_section', 'blog_post', 'site_settings', 'seo'
  context_id text NOT NULL,        -- e.g. 'hero', uuid of blog post, 'header'
  field text NOT NULL,             -- e.g. 'image', 'og_image', 'logo'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, context, context_id, field)
);

CREATE INDEX IF NOT EXISTS media_usage_media_idx ON public.media_usage(media_id);
CREATE INDEX IF NOT EXISTS media_usage_ctx_idx ON public.media_usage(context, context_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_usage TO authenticated;
GRANT ALL ON public.media_usage TO service_role;

ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_usage admin all" ON public.media_usage
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));
