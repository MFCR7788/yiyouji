REVOKE EXECUTE ON FUNCTION public.perform_daily_checkin_as_service(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_linuxdo_membership_as_service(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_key_as_service(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_mcp_keys() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_reset_key(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_scheduled_reminder_delivery_as_service() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.perform_daily_checkin_as_service(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_linuxdo_membership_as_service(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_key_as_service(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_mcp_keys() TO service_role;
GRANT EXECUTE ON FUNCTION public.mcp_reset_key(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_scheduled_reminder_delivery_as_service() TO service_role;