ALTER TABLE public.ziwei_charts
ADD COLUMN IF NOT EXISTS is_leap_month boolean DEFAULT false;

COMMENT ON COLUMN public.ziwei_charts.is_leap_month IS '农历闰月标记';
