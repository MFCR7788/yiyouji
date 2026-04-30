ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage app settings" ON public.app_settings;
CREATE POLICY "Service role can manage app settings"
    ON public.app_settings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage login attempts" ON public.login_attempts;
CREATE POLICY "Service role can manage login attempts"
    ON public.login_attempts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
    ON public.rate_limits
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DO $$
DECLARE
    pol record;
    expr text;
    stmt text;
    cmd_lower text;
BEGIN
    FOR pol IN
        SELECT policyname, tablename, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('users', 'bazi_charts')
    LOOP
        IF pol.tablename = 'users' THEN
            expr := '((select auth.uid()) = id)';
        ELSE
            expr := '((select auth.uid()) = user_id)';
        END IF;

        cmd_lower := lower(pol.cmd);

        IF cmd_lower = 'select' OR cmd_lower = 'delete' THEN
            stmt := format(
                'ALTER POLICY %I ON public.%I USING %s',
                pol.policyname,
                pol.tablename,
                expr
            );
        ELSIF cmd_lower = 'insert' THEN
            stmt := format(
                'ALTER POLICY %I ON public.%I WITH CHECK %s',
                pol.policyname,
                pol.tablename,
                expr
            );
        ELSE
            stmt := format(
                'ALTER POLICY %I ON public.%I USING %s WITH CHECK %s',
                pol.policyname,
                pol.tablename,
                expr,
                expr
            );
        END IF;

        EXECUTE stmt;
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_activation_keys_created_by ON public.activation_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_activation_keys_used_by ON public.activation_keys(used_by);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_id ON public.community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reviewed_by ON public.community_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_conversations_bazi_chart_id ON public.conversations(bazi_chart_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ziwei_chart_id ON public.conversations(ziwei_chart_id);
CREATE INDEX IF NOT EXISTS idx_face_readings_conversation_id ON public.face_readings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_hepan_charts_conversation_id ON public.hepan_charts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON public.knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_liuyao_divinations_conversation_id ON public.liuyao_divinations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mbti_readings_conversation_id ON public.mbti_readings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mbti_readings_user_id ON public.mbti_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_palm_readings_conversation_id ON public.palm_readings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_links_updated_by ON public.purchase_links(updated_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id ON public.scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_conversation_id ON public.tarot_readings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_id ON public.tarot_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_default_bazi_chart_id ON public.user_settings(default_bazi_chart_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_default_ziwei_chart_id ON public.user_settings(default_ziwei_chart_id);
CREATE INDEX IF NOT EXISTS idx_ziwei_charts_user_id ON public.ziwei_charts(user_id);
