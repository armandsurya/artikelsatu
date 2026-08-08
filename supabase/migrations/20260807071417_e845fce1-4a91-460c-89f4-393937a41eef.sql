REVOKE ALL ON public.homepage_sections FROM anon;
GRANT SELECT (id, section_key, title, is_visible, sort_order, data, updated_at, status, last_published_at) ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
DROP POLICY IF EXISTS "homepage public read" ON public.homepage_sections;
CREATE POLICY "homepage public read" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (true);
