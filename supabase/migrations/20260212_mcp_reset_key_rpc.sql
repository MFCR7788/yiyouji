-- mcp_reset_key RPC
-- 用户重置 key 时原子性更新 key_code + 递增 reset_count + 清空 last_used_at
-- SECURITY DEFINER 绕过 guard trigger 对 reset_count 的保护

CREATE OR REPLACE FUNCTION public.mcp_reset_key(p_user_id uuid, p_new_key_code text)
RETURNS SETOF public.mcp_api_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 仅允许用户重置自己的 key
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Forbidden: can only reset own key' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    UPDATE public.mcp_api_keys
    SET key_code = p_new_key_code,
        reset_count = reset_count + 1,
        last_used_at = NULL
    WHERE user_id = p_user_id
      AND is_active = true
      AND is_banned = false
    RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_reset_key(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mcp_reset_key(uuid, text) TO authenticated;
