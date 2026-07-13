
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions readable by authenticated"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions managed by super_admin"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER role_permissions_set_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- has_permission: super_admin selalu true; lainnya cek matriks
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND rp.permission = _permission
        AND rp.allowed = true
    );
$$;

-- Seed default matrix
INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('super_admin','homepage',true),('super_admin','blog',true),('super_admin','media',true),
  ('super_admin','seo',true),('super_admin','redirect',true),('super_admin','users',true),
  ('super_admin','roles',true),('super_admin','settings',true),('super_admin','security',true),
  ('super_admin','log',true),
  ('editor','homepage',true),('editor','blog',true),('editor','media',true),
  ('editor','seo',true),('editor','redirect',false),('editor','users',false),
  ('editor','roles',false),('editor','settings',false),('editor','security',false),
  ('editor','log',true),
  ('author','homepage',false),('author','blog',true),('author','media',true),
  ('author','seo',false),('author','redirect',false),('author','users',false),
  ('author','roles',false),('author','settings',false),('author','security',false),
  ('author','log',false)
ON CONFLICT (role, permission) DO NOTHING;
