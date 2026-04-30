-- 八字断事笔记：单档案 + 关键事件列表

CREATE TABLE IF NOT EXISTS public.bazi_case_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bazi_chart_id UUID NOT NULL REFERENCES public.bazi_charts(id) ON DELETE CASCADE,
  master_review JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bazi_case_profiles_bazi_chart_id_key UNIQUE (bazi_chart_id)
);

CREATE TABLE IF NOT EXISTS public.bazi_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.bazi_case_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bazi_chart_id UUID NOT NULL REFERENCES public.bazi_charts(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('事业', '学业', '财富', '婚姻', '健康', '六亲', '其他')),
  title TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazi_case_profiles_user_id ON public.bazi_case_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bazi_case_events_chart_date ON public.bazi_case_events(bazi_chart_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_bazi_case_events_profile_id ON public.bazi_case_events(profile_id);

ALTER TABLE public.bazi_case_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bazi_case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bazi case profiles"
  ON public.bazi_case_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bazi case profiles"
  ON public.bazi_case_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bazi case profiles"
  ON public.bazi_case_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bazi case profiles"
  ON public.bazi_case_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bazi case events"
  ON public.bazi_case_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bazi case events"
  ON public.bazi_case_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bazi case events"
  ON public.bazi_case_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bazi case events"
  ON public.bazi_case_events FOR DELETE USING (auth.uid() = user_id);
