-- 修复积分扣减函数 - 添加对 amount 参数的支持
-- 这个迁移需要手动在服务器上执行，因为 GitHub Actions 部署不会自动执行迁移

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

-- 更新权限以支持新的函数签名
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO authenticated;

-- 保留旧版本的权限（向后兼容）
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO authenticated;