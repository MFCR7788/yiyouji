CREATE OR REPLACE FUNCTION public.claim_linuxdo_membership_as_service(p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || md5('linuxdo_monthly_claim:' || p_user_id::TEXT))::BIT(64)::BIGINT);
  
  UPDATE public.users
  SET membership = 'plus',
      membership_expires_at = NOW() + INTERVAL '30 days'
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_linuxdo_membership_as_service(uuid) TO authenticated;