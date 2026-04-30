-- 积分扣减函数
CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid)
RETURNS integer AS $$
DECLARE
    remaining integer;
BEGIN
    UPDATE public.users
    SET ai_chat_count = ai_chat_count - 1
    WHERE id = user_id AND ai_chat_count > 0
    RETURNING ai_chat_count INTO remaining;
    
    IF remaining IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN remaining;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public;

-- 积分增加函数
CREATE OR REPLACE FUNCTION public.increment_ai_chat_count(user_id uuid, amount integer)
RETURNS integer AS $$
DECLARE
    remaining integer;
BEGIN
    UPDATE public.users
    SET ai_chat_count = ai_chat_count + amount
    WHERE id = user_id
    RETURNING ai_chat_count INTO remaining;
    
    IF remaining IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN remaining;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_ai_chat_count(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_ai_chat_count(uuid, integer) TO authenticated;
