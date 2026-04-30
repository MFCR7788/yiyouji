-- 站内通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'feature_launch', 'system', 'promotion'
    title TEXT NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT, -- 可选的跳转链接
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 功能订阅表（上线提醒我）
CREATE TABLE IF NOT EXISTS feature_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL, -- 'liuyao', 'tarot', 'face', 'palm'
    notify_email BOOLEAN DEFAULT TRUE,
    notify_site BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feature_key)
);

-- RLS 策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_subscriptions ENABLE ROW LEVEL SECURITY;

-- 通知表策略
CREATE POLICY "用户只能查看自己的通知"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的通知"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "系统可以创建通知"
    ON notifications FOR INSERT WITH CHECK (true);

-- 订阅表策略
CREATE POLICY "用户可以查看自己的订阅"
    ON feature_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的订阅"
    ON feature_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的订阅"
    ON feature_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_subscriptions_feature ON feature_subscriptions(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_subscriptions_user ON feature_subscriptions(user_id);
