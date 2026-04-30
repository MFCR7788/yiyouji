-- 性能优化索引
-- 为常用查询添加索引，提升查询性能

-- user_settings 表索引（用户设置查询）
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
    ON public.user_settings(user_id);

-- conversations 表索引（对话列表查询）
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
    ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_updated_at
    ON public.conversations(user_id, updated_at DESC);

-- bazi_charts 表索引（八字命盘查询）
CREATE INDEX IF NOT EXISTS idx_bazi_charts_user_id
    ON public.bazi_charts(user_id);

-- knowledge_entries 表索引（知识库搜索）
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_kb_id
    ON public.knowledge_entries(kb_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_kb_id_created_at
    ON public.knowledge_entries(kb_id, created_at DESC);

-- credit_transactions 表索引（积分记录查询）
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
    ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
    ON public.credit_transactions(user_id, created_at DESC);

-- daily_checkins 表索引（签到记录查询）
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id
    ON public.daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id_checkin_date
    ON public.daily_checkins(user_id, checkin_date DESC);

-- notifications 表索引（通知查询）
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
    ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
    ON public.notifications(user_id, created_at DESC);

-- community_posts 表索引（社区帖子查询）
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
    ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id
    ON public.community_posts(user_id);

-- ming_records 表索引（命理记录查询）
CREATE INDEX IF NOT EXISTS idx_ming_records_user_id
    ON public.ming_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ming_records_user_id_event_date
    ON public.ming_records(user_id, event_date DESC);
