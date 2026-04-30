-- Migration: add_calendar_type_to_bazi_charts
-- Run this in Supabase SQL Editor

-- 添加 calendar_type 列到 bazi_charts 表
alter table public.bazi_charts
add column if not exists calendar_type text default 'solar';

-- 添加注释
comment on column public.bazi_charts.calendar_type is '历法类型: solar (阳历) 或 lunar (农历)';
