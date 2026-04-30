ALTER TABLE public.archived_sources
DROP CONSTRAINT IF EXISTS archived_sources_source_type_check;

ALTER TABLE public.archived_sources
ADD CONSTRAINT archived_sources_source_type_check
CHECK (
  source_type IN (
    'conversation',
    'record',
    'chat_message',
    'bazi_chart',
    'ziwei_chart',
    'tarot_reading',
    'liuyao_divination',
    'hepan_chart',
    'face_reading',
    'palm_reading',
    'mbti_reading',
    'ming_record',
    'daily_fortune',
    'monthly_fortune'
  )
);
