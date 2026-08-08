-- 1. Explicit content-manager role scoping (replaces broad has_any_role)
CREATE OR REPLACE FUNCTION public.is_content_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::public.app_role, 'editor'::public.app_role, 'author'::public.app_role)
  );
$$;
REVOKE ALL ON FUNCTION public.is_content_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_content_manager(uuid) TO authenticated;

-- 2. Sanitizer + public accessor for site_settings
CREATE OR REPLACE FUNCTION public.sanitize_public_settings(_obj jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE k text; v jsonb; res jsonb := '{}'::jsonb;
BEGIN
  IF _obj IS NULL OR jsonb_typeof(_obj) <> 'object' THEN
    RETURN COALESCE(_obj, '{}'::jsonb);
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(_obj) LOOP
    CONTINUE WHEN lower(k) = 'draft'
      OR lower(k) LIKE '%_draft'
      OR lower(k) LIKE '%secret%'
      OR lower(k) LIKE '%token%'
      OR lower(k) LIKE '%password%'
      OR lower(k) LIKE '%apikey%'
      OR lower(k) LIKE '%api_key%'
      OR lower(k) LIKE '%private%';
    IF jsonb_typeof(v) = 'object' THEN
      res := res || jsonb_build_object(k, public.sanitize_public_settings(v));
    ELSE
      res := res || jsonb_build_object(k, v);
    END IF;
  END LOOP;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.sanitize_public_settings(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_site_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sanitize_public_settings(COALESCE(s.data, '{}'::jsonb))
  FROM public.site_settings s ORDER BY s.id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_site_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_site_settings() TO anon, authenticated;

DROP POLICY IF EXISTS "settings public read" ON public.site_settings;
REVOKE SELECT ON public.site_settings FROM anon;
CREATE POLICY "settings staff read" ON public.site_settings
  FOR SELECT TO authenticated USING (public.is_content_manager(auth.uid()));

-- 3. blog_posts: anon sees published only; role check only for signed-in users
DROP POLICY IF EXISTS "posts public read published" ON public.blog_posts;
CREATE POLICY "posts anon read published" ON public.blog_posts
  FOR SELECT TO anon
  USING (status = 'published'::post_status AND deleted_at IS NULL);
CREATE POLICY "posts authenticated read" ON public.blog_posts
  FOR SELECT TO authenticated
  USING ((status = 'published'::post_status AND deleted_at IS NULL) OR public.is_content_manager(auth.uid()));

-- 4. Scope CMS write policies to content-manager roles
DROP POLICY IF EXISTS "posts admin write" ON public.blog_posts;
CREATE POLICY "posts content manager write" ON public.blog_posts
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "categories admin write" ON public.blog_categories;
CREATE POLICY "categories content manager write" ON public.blog_categories
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "revisions admin all" ON public.blog_post_revisions;
CREATE POLICY "revisions content manager all" ON public.blog_post_revisions
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "media admin all" ON public.media;
CREATE POLICY "media content manager all" ON public.media
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "media_usage admin all" ON public.media_usage;
CREATE POLICY "media_usage content manager all" ON public.media_usage
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "menu admin write" ON public.menu_items;
CREATE POLICY "menu content manager write" ON public.menu_items
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "redirects admin" ON public.redirects;
CREATE POLICY "redirects content manager" ON public.redirects
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "homepage admin write" ON public.homepage_sections;
CREATE POLICY "homepage content manager write" ON public.homepage_sections
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));
DROP POLICY IF EXISTS "homepage staff read" ON public.homepage_sections;
CREATE POLICY "homepage staff read" ON public.homepage_sections
  FOR SELECT TO authenticated USING (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "Admins manage homepage versions" ON public.homepage_section_versions;
CREATE POLICY "homepage versions content manager" ON public.homepage_section_versions
  FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "activity log read admin" ON public.activity_log;
CREATE POLICY "activity log read staff" ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "profiles readable by admins" ON public.profiles;
CREATE POLICY "profiles readable by staff" ON public.profiles
  FOR SELECT TO authenticated USING ((auth.uid() = id) OR public.is_content_manager(auth.uid()));

DROP POLICY IF EXISTS "role_permissions readable by staff" ON public.role_permissions;
CREATE POLICY "role_permissions readable by staff" ON public.role_permissions
  FOR SELECT TO authenticated USING (public.is_content_manager(auth.uid()));

-- 5. Role-check helpers must not be callable by anonymous visitors
REVOKE ALL ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;