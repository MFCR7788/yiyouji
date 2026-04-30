-- =====================================================
-- 统一 AI 对话存储架构迁移脚本
-- 运行此脚本前请先备份数据库
-- =====================================================

-- =====================================================
-- Step 1: 修改 conversations 表结构
-- =====================================================

-- 添加 source_type 字段（AI 分析来源类型）
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'chat';
-- 可选值: 'chat', 'bazi_wuxing', 'bazi_personality', 'tarot', 'liuyao', 'mbti', 'hepan'

-- 添加 source_data 字段（传给 AI 的原始数据）
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS source_data JSONB;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversations_source_type ON public.conversations(source_type);

-- =====================================================
-- Step 2: 迁移现有 AI 分析数据到 conversations
-- =====================================================

-- 2.1 迁移 bazi_charts 五行分析
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at, bazi_chart_id)
SELECT 
    user_id,
    'bazi_wuxing',
    jsonb_build_object('chart_id', id::text, 'name', name),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', ai_wuxing_analysis)),
    name || ' - 五行分析',
    created_at,
    id
FROM public.bazi_charts 
WHERE ai_wuxing_analysis IS NOT NULL AND user_id IS NOT NULL;

-- 2.2 迁移 bazi_charts 人格分析
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at, bazi_chart_id)
SELECT 
    user_id,
    'bazi_personality',
    jsonb_build_object('chart_id', id::text, 'name', name),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', ai_personality_analysis)),
    name || ' - 人格分析',
    created_at,
    id
FROM public.bazi_charts 
WHERE ai_personality_analysis IS NOT NULL AND user_id IS NOT NULL;

-- 2.3 迁移 tarot_readings
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at)
SELECT 
    user_id,
    'tarot',
    jsonb_build_object('cards', cards, 'spread_id', spread_id, 'question', question),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', interpretation)),
    COALESCE(question, '塔罗占卜') || ' - ' || spread_id,
    created_at
FROM public.tarot_readings 
WHERE interpretation IS NOT NULL;

-- 2.4 迁移 mbti_readings
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at)
SELECT 
    user_id,
    'mbti',
    jsonb_build_object('mbti_type', mbti_type, 'scores', scores, 'percentages', percentages),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', analysis)),
    mbti_type || ' 人格分析',
    created_at
FROM public.mbti_readings 
WHERE analysis IS NOT NULL;

-- 2.5 迁移 liuyao_divinations
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at)
SELECT 
    user_id,
    'liuyao',
    jsonb_build_object(
        'hexagram_code', hexagram_code, 
        'changed_hexagram_code', changed_hexagram_code, 
        'changed_lines', changed_lines,
        'question', question
    ),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', ai_interpretation)),
    COALESCE(question, '六爻占卜') || ' - ' || hexagram_code,
    created_at
FROM public.liuyao_divinations 
WHERE ai_interpretation IS NOT NULL AND user_id IS NOT NULL;

-- 2.6 迁移 hepan_charts
INSERT INTO public.conversations (user_id, source_type, source_data, messages, title, created_at)
SELECT 
    user_id,
    'hepan',
    jsonb_build_object(
        'type', type, 
        'person1_name', person1_name, 
        'person1_birth', person1_birth,
        'person2_name', person2_name, 
        'person2_birth', person2_birth,
        'compatibility_score', compatibility_score
    ),
    jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', ai_analysis)),
    person1_name || ' & ' || person2_name || ' - ' || 
    CASE type 
        WHEN 'love' THEN '情侣合盘'
        WHEN 'business' THEN '商业合伙'
        WHEN 'family' THEN '亲子关系'
        ELSE '合盘分析'
    END,
    created_at
FROM public.hepan_charts 
WHERE ai_analysis IS NOT NULL AND user_id IS NOT NULL;

-- =====================================================
-- Step 3: 移除旧的 AI 字段（确认迁移成功后执行）
-- =====================================================
-- 注意：请先验证迁移数据正确后再执行以下语句

-- ALTER TABLE public.tarot_readings DROP COLUMN IF EXISTS interpretation;
-- ALTER TABLE public.mbti_readings DROP COLUMN IF EXISTS analysis;
-- ALTER TABLE public.liuyao_divinations DROP COLUMN IF EXISTS ai_interpretation;
-- ALTER TABLE public.hepan_charts DROP COLUMN IF EXISTS ai_analysis;
-- ALTER TABLE public.bazi_charts DROP COLUMN IF EXISTS ai_wuxing_analysis;
-- ALTER TABLE public.bazi_charts DROP COLUMN IF EXISTS ai_personality_analysis;
