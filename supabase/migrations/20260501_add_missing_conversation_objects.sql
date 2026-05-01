-- Migration: Add missing conversation-related database objects

-- 创建 conversations_with_archive_status 视图
CREATE OR REPLACE VIEW public.conversations_with_archive_status AS
SELECT
    c.id,
    c.user_id,
    c.personality,
    c.title,
    c.created_at,
    c.updated_at,
    c.source_type,
    c.source_data,
    COALESCE(arch.is_archived, false) AS is_archived,
    COALESCE(arch.kb_ids, '[]'::jsonb) AS archived_kb_ids
FROM public.conversations c
LEFT JOIN (
    SELECT
        s.source_id::uuid AS conversation_id,
        true AS is_archived,
        jsonb_agg(DISTINCT s.kb_id) AS kb_ids
    FROM public.archived_sources s
    WHERE s.source_type = 'conversation'
    GROUP BY s.source_id
) arch ON c.id = arch.conversation_id;

-- 授权访问视图
GRANT SELECT ON public.conversations_with_archive_status TO authenticated;

-- 创建 update_conversation_with_messages RPC 函数
CREATE OR REPLACE FUNCTION public.update_conversation_with_messages(
    p_conversation_id uuid,
    p_title text,
    p_title_present boolean,
    p_personality text,
    p_personality_present boolean,
    p_messages jsonb,
    p_messages_present boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
BEGIN
    -- 检查对话是否存在并验证所有权
    SELECT user_id
    INTO v_owner
    FROM public.conversations
    WHERE id = p_conversation_id;

    IF v_owner IS NULL THEN
        RETURN '{"status": "not_found"}'::jsonb;
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() <> v_owner THEN
        RETURN '{"status": "permission_denied"}'::jsonb;
    END IF;

    -- 更新对话基本信息
    UPDATE public.conversations
    SET
        title = CASE WHEN p_title_present THEN COALESCE(p_title, '新对话') ELSE title END,
        personality = CASE WHEN p_personality_present THEN COALESCE(p_personality, 'general') ELSE personality END,
        updated_at = now()
    WHERE id = p_conversation_id;

    -- 更新消息（如果提供了消息字段）
    IF p_messages_present THEN
        -- 更新 conversations 表中的 messages 字段
        UPDATE public.conversations
        SET messages = COALESCE(p_messages, '[]'::jsonb)
        WHERE id = p_conversation_id;

        -- 删除旧消息
        DELETE FROM public.conversation_messages
        WHERE conversation_id = p_conversation_id;

        -- 插入新消息（如果有）
        IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
            INSERT INTO public.conversation_messages (
                conversation_id,
                sequence,
                message_id,
                role,
                content,
                metadata,
                created_at
            )
            SELECT
                p_conversation_id,
                elements.ordinality::integer - 1,
                COALESCE(elements.value->>'id', gen_random_uuid()::text),
                COALESCE(elements.value->>'role', 'assistant'),
                COALESCE(elements.value->>'content', ''),
                (elements.value - 'id' - 'role' - 'content' - 'createdAt'),
                COALESCE(NULLIF(elements.value->>'createdAt', '')::timestamptz, now())
            FROM jsonb_array_elements(p_messages) WITH ORDINALITY AS elements(value, ordinality);
        END IF;
    END IF;

    RETURN '{"status": "ok"}'::jsonb;
END;
$$;

-- 授权执行权限
GRANT EXECUTE ON FUNCTION public.update_conversation_with_messages(uuid, text, boolean, text, boolean, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_conversation_with_messages(uuid, text, boolean, text, boolean, jsonb, boolean) TO service_role;
