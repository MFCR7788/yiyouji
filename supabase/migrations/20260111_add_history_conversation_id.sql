-- Add conversation linkage to AI history tables

ALTER TABLE public.tarot_readings
ADD COLUMN IF NOT EXISTS conversation_id uuid;

ALTER TABLE public.liuyao_divinations
ADD COLUMN IF NOT EXISTS conversation_id uuid;

ALTER TABLE public.mbti_readings
ADD COLUMN IF NOT EXISTS conversation_id uuid;

ALTER TABLE public.hepan_charts
ADD COLUMN IF NOT EXISTS conversation_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tarot_readings_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.tarot_readings
    ADD CONSTRAINT tarot_readings_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'liuyao_divinations_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.liuyao_divinations
    ADD CONSTRAINT liuyao_divinations_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mbti_readings_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.mbti_readings
    ADD CONSTRAINT mbti_readings_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hepan_charts_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.hepan_charts
    ADD CONSTRAINT hepan_charts_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
  END IF;
END $$;
