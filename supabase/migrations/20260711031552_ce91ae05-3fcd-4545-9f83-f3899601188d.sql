
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'editor', 'author');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "role owners read own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by admins" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_any_role(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles super admin manage" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Auto-create profile + first-user-becomes-super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_count INT;
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'super_admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- BLOG
-- =========================================================
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
GRANT SELECT ON public.blog_categories TO anon;
GRANT ALL ON public.blog_categories TO service_role;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));
CREATE TRIGGER blog_categories_set_updated_at BEFORE UPDATE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.post_status AS ENUM ('draft', 'published');

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content JSONB,
  featured_image TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.post_status NOT NULL DEFAULT 'draft',
  read_time INT NOT NULL DEFAULT 5,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT SELECT ON public.blog_posts TO anon;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read published" ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.has_any_role(auth.uid()));
CREATE POLICY "posts admin write" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX blog_posts_status_idx ON public.blog_posts(status);
CREATE INDEX blog_posts_category_idx ON public.blog_posts(category_id);

-- =========================================================
-- MEDIA
-- =========================================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media admin all" ON public.media FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));

-- =========================================================
-- HOMEPAGE SECTIONS
-- =========================================================
CREATE TABLE public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT SELECT ON public.homepage_sections TO anon;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homepage public read" ON public.homepage_sections FOR SELECT USING (true);
CREATE POLICY "homepage admin write" ON public.homepage_sections FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));
CREATE TRIGGER homepage_sections_set_updated_at BEFORE UPDATE ON public.homepage_sections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed section keys
INSERT INTO public.homepage_sections(section_key, title, sort_order) VALUES
('hero',NULL,1),('stats',NULL,2),('problems','Masalah yang Sering Dialami',3),
('solutions','Solusi Kami',4),('workflow','Cara Kerja Kami',5),('advantages','Keunggulan Kami',6),
('services','Layanan Kami',7),('portfolio','Contoh Hasil Artikel',8),('pricing','Paket Harga',9),
('comparison','Kenapa Memilih Kami',10),('faq','Pertanyaan yang Sering Diajukan',11),
('blogPreview','Artikel Terbaru',12),('cta',NULL,13);

-- =========================================================
-- SITE SETTINGS (single row, key/value JSON)
-- =========================================================
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT SELECT ON public.site_settings TO anon;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin update" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings(id, data) VALUES (1, '{
  "siteName":"ArtikelPro","logo":"ArtikelPro","whatsapp":"6282214949685",
  "email":"halo@artikelpro.id","address":"Jakarta, Indonesia",
  "seoTitle":"ArtikelPro — Jasa Pembuatan Artikel SEO Berkualitas",
  "seoDescription":"Jasa penulisan artikel SEO berbahasa Indonesia.",
  "social":[{"label":"Instagram","url":"https://instagram.com"}]
}'::jsonb);

-- =========================================================
-- MENU (header/footer)
-- =========================================================
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('header','footer')),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT ON public.menu_items TO anon;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu public read" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "menu admin write" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));

-- =========================================================
-- REDIRECTS
-- =========================================================
CREATE TABLE public.redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  code INT NOT NULL DEFAULT 301 CHECK (code IN (301,302)),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirects TO authenticated;
GRANT ALL ON public.redirects TO service_role;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redirects admin" ON public.redirects FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));

-- =========================================================
-- IP LISTS + ACTIVITY LOG
-- =========================================================
CREATE TABLE public.ip_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  list_type TEXT NOT NULL CHECK (list_type IN ('block','allow')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ip, list_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_lists TO authenticated;
GRANT ALL ON public.ip_lists TO service_role;
ALTER TABLE public.ip_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iplists super admin" ON public.ip_lists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  ip TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity log read admin" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "activity log insert self" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX activity_log_created_idx ON public.activity_log(created_at DESC);
