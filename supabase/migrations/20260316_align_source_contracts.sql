ALTER TABLE public.archived_sources
DROP CONSTRAINT IF EXISTS archived_sources_source_type_check;

ALTER TABLE public.archived_sources
ADD CONSTRAINT archived_sources_source_type_check
CHECK (
  source_type = ANY (
    ARRAY[
      'conversation'::text,
      'record'::text,
      'chat_message'::text,
      'bazi_chart'::text,
      'ziwei_chart'::text,
      'tarot_reading'::text,
      'liuyao_divination'::text,
      'hepan_chart'::text,
      'face_reading'::text,
      'palm_reading'::text,
      'mbti_reading'::text,
      'ming_record'::text,
      'daily_fortune'::text,
      'monthly_fortune'::text,
      'qimen_chart'::text,
      'daliuren_divination'::text
    ]
  )
);

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_source_type_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_source_type_check
CHECK (
  source_type = ANY (
    ARRAY[
      'chat'::text,
      'bazi_wuxing'::text,
      'bazi_personality'::text,
      'tarot'::text,
      'liuyao'::text,
      'mbti'::text,
      'hepan'::text,
      'palm'::text,
      'face'::text,
      'dream'::text,
      'qimen'::text,
      'daliuren'::text
    ]
  )
) NOT VALID;
