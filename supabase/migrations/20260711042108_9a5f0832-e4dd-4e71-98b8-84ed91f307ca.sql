
-- Add draft/publish columns to homepage_sections
ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS draft_data jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_saved_by uuid;

-- Initialize existing rows: treat current data as published
UPDATE public.homepage_sections
  SET draft_data = data, status = 'published', last_published_at = COALESCE(last_published_at, updated_at)
  WHERE draft_data IS NULL;

-- Versions table
CREATE TABLE IF NOT EXISTS public.homepage_section_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL,
  version int NOT NULL,
  title text,
  data jsonb NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (section_key, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_section_versions TO authenticated;
GRANT ALL ON public.homepage_section_versions TO service_role;

ALTER TABLE public.homepage_section_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage homepage versions"
  ON public.homepage_section_versions
  FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));
