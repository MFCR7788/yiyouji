ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS prompt_kb_ids jsonb DEFAULT '[]'::jsonb;
