-- Add explicit yongshen targets for strict liuyao analysis flow.
-- Old rows are allowed to be NULL for backward compatibility.
-- New writes are enforced in application layer and constrained here.

ALTER TABLE public.liuyao_divinations
ADD COLUMN IF NOT EXISTS yongshen_targets text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'liuyao_divinations_yongshen_targets_valid'
  ) THEN
    ALTER TABLE public.liuyao_divinations
    ADD CONSTRAINT liuyao_divinations_yongshen_targets_valid
    CHECK (
      yongshen_targets IS NULL
      OR (
        COALESCE(array_length(yongshen_targets, 1), 0) >= 1
        AND yongshen_targets <@ ARRAY['父母', '兄弟', '子孙', '妻财', '官鬼']::text[]
      )
    );
  END IF;
END $$;
