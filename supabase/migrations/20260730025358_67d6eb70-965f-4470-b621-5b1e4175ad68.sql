CREATE OR REPLACE FUNCTION public.get_public_author_names(_ids uuid[])
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (
      SELECT 1 FROM public.blog_posts b
      WHERE b.author_id = p.id
        AND b.status = 'published'
        AND b.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.get_public_author_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_author_names(uuid[]) TO anon, authenticated, service_role;