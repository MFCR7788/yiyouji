-- Migration: Add sidebar_config to user_settings table
-- Created: 2026-01-23

-- 添加侧边栏配置字段到用户设置表
-- sidebar_config 存储格式: { "hidden": ["tarot", "liuyao"], "order": ["bazi", "ziwei", ...] }
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sidebar_config JSONB DEFAULT '{}';

-- 添加注释说明字段用途
COMMENT ON COLUMN public.user_settings.sidebar_config IS 
    '用户侧边栏自定义配置: { "hidden": string[], "order": string[] }';
