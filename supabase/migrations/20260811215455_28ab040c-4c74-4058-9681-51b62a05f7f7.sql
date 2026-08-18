
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_verified(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_alerts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_verified(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_alerts(uuid) TO authenticated, service_role;
