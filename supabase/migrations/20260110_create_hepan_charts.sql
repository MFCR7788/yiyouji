-- 创建关系合盘记录表
CREATE TABLE IF NOT EXISTS hepan_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('love', 'business', 'family')),
    person1_name TEXT NOT NULL,
    person1_birth JSONB NOT NULL,
    person2_name TEXT NOT NULL,
    person2_birth JSONB NOT NULL,
    compatibility_score INTEGER,
    ai_analysis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hepan_user_id ON hepan_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_hepan_created_at ON hepan_charts(created_at DESC);

-- 启用 RLS
ALTER TABLE hepan_charts ENABLE ROW LEVEL SECURITY;

-- RLS 策略 (先删除已存在的策略)
DROP POLICY IF EXISTS "Users can view own charts" ON hepan_charts;
DROP POLICY IF EXISTS "Users can insert own charts" ON hepan_charts;
DROP POLICY IF EXISTS "Users can delete own charts" ON hepan_charts;

CREATE POLICY "Users can view own charts"
ON hepan_charts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charts"
ON hepan_charts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own charts"
ON hepan_charts FOR DELETE
USING (auth.uid() = user_id);
