CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.users
  SET ai_chat_count = GREATEST(ai_chat_count - 1, 0)
  WHERE id = user_id AND ai_chat_count > 0
  RETURNING ai_chat_count INTO updated_count;

  IF updated_count IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ai_chat_count(user_id uuid, amount integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.users
  SET ai_chat_count = ai_chat_count + amount
  WHERE id = user_id
  RETURNING ai_chat_count INTO updated_count;

  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_ai_chat_count(user_id uuid, amount integer, credit_limit integer, restore_at timestamptz)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.users
  SET ai_chat_count = LEAST(ai_chat_count + amount, credit_limit),
      last_credit_restore_at = restore_at
  WHERE id = user_id
  RETURNING ai_chat_count INTO updated_count;

  RETURN updated_count;
END;
$$;
