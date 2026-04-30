-- MCP API Keys
-- 每用户唯一 MCP Key

-- 1. mcp_api_keys: 每用户一个 MCP Key
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_code text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    reset_count integer NOT NULL DEFAULT 0,
    CONSTRAINT mcp_api_keys_user_id_unique UNIQUE (user_id),
    CONSTRAINT mcp_api_keys_key_code_unique UNIQUE (key_code)
);

-- 热路径索引：按 key_code 查找活跃 key
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active_key
    ON public.mcp_api_keys (key_code) WHERE is_active = true;

-- RLS
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mcp key"
    ON public.mcp_api_keys FOR SELECT
    USING (auth.uid() = user_id);

-- Service role 可完全操作（用于后端 API）
CREATE POLICY "Service role full access on mcp_api_keys"
    ON public.mcp_api_keys FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
