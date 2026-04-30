ALTER TABLE public.user_settings
    ADD COLUMN custom_instructions TEXT,
    ADD COLUMN expression_style TEXT CHECK (expression_style IN ('direct', 'gentle')) DEFAULT 'direct',
    ADD COLUMN user_profile JSONB DEFAULT '{}';
