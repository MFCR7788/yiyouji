-- 创建六爻占卜记录表
CREATE TABLE IF NOT EXISTS liuyao_divinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    hexagram_code TEXT NOT NULL,
    changed_hexagram_code TEXT,
    changed_lines JSONB,
    ai_interpretation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_liuyao_user_id ON liuyao_divinations(user_id);
CREATE INDEX IF NOT EXISTS idx_liuyao_created_at ON liuyao_divinations(created_at DESC);

-- 启用 RLS
ALTER TABLE liuyao_divinations ENABLE ROW LEVEL SECURITY;

-- RLS 策略 (先删除已存在的策略)
DROP POLICY IF EXISTS "Users can view own divinations" ON liuyao_divinations;
DROP POLICY IF EXISTS "Users can insert own divinations" ON liuyao_divinations;
DROP POLICY IF EXISTS "Users can delete own divinations" ON liuyao_divinations;

CREATE POLICY "Users can view own divinations"
ON liuyao_divinations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own divinations"
ON liuyao_divinations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own divinations"
ON liuyao_divinations FOR DELETE
USING (auth.uid() = user_id);
