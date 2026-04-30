BEGIN;

UPDATE public.community_posts AS posts
SET anonymous_name = COALESCE(NULLIF(BTRIM(users.nickname), ''), '命理爱好者')
FROM public.users AS users
WHERE users.id = posts.user_id;

DROP TABLE IF EXISTS public.community_anonymous_mapping CASCADE;

ALTER TABLE public.user_settings
DROP COLUMN IF EXISTS community_anonymous_name;

COMMIT;
