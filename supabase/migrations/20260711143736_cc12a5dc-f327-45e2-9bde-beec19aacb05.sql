
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS seo_report jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_editor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS blog_posts_scheduled_idx ON public.blog_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS blog_posts_deleted_idx ON public.blog_posts(deleted_at);

DROP POLICY IF EXISTS "posts public read published" ON public.blog_posts;
CREATE POLICY "posts public read published" ON public.blog_posts
  FOR SELECT
  USING (
    (status = 'published' AND deleted_at IS NULL)
    OR has_any_role(auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.blog_post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  title text,
  slug text,
  excerpt text,
  content jsonb,
  featured_image text,
  meta_title text,
  meta_description text,
  canonical_url text,
  tags text[] NOT NULL DEFAULT '{}',
  category_id uuid,
  status public.post_status,
  seo_score integer,
  reason text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, revision_number)
);
CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON public.blog_post_revisions(post_id, revision_number DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_revisions TO authenticated;
GRANT ALL ON public.blog_post_revisions TO service_role;

ALTER TABLE public.blog_post_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revisions admin all" ON public.blog_post_revisions
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.prune_blog_post_revisions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM public.blog_post_revisions
  WHERE post_id = NEW.post_id
    AND id IN (
      SELECT id FROM public.blog_post_revisions
      WHERE post_id = NEW.post_id
      ORDER BY revision_number DESC
      OFFSET 50
    );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS blog_post_revisions_prune ON public.blog_post_revisions;
CREATE TRIGGER blog_post_revisions_prune
  AFTER INSERT ON public.blog_post_revisions
  FOR EACH ROW EXECUTE FUNCTION public.prune_blog_post_revisions();

CREATE OR REPLACE FUNCTION public.publish_due_scheduled_posts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.blog_posts
    SET status = 'published',
        published_at = COALESCE(published_at, scheduled_at, now()),
        updated_at = now()
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
      AND deleted_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END; $$;

REVOKE EXECUTE ON FUNCTION public.publish_due_scheduled_posts() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-blog-posts') THEN
    PERFORM cron.unschedule('publish-scheduled-blog-posts');
  END IF;
  PERFORM cron.schedule(
    'publish-scheduled-blog-posts',
    '* * * * *',
    $cron$ SELECT public.publish_due_scheduled_posts(); $cron$
  );
END $$;
