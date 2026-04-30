CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count integer;
BEGIN
    UPDATE public.users
    SET ai_chat_count = GREATEST(COALESCE(ai_chat_count, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = user_id
    RETURNING ai_chat_count INTO new_count;

    RETURN new_count;
END;
$$;
