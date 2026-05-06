-- 修复积分扣减函数 - 支持自定义扣减数量
CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid, amount integer DEFAULT 1)
RETURNS integer AS $$
DECLARE
    remaining integer;
BEGIN
    UPDATE public.users
    SET ai_chat_count = ai_chat_count - amount
    WHERE id = user_id AND ai_chat_count >= amount
    RETURNING ai_chat_count INTO remaining;
    
    IF remaining IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN remaining;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public;

-- 更新权限
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO authenticated;