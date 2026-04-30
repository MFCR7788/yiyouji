ALTER TABLE public.ziwei_charts
ADD COLUMN IF NOT EXISTS birth_place text;

COMMENT ON COLUMN public.ziwei_charts.birth_place IS '出生地点';
