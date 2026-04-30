-- Migration: add_is_leap_month_to_bazi_charts
-- Adds leap month flag for lunar birthdays

alter table public.bazi_charts
add column if not exists is_leap_month boolean default false;

comment on column public.bazi_charts.is_leap_month is '农历闰月标记';
