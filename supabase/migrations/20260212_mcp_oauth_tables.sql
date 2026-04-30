-- MCP OAuth 2.1 表结构
-- 支持动态客户端注册、授权码、Refresh Token

-- 1. OAuth 动态注册客户端
CREATE TABLE public.mcp_oauth_clients (
  client_id text PRIMARY KEY,
  client_secret text,
  client_secret_expires_at bigint,
  client_id_issued_at bigint NOT NULL DEFAULT extract(epoch from now()),
  redirect_uris text[] NOT NULL,
  grant_types text[] DEFAULT '{authorization_code,refresh_token}',
  response_types text[] DEFAULT '{code}',
  token_endpoint_auth_method text DEFAULT 'none',
  client_name text,
  client_uri text,
  logo_uri text,
  scope text,
  created_at timestamptz DEFAULT now()
);

-- 2. OAuth 授权码（短生命周期）
CREATE TABLE public.mcp_oauth_codes (
  code text PRIMARY KEY,
  client_id text NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  scope text,
  resource text,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. OAuth Refresh Token
CREATE TABLE public.mcp_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refresh_token text UNIQUE NOT NULL,
  client_id text NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope text,
  expires_at timestamptz NOT NULL,
  revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX idx_oauth_codes_expires ON mcp_oauth_codes(expires_at) WHERE NOT used;
CREATE INDEX idx_oauth_tokens_user ON mcp_oauth_tokens(user_id) WHERE NOT revoked;
CREATE INDEX idx_oauth_tokens_refresh ON mcp_oauth_tokens(refresh_token) WHERE NOT revoked;

-- RLS（仅 service role 可操作，MCP 服务器使用 service role 连接）
ALTER TABLE mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON mcp_oauth_clients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON mcp_oauth_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON mcp_oauth_tokens FOR ALL USING (auth.role() = 'service_role');
