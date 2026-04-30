ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS community_anonymous_name text;

UPDATE public.user_settings
SET community_anonymous_name = '匿名用户'
WHERE community_anonymous_name IS NULL OR community_anonymous_name = '';

ALTER TABLE public.user_settings
ALTER COLUMN community_anonymous_name SET DEFAULT '匿名用户';
