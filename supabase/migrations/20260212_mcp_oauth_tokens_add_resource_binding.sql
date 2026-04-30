-- 为 refresh token 增加 resource 绑定，防止跨资源扩权
alter table public.mcp_oauth_tokens
  add column if not exists resource text;

comment on column public.mcp_oauth_tokens.resource is
  'OAuth resource indicator (RFC 8707) bound at authorization time';
