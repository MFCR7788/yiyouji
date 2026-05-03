-- 修复签到奖励为固定 10 积分
-- 替换原有的随机奖励逻辑

CREATE OR REPLACE FUNCTION public.perform_daily_checkin_as_service(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_today date;
    v_existing record;
    v_user_info record;
    v_new_credits integer;
    v_reward integer := 10;
BEGIN
    v_today := CURRENT_DATE;

    SELECT * INTO v_existing 
    FROM public.daily_checkins 
    WHERE user_id = p_user_id AND checkin_date = v_today;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_checked_in',
            'reward_credits', v_existing.reward_credits
        );
    END IF;

    SELECT ai_chat_count, membership INTO v_user_info
    FROM public.users WHERE id = p_user_id;

    IF v_user_info IS NULL THEN
        RETURN jsonb_build_object('status', 'error');
    END IF;

    INSERT INTO public.daily_checkins (user_id, checkin_date, reward_credits)
    VALUES (p_user_id, v_today, v_reward);

    UPDATE public.users
    SET ai_chat_count = ai_chat_count + v_reward
    WHERE id = p_user_id
    RETURNING ai_chat_count INTO v_new_credits;

    RETURN jsonb_build_object(
        'status', 'ok',
        'reward_credits', v_reward,
        'credits', v_new_credits
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public;
