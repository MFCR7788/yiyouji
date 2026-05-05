-- =============================================
-- 知识库修复脚本 - 修正版（兼容 PostgreSQL 语法）
-- 
-- 修复说明：
-- - 移除了不支持的 "RETURNING INTO ARRAY" 语法
-- - 改用 PostgreSQL 标准的数组操作方式
-- =============================================

-- 1. 创建带数量限制的知识库创建函数
CREATE OR REPLACE FUNCTION public.create_knowledge_base_with_limit(
    p_user_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_weight TEXT DEFAULT 'normal',
    p_limit INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_count INT;
    v_new_kb knowledge_bases;
BEGIN
    -- 验证用户 ID
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', '用户 ID 不能为空');
    END IF;

    -- 验证名称
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN jsonb_build_object('status', 'error', 'message', '知识库名称不能为空');
    END IF;

    -- 验证权重值
    IF p_weight NOT IN ('low', 'normal', 'high') THEN
        p_weight := 'normal';
    END IF;

    -- 检查当前知识库数量
    SELECT COUNT(*) INTO v_current_count FROM knowledge_bases WHERE user_id = p_user_id;

    -- 检查是否超过限制
    IF v_current_count >= p_limit THEN
        RETURN jsonb_build_object(
            'status', 'limit_reached',
            'message', '知识库数量已达上限',
            'current_count', v_current_count,
            'limit', p_limit
        );
    END IF;

    -- 创建新知识库
    INSERT INTO knowledge_bases (user_id, name, description, weight)
    VALUES (p_user_id, trim(p_name), p_description, p_weight)
    RETURNING * INTO v_new_kb;

    RETURN jsonb_build_object(
        'status', 'ok',
        'knowledge_base', to_jsonb(v_new_kb),
        'message', '知识库创建成功'
    );
END;
$$;

-- 授予权限
REVOKE ALL ON FUNCTION public.create_knowledge_base_with_limit(UUID, TEXT, TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_knowledge_base_with_limit(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_knowledge_base_with_limit(UUID, TEXT, TEXT, TEXT, INT) TO service_role;

-- 2. 创建替换/插入知识条目的函数（修正版）
CREATE OR REPLACE FUNCTION public.kb_replace_source_entries(
    p_kb_id UUID,
    p_source_type TEXT,
    p_source_id TEXT,
    p_entries JSONB,
    p_archive BOOLEAN DEFAULT FALSE,
    p_user_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry JSONB;
    v_chunk_index INT;
    v_content TEXT;
    v_metadata JSONB;
    v_inserted_count INT DEFAULT 0;
    v_deleted_count INT DEFAULT 0;
BEGIN
    -- 验证参数
    IF p_kb_id IS NULL THEN 
        RAISE EXCEPTION 'kb_id 不能为空'; 
    END IF;

    IF p_source_type IS NULL OR trim(p_source_type) = '' THEN 
        RAISE EXCEPTION 'source_type 不能为空'; 
    END IF;

    IF p_source_id IS NULL OR trim(p_source_id) = '' THEN 
        RAISE EXCEPTION 'source_id 不能为空'; 
    END IF;

    IF p_entries IS NULL OR jsonb_array_length(p_entries) = 0 THEN 
        RETURN 0; 
    END IF;

    -- 检查知识库是否存在且属于该用户（如果提供了 user_id）
    IF p_user_id IS NOT NULL THEN
        PERFORM 1 FROM knowledge_bases WHERE id = p_kb_id AND user_id = p_user_id;
        IF NOT FOUND THEN 
            RAISE EXCEPTION '知识库不存在或无权限'; 
        END IF;
    ELSE
        PERFORM 1 FROM knowledge_bases WHERE id = p_kb_id;
        IF NOT FOUND THEN 
            RAISE EXCEPTION '知识库不存在'; 
        END IF;
    END IF;

    -- 删除旧的条目（同一来源）- 修正：使用标准语法
    DELETE FROM knowledge_entries
    WHERE kb_id = p_kb_id
      AND source_type = p_source_type
      AND source_id = p_source_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 如果需要归档，记录到 archived_sources 表（仅当确实删除了条目时）
    IF p_archive AND v_deleted_count > 0 THEN
        INSERT INTO archived_sources (user_id, source_type, source_id, kb_id)
        SELECT p_user_id, p_source_type, p_source_id, p_kb_id
        WHERE NOT EXISTS (
            SELECT 1 FROM archived_sources
            WHERE user_id = COALESCE(p_user_id, auth.uid())
              AND source_type = p_source_type
              AND source_id = p_source_id
              AND kb_id = p_kb_id
        );
    END IF;

    -- 插入新条目
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_chunk_index := (v_entry->>'chunk_index')::INT;
        v_content := v_entry->>'content';
        v_metadata := COALESCE(v_entry->'metadata', '{}'::jsonb);

        IF v_content IS NOT NULL AND trim(v_content) != '' THEN
            INSERT INTO knowledge_entries (
                kb_id, content, source_type, source_id, chunk_index, metadata
            ) VALUES (
                p_kb_id, v_content, p_source_type, p_source_id, v_chunk_index, v_metadata
            );

            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN v_inserted_count;
END;
$$;

-- 授予权限
REVOKE ALL ON FUNCTION public.kb_replace_source_entries(UUID, TEXT, TEXT, JSONB, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kb_replace_source_entries(UUID, TEXT, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kb_replace_source_entries(UUID, TEXT, TEXT, JSONB, BOOLEAN, UUID) TO service_role;

-- 3. 验证函数是否创建成功
SELECT 
    routine_name as "函数名",
    routine_type as "类型",
    security_type as "安全类型",
    data_type as "返回类型"
FROM information_schema.routines
WHERE routine_name IN ('create_knowledge_base_with_limit', 'kb_replace_source_entries')
  AND routine_schema = 'public'
ORDER BY routine_name;
