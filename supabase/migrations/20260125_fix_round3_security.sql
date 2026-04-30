-- Fix archived views to respect user ownership
CREATE OR REPLACE VIEW public.conversations_with_archive_status AS
SELECT
    c.*,
    EXISTS (
        SELECT 1 FROM public.archived_sources a
        WHERE a.source_type = 'conversation'
          AND a.source_id = c.id::text
          AND a.user_id = c.user_id
    ) AS is_archived,
    (
        SELECT array_agg(kb_id)
        FROM public.archived_sources a
        WHERE a.source_type = 'conversation'
          AND a.source_id = c.id::text
          AND a.user_id = c.user_id
    ) AS archived_kb_ids
FROM public.conversations c;

CREATE OR REPLACE VIEW public.ming_records_with_archive_status AS
SELECT
    r.*,
    EXISTS (
        SELECT 1 FROM public.archived_sources a
        WHERE a.source_type = 'record'
          AND a.source_id = r.id::text
          AND a.user_id = r.user_id
    ) AS is_archived,
    (
        SELECT array_agg(kb_id)
        FROM public.archived_sources a
        WHERE a.source_type = 'record'
          AND a.source_id = r.id::text
          AND a.user_id = r.user_id
    ) AS archived_kb_ids
FROM public.ming_records r;

ALTER VIEW public.conversations_with_archive_status SET (security_invoker = on);
ALTER VIEW public.ming_records_with_archive_status SET (security_invoker = on);

-- Tighten anonymous mapping select policy
DROP POLICY IF EXISTS "Anyone can view anonymous mappings" ON public.community_anonymous_mapping;
CREATE POLICY "Users can view own anonymous mappings" ON public.community_anonymous_mapping
  FOR SELECT USING (auth.uid() = user_id);

-- Atomic activation key redemption
CREATE OR REPLACE FUNCTION public.activate_key_as_service(
    p_user_id UUID,
    p_key_code TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    error TEXT,
    key_type TEXT,
    membership_type TEXT,
    credits_amount INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key activation_keys%ROWTYPE;
    v_current_credits INT;
    v_new_credits INT;
BEGIN
    IF p_key_code IS NULL OR length(trim(p_key_code)) = 0 THEN
        RETURN QUERY SELECT false, '激活码不能为空', NULL, NULL, NULL;
        RETURN;
    END IF;

    SELECT * INTO v_key
    FROM activation_keys
    WHERE key_code = p_key_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '激活码不存在', NULL, NULL, NULL;
        RETURN;
    END IF;

    IF v_key.is_used THEN
        RETURN QUERY SELECT false, '该激活码已被使用', v_key.key_type, v_key.membership_type, v_key.credits_amount;
        RETURN;
    END IF;

    IF v_key.key_type = 'membership' THEN
        IF v_key.membership_type NOT IN ('plus', 'pro') THEN
            RETURN QUERY SELECT false, '无效的会员类型', v_key.key_type, v_key.membership_type, NULL;
            RETURN;
        END IF;

        SELECT ai_chat_count INTO v_current_credits
        FROM users
        WHERE id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT false, '获取用户信息失败', v_key.key_type, v_key.membership_type, NULL;
            RETURN;
        END IF;

        IF v_key.membership_type = 'plus' THEN
            v_new_credits := GREATEST(v_current_credits, LEAST(v_current_credits + 50, 50));
        ELSE
            v_new_credits := GREATEST(v_current_credits, LEAST(v_current_credits + 200, 200));
        END IF;

        UPDATE users
        SET
            membership = v_key.membership_type,
            membership_expires_at = NOW() + INTERVAL '1 month',
            ai_chat_count = v_new_credits
        WHERE id = p_user_id;

        INSERT INTO orders (user_id, product_type, amount, status, payment_method, paid_at)
        VALUES (p_user_id, v_key.membership_type, 0, 'paid', 'activation_key', NOW());
    ELSE
        SELECT ai_chat_count INTO v_current_credits
        FROM users
        WHERE id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT false, '获取用户信息失败', v_key.key_type, NULL, NULL;
            RETURN;
        END IF;

        v_new_credits := v_current_credits + COALESCE(v_key.credits_amount, 0);

        UPDATE users
        SET ai_chat_count = v_new_credits
        WHERE id = p_user_id;

        INSERT INTO orders (user_id, product_type, amount, status, payment_method, paid_at)
        VALUES (p_user_id, 'pay_per_use', 0, 'paid', 'activation_key', NOW());
    END IF;

    UPDATE activation_keys
    SET is_used = true,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = v_key.id AND is_used = false;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '激活失败，请重试', v_key.key_type, v_key.membership_type, v_key.credits_amount;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, NULL, v_key.key_type, v_key.membership_type, v_key.credits_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_key_as_service(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_key_as_service(UUID, TEXT) TO service_role;
