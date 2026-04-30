ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS default_bazi_chart_id uuid,
    ADD COLUMN IF NOT EXISTS default_ziwei_chart_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_settings_default_bazi_chart_id_fkey'
    ) THEN
        ALTER TABLE public.user_settings
            ADD CONSTRAINT user_settings_default_bazi_chart_id_fkey
            FOREIGN KEY (default_bazi_chart_id)
            REFERENCES public.bazi_charts (id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_settings_default_ziwei_chart_id_fkey'
    ) THEN
        ALTER TABLE public.user_settings
            ADD CONSTRAINT user_settings_default_ziwei_chart_id_fkey
            FOREIGN KEY (default_ziwei_chart_id)
            REFERENCES public.ziwei_charts (id)
            ON DELETE SET NULL;
    END IF;
END $$;
