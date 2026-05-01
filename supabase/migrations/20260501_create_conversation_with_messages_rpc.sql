-- Migration: create_conversation_with_messages RPC
-- 创建事务化创建对话和消息的 RPC 函数

CREATE OR REPLACE FUNCTION public.create_conversation_with_messages(
    p_user_id uuid,
    p_title text,
    p_personality text,
    p_source_type text,
    p_source_data jsonb,
    p_messages jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    -- 插入新对话
    INSERT INTO public.conversations (
        user_id,
        title,
        personality,
        source_type,
        source_data,
        messages
    ) VALUES (
        p_user_id,
        p_title,
        p_personality,
        p_source_type,
        p_source_data,
        COALESCE(p_messages, '[]'::jsonb)
    )
    RETURNING id INTO v_conversation_id;

    -- 插入消息到 conversation_messages 表（如果有消息）
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
            v_conversation_id,
            elements.ordinality::integer - 1,
            COALESCE(elements.value->>'id', gen_random_uuid()::text),
            COALESCE(elements.value->>'role', 'assistant'),
            COALESCE(elements.value->>'content', ''),
            (elements.value - 'id' - 'role' - 'content' - 'createdAt'),
            COALESCE(NULLIF(elements.value->>'createdAt', '')::timestamptz, now())
        FROM jsonb_array_elements(p_messages) WITH ORDINALITY AS elements(value, ordinality);
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- 授权执行权限
GRANT EXECUTE ON FUNCTION public.create_conversation_with_messages(uuid, text, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_messages(uuid, text, text, text, jsonb, jsonb) TO service_role;

-- 还需要创建 AI 分析专用的函数（使用 service_role 权限）
CREATE OR REPLACE FUNCTION public.create_analysis_conversation_with_history_as_service(
    p_user_id uuid,
    p_title text,
    p_personality text,
    p_source_type text,
    p_source_data jsonb,
    p_messages jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    -- 插入新对话
    INSERT INTO public.conversations (
        user_id,
        title,
        personality,
        source_type,
        source_data,
        messages
    ) VALUES (
        p_user_id,
        p_title,
        p_personality,
        p_source_type,
        p_source_data,
        COALESCE(p_messages, '[]'::jsonb)
    )
    RETURNING id INTO v_conversation_id;

    -- 插入消息到 conversation_messages 表（如果有消息）
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
            v_conversation_id,
            elements.ordinality::integer - 1,
            COALESCE(elements.value->>'id', gen_random_uuid()::text),
            COALESCE(elements.value->>'role', 'assistant'),
            COALESCE(elements.value->>'content', ''),
            (elements.value - 'id' - 'role' - 'content' - 'createdAt'),
            COALESCE(NULLIF(elements.value->>'createdAt', '')::timestamptz, now())
        FROM jsonb_array_elements(p_messages) WITH ORDINALITY AS elements(value, ordinality);
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- 授权执行权限
GRANT EXECUTE ON FUNCTION public.create_analysis_conversation_with_history_as_service(uuid, text, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_analysis_conversation_with_history_as_service(uuid, text, text, text, jsonb, jsonb) TO service_role;
