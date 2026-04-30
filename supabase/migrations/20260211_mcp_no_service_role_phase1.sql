-- MCP no-service-role phase 1
-- 目标：
-- 1) MCP 主链路改为 RLS + RPC，不再依赖 service role
-- 2) 永久封禁语义下沉到数据库层（防止用户态绕过）

-- 1) 表结构增强：增加永久封禁标记
ALTER TABLE public.mcp_api_keys
    ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2) 热路径索引：仅索引可认证 key（active + 非封禁）
DROP INDEX IF EXISTS public.idx_mcp_api_keys_active_key;
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active_key
    ON public.mcp_api_keys (key_code)
    WHERE is_active = true AND is_banned = false;

-- 3) RLS 策略：用户态读写本人 key（且更新仅限未封禁）
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mcp key" ON public.mcp_api_keys;
DROP POLICY IF EXISTS "Service role full access on mcp_api_keys" ON public.mcp_api_keys;
DROP POLICY IF EXISTS "Users can insert own mcp key" ON public.mcp_api_keys;
DROP POLICY IF EXISTS "Users can update own active mcp key" ON public.mcp_api_keys;

CREATE POLICY "Users can view own mcp key"
    ON public.mcp_api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mcp key"
    ON public.mcp_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_banned = false);

CREATE POLICY "Users can update own active mcp key"
    ON public.mcp_api_keys FOR UPDATE
    USING (auth.uid() = user_id AND is_banned = false)
    WITH CHECK (auth.uid() = user_id AND is_banned = false);

-- 4) 更新守卫：禁止用户态修改受保护字段，且封禁后不可重置
CREATE OR REPLACE FUNCTION public.guard_mcp_key_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
        -- 仅允许操作自身记录
        IF auth.uid() IS NULL OR OLD.user_id <> auth.uid() THEN
            RAISE EXCEPTION 'Forbidden to update this key';
        END IF;

        -- 被永久封禁后，禁止用户态更新（含重置 key）
        IF OLD.is_banned THEN
            RAISE EXCEPTION 'Current account mcp key is permanently banned';
        END IF;

        -- 用户态禁止修改受保护字段
        IF NEW.user_id <> OLD.user_id
           OR NEW.is_active <> OLD.is_active
           OR NEW.is_banned <> OLD.is_banned
           OR NEW.reset_count <> OLD.reset_count
           OR NEW.created_at <> OLD.created_at THEN
            RAISE EXCEPTION 'Forbidden field update on mcp key';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mcp_key_user_updates ON public.mcp_api_keys;
CREATE TRIGGER trg_guard_mcp_key_user_updates
    BEFORE UPDATE ON public.mcp_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_mcp_key_user_updates();

-- 5) MCP server 认证 RPC（anon 可执行，无表级权限）
CREATE OR REPLACE FUNCTION public.mcp_verify_api_key(p_key_code text)
RETURNS TABLE(key_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT k.id, k.user_id
    FROM public.mcp_api_keys k
    WHERE k.key_code = p_key_code
      AND k.is_active = true
      AND k.is_banned = false
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_touch_key_last_used(p_key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.mcp_api_keys
    SET last_used_at = now()
    WHERE id = p_key_id
      AND is_active = true
      AND is_banned = false;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_verify_api_key(text) FROM public;
REVOKE ALL ON FUNCTION public.mcp_touch_key_last_used(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mcp_verify_api_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_touch_key_last_used(uuid) TO anon, authenticated;

-- 6) 管理员 RPC（authenticated 可调用，函数内强制 admin 校验）
CREATE OR REPLACE FUNCTION public.admin_list_mcp_keys(p_is_active boolean DEFAULT NULL)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    key_code text,
    is_active boolean,
    is_banned boolean,
    created_at timestamptz,
    last_used_at timestamptz,
    user_email text,
    user_nickname text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid() AND u.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admin can access mcp key list' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        k.id,
        k.user_id,
        k.key_code,
        k.is_active,
        k.is_banned,
        k.created_at,
        k.last_used_at,
        au.email::text AS user_email,
        u.nickname::text AS user_nickname
    FROM public.mcp_api_keys k
    LEFT JOIN public.users u ON u.id = k.user_id
    LEFT JOIN auth.users au ON au.id = k.user_id
    WHERE p_is_active IS NULL OR k.is_active = p_is_active
    ORDER BY k.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_mcp_key(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected integer := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid() AND u.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admin can revoke mcp key' USING ERRCODE = '42501';
    END IF;

    UPDATE public.mcp_api_keys
    SET is_active = false,
        is_banned = true
    WHERE user_id = p_user_id;

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_mcp_keys(boolean) FROM public;
REVOKE ALL ON FUNCTION public.admin_revoke_mcp_key(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_mcp_keys(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_mcp_key(uuid) TO authenticated;
