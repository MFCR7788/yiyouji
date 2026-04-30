-- MCP logging rollback (idempotent)
-- 目标：
-- 1) 删除 mcp_access_logs 表（含 request_id 列）
-- 2) 清理历史索引（含 request_id 索引）
-- 3) 支持重复执行，不因对象不存在而失败

BEGIN;

-- 历史日志索引（不同版本可能存在）
DROP INDEX IF EXISTS public.idx_mcp_access_logs_request_id;
DROP INDEX IF EXISTS public.idx_mcp_access_logs_user_created;
DROP INDEX IF EXISTS public.idx_mcp_access_logs_created_at;

-- 直接删除日志表；CASCADE 会一并清理策略/依赖
DROP TABLE IF EXISTS public.mcp_access_logs CASCADE;

COMMIT;
