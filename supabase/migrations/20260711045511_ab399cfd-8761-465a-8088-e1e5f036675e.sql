-- Grant EXECUTE on role-check helpers to app roles.
-- Root cause: functions had EXECUTE only for postgres/service_role, so every RLS
-- policy that called has_any_role()/has_role() as the `authenticated` role
-- failed with "permission denied for function ... (42501)".
-- Functions are SECURITY DEFINER and only read user_roles by (_user_id, _role),
-- so granting EXECUTE does not widen data access.

GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;