ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS default_top_p numeric(3,2),
  ADD COLUMN IF NOT EXISTS default_presence_penalty numeric(4,2),
  ADD COLUMN IF NOT EXISTS default_frequency_penalty numeric(4,2),
  ADD COLUMN IF NOT EXISTS default_reasoning_effort text,
  ADD COLUMN IF NOT EXISTS reasoning_effort_format text,
  ADD COLUMN IF NOT EXISTS custom_parameters jsonb;

UPDATE public.ai_models
SET default_top_p = 1
WHERE default_top_p IS NULL;

UPDATE public.ai_models
SET default_presence_penalty = 0
WHERE default_presence_penalty IS NULL;

UPDATE public.ai_models
SET default_frequency_penalty = 0
WHERE default_frequency_penalty IS NULL;

ALTER TABLE public.ai_models
  ALTER COLUMN default_top_p SET DEFAULT 1,
  ALTER COLUMN default_presence_penalty SET DEFAULT 0,
  ALTER COLUMN default_frequency_penalty SET DEFAULT 0;

ALTER TABLE public.ai_models
  DROP CONSTRAINT IF EXISTS ai_models_default_reasoning_effort_check;

ALTER TABLE public.ai_models
  ADD CONSTRAINT ai_models_default_reasoning_effort_check
  CHECK (default_reasoning_effort IS NULL OR default_reasoning_effort IN ('minimal', 'low', 'medium', 'high'));

ALTER TABLE public.ai_models
  DROP CONSTRAINT IF EXISTS ai_models_reasoning_effort_format_check;

ALTER TABLE public.ai_models
  ADD CONSTRAINT ai_models_reasoning_effort_format_check
  CHECK (reasoning_effort_format IS NULL OR reasoning_effort_format IN ('reasoning_object', 'reasoning_effort'));
