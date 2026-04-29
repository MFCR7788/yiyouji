CREATE OR REPLACE FUNCTION public.create_conversation_with_messages(
    p_user_id uuid,
    p_title text,
    p_personality text,
    p_source_type text,
    p_source_data jsonb,
    p_messages jsonb
) RETURNS uuid AS $$
DECLARE
    new_conversation_id uuid;
    msg record;
    seq integer := 0;
BEGIN
    INSERT INTO public.conversations (
        id,
        user_id,
        title,
        personality,
        source_type,
        source_data,
        messages
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        COALESCE(p_title, '新对话'),
        COALESCE(p_personality, 'general'),
        p_source_type,
        p_source_data,
        COALESCE(p_messages, '[]'::jsonb)
    ) RETURNING id INTO new_conversation_id;

    IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
        FOR msg IN SELECT * FROM jsonb_to_recordset(p_messages) AS x(
            message_id text,
            role text,
            content text,
            metadata jsonb
        ) LOOP
            INSERT INTO public.conversation_messages (
                conversation_id,
                sequence,
                message_id,
                role,
                content,
                metadata
            ) VALUES (
                new_conversation_id,
                seq,
                msg.message_id,
                msg.role,
                COALESCE(msg.content, ''),
                COALESCE(msg.metadata, '{}'::jsonb)
            );
            seq := seq + 1;
        END LOOP;
    END IF;

    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_conversation_with_messages(uuid, text, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_messages(uuid, text, text, text, jsonb, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.create_analysis_conversation_with_history_as_service(
    p_user_id uuid,
    p_source_type text,
    p_source_data jsonb,
    p_title text,
    p_personality text,
    p_messages jsonb,
    p_history_type text,
    p_history_payload jsonb
) RETURNS uuid AS $$
DECLARE
    new_conversation_id uuid;
    msg record;
    seq integer := 0;
    history_id text;
BEGIN
    INSERT INTO public.conversations (
        id,
        user_id,
        title,
        personality,
        source_type,
        source_data,
        messages
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        COALESCE(p_title, '新对话'),
        COALESCE(p_personality, 'general'),
        p_source_type,
        p_source_data,
        COALESCE(p_messages, '[]'::jsonb)
    ) RETURNING id INTO new_conversation_id;

    IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
        FOR msg IN SELECT * FROM jsonb_to_recordset(p_messages) AS x(
            message_id text,
            role text,
            content text,
            metadata jsonb
        ) LOOP
            INSERT INTO public.conversation_messages (
                conversation_id,
                sequence,
                message_id,
                role,
                content,
                metadata
            ) VALUES (
                new_conversation_id,
                seq,
                msg.message_id,
                msg.role,
                COALESCE(msg.content, ''),
                COALESCE(msg.metadata, '{}'::jsonb)
            );
            seq := seq + 1;
        END LOOP;
    END IF;

    IF p_history_type IS NOT NULL AND p_history_payload IS NOT NULL THEN
        history_id := p_history_payload->>'id';
        IF history_id IS NOT NULL THEN
            CASE p_history_type
                WHEN 'bazi' THEN
                    UPDATE public.bazi_charts SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'tarot' THEN
                    UPDATE public.tarot_readings SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'liuyao' THEN
                    UPDATE public.liuyao_divinations SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'qimen' THEN
                    UPDATE public.qimen_charts SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'mbti' THEN
                    UPDATE public.mbti_readings SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'face' THEN
                    UPDATE public.face_readings SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'palm' THEN
                    UPDATE public.palm_readings SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'hepan' THEN
                    UPDATE public.hepan_charts SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'daliuren' THEN
                    UPDATE public.daliuren_divinations SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
                WHEN 'ziwei' THEN
                    UPDATE public.ziwei_charts SET conversation_id = new_conversation_id WHERE id = history_id::uuid;
            END CASE;
        END IF;
    END IF;

    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_analysis_conversation_with_history_as_service(uuid, text, jsonb, text, text, jsonb, text, jsonb) TO service_role;