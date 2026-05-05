CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

GRANT EXECUTE ON FUNCTION public.perform_daily_checkin_as_service(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_linuxdo_membership_as_service(uuid, text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_key_as_service(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.perform_daily_checkin_as_service(p_user_id uuid)
RETURNS JSON AS $$
DECLARE
  v_current_credits INTEGER;
  v_reward_credits INTEGER := 10;
  v_credit_limit INTEGER := 10;
  v_new_credits INTEGER;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN JSON_BUILD_OBJECT('status', 'error', 'message', 'Unauthorized');
  END IF;

  SELECT COALESCE(ai_chat_count, 0) INTO v_current_credits
  FROM public.users
  WHERE id = p_user_id;

  SELECT COALESCE(
    CASE membership
      WHEN 'pro' THEN 50
      WHEN 'plus' THEN 20
      ELSE 10
    END, 10
  ) INTO v_credit_limit
  FROM public.users
  WHERE id = p_user_id;

  IF EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE user_id = p_user_id AND checkin_date = CURRENT_DATE
  ) THEN
    RETURN JSON_BUILD_OBJECT(
      'status', 'already_checked_in',
      'credits', v_current_credits,
      'credit_limit', v_credit_limit
    );
  END IF;

  IF v_current_credits >= v_credit_limit THEN
    RETURN JSON_BUILD_OBJECT(
      'status', 'credit_cap_reached',
      'credits', v_current_credits,
      'credit_limit', v_credit_limit
    );
  END IF;

  v_new_credits := v_current_credits + v_reward_credits;

  INSERT INTO public.daily_checkins (user_id, checkin_date, reward_credits)
  VALUES (p_user_id, CURRENT_DATE, v_reward_credits);

  UPDATE public.users
  SET ai_chat_count = v_new_credits
  WHERE id = p_user_id;

  RETURN JSON_BUILD_OBJECT(
    'status', 'ok',
    'reward_credits', v_reward_credits,
    'credits', v_new_credits,
    'credit_limit', v_credit_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;