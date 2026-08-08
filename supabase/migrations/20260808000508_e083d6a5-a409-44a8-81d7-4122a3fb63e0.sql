DROP POLICY IF EXISTS "homepage public read" ON public.homepage_sections;

REVOKE SELECT ON public.homepage_sections FROM anon;
GRANT SELECT (id, section_key, title, is_visible, sort_order, data, updated_at, last_published_at) ON public.homepage_sections TO anon;

CREATE POLICY "homepage anon read published" ON public.homepage_sections
  FOR SELECT TO anon USING (true);

CREATE POLICY "homepage staff read" ON public.homepage_sections
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));