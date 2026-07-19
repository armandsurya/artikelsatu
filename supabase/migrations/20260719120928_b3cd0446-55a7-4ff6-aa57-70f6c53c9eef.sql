-- Restrict SECURITY DEFINER function EXECUTE privileges
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_blog_post_revisions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_due_scheduled_posts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_redirect_hit(text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;

-- Ensure required grants remain
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_redirect_hit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_due_scheduled_posts() TO service_role;

-- Restrict role_permissions SELECT to staff (any role holder), not all authenticated users
DROP POLICY IF EXISTS "role_permissions readable by authenticated" ON public.role_permissions;
CREATE POLICY "role_permissions readable by staff"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));
