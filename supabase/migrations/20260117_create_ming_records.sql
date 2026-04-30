-- Phase 6: 命理记账模块数据库表
-- 创建时间: 2026-01-17

-- =====================================================
-- 命理记录表 (ming_records)
-- =====================================================
CREATE TABLE public.ming_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general', -- general, prediction, event, reflection
  tags text[] DEFAULT '{}',
  event_date date,
  related_chart_type text, -- bazi, ziwei, liuyao, tarot, mbti, hepan
  related_chart_id uuid,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ming_records_pkey PRIMARY KEY (id),
  CONSTRAINT ming_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 小记表 (ming_notes) - 每日笔记，每天可多条
-- =====================================================
CREATE TABLE public.ming_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  mood text, -- happy, neutral, sad, anxious, peaceful
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ming_notes_pkey PRIMARY KEY (id),
  CONSTRAINT ming_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 索引
-- =====================================================
CREATE INDEX idx_ming_records_user_id ON public.ming_records(user_id);
CREATE INDEX idx_ming_records_category ON public.ming_records(category);
CREATE INDEX idx_ming_records_event_date ON public.ming_records(event_date);
CREATE INDEX idx_ming_records_created_at ON public.ming_records(created_at DESC);
CREATE INDEX idx_ming_notes_user_id ON public.ming_notes(user_id);
CREATE INDEX idx_ming_notes_date ON public.ming_notes(note_date DESC);

-- =====================================================
-- RLS 策略
-- =====================================================
ALTER TABLE public.ming_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ming_notes ENABLE ROW LEVEL SECURITY;

-- 用户只能管理自己的记录
CREATE POLICY "Users can view own records" ON public.ming_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own records" ON public.ming_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON public.ming_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records" ON public.ming_records
  FOR DELETE USING (auth.uid() = user_id);

-- 用户只能管理自己的小记
CREATE POLICY "Users can view own notes" ON public.ming_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON public.ming_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.ming_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.ming_notes
  FOR DELETE USING (auth.uid() = user_id);
