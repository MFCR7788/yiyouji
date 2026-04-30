-- 大六壬排盘记录表
CREATE TABLE IF NOT EXISTS public.daliuren_divinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  question text,
  solar_date text NOT NULL,
  day_ganzhi text NOT NULL,
  hour_ganzhi text NOT NULL,
  yue_jiang text NOT NULL,
  result_data jsonb NOT NULL,
  settings jsonb,
  conversation_id uuid REFERENCES public.conversations(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.daliuren_divinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daliuren divinations"
  ON public.daliuren_divinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daliuren divinations"
  ON public.daliuren_divinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daliuren divinations"
  ON public.daliuren_divinations FOR UPDATE
  USING (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daliuren_divinations_user_id
  ON public.daliuren_divinations(user_id);

CREATE INDEX IF NOT EXISTS idx_daliuren_divinations_created_at
  ON public.daliuren_divinations(created_at DESC);
