-- 奇门遁甲排盘记录表
CREATE TABLE qimen_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT,
  chart_time TIMESTAMPTZ NOT NULL,
  chart_data JSONB NOT NULL,
  dun_type TEXT NOT NULL CHECK (dun_type IN ('yang', 'yin')),
  ju_number INTEGER NOT NULL CHECK (ju_number BETWEEN 1 AND 9),
  pan_type TEXT NOT NULL DEFAULT 'zhuan' CHECK (pan_type IN ('zhuan', 'fei')),
  ju_method TEXT NOT NULL DEFAULT 'chaibu' CHECK (ju_method IN ('chaibu', 'zhirun', 'maoshan')),
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qimen_charts_user ON qimen_charts(user_id);
ALTER TABLE qimen_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own qimen charts"
  ON qimen_charts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own qimen charts"
  ON qimen_charts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own qimen charts"
  ON qimen_charts FOR DELETE USING (auth.uid() = user_id);
