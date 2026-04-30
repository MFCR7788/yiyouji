-- 添加 result_data 列到 hepan_charts 表
-- 用于存储完整的合盘计算结果，避免历史查看时重新计算（可能有随机性）

ALTER TABLE public.hepan_charts
ADD COLUMN IF NOT EXISTS result_data jsonb;

-- 添加注释
COMMENT ON COLUMN public.hepan_charts.result_data IS '完整的合盘计算结果（dimensions, conflicts, overallScore 等）';
