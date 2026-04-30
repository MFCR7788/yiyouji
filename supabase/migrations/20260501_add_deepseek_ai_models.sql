-- DeepSeek AI 网关和模型配置
-- 执行此迁移前，请确保已设置环境变量 DEEPSEEK_API_KEY

BEGIN;

-- 1. 修改 ai_gateways 表的 gateway_key CHECK 约束，添加 'deepseek'
ALTER TABLE public.ai_gateways DROP CONSTRAINT IF EXISTS ai_gateways_gateway_key_check;
ALTER TABLE public.ai_gateways ADD CONSTRAINT ai_gateways_gateway_key_check
    CHECK (gateway_key = ANY (ARRAY['newapi'::text, 'octopus'::text, 'deepseek'::text]));

-- 2. 插入 DeepSeek 网关配置
INSERT INTO public.ai_gateways (gateway_key, display_name, base_url, api_key_env_var, transport, is_enabled, notes)
VALUES (
    'deepseek',
    'DeepSeek',
    'https://api.deepseek.com',
    'DEEPSEEK_API_KEY',
    'openai_compatible',
    true,
    'DeepSeek V4 系列模型，支持 chat 和 reasoning 模式'
) ON CONFLICT (gateway_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    api_key_env_var = EXCLUDED.api_key_env_var,
    transport = EXCLUDED.transport,
    is_enabled = EXCLUDED.is_enabled,
    notes = EXCLUDED.notes;

-- 3. 插入 DeepSeek 模型配置
-- deepseek-v4-flash (快速对话模型，支持 reasoning)
INSERT INTO public.ai_models (
    model_key,
    display_name,
    vendor,
    usage_type,
    routing_mode,
    is_enabled,
    sort_order,
    required_tier,
    supports_reasoning,
    reasoning_required_tier,
    is_reasoning_default,
    supports_vision,
    default_temperature,
    default_max_tokens,
    supports_reasoning_mode,
    description
) VALUES (
    'deepseek-v4-flash',
    'DeepSeek V4 Flash',
    'DeepSeek',
    'chat',
    'auto',
    true,
    100,
    'free',
    true,
    'plus',
    false,
    false,
    0.7,
    8192,
    true,
    'DeepSeek V4 Flash - 快速对话模型，支持思考模式'
) ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    vendor = EXCLUDED.vendor,
    usage_type = EXCLUDED.usage_type,
    routing_mode = EXCLUDED.routing_mode,
    is_enabled = EXCLUDED.is_enabled,
    sort_order = EXCLUDED.sort_order,
    required_tier = EXCLUDED.required_tier,
    supports_reasoning = EXCLUDED.supports_reasoning,
    reasoning_required_tier = EXCLUDED.reasoning_required_tier,
    is_reasoning_default = EXCLUDED.is_reasoning_default,
    supports_vision = EXCLUDED.supports_vision,
    default_temperature = EXCLUDED.default_temperature,
    default_max_tokens = EXCLUDED.default_max_tokens,
    description = EXCLUDED.description;

-- deepseek-v4-pro (高性能对话模型)
INSERT INTO public.ai_models (
    model_key,
    display_name,
    vendor,
    usage_type,
    routing_mode,
    is_enabled,
    sort_order,
    required_tier,
    supports_reasoning,
    reasoning_required_tier,
    is_reasoning_default,
    supports_vision,
    default_temperature,
    default_max_tokens,
    description
) VALUES (
    'deepseek-v4-pro',
    'DeepSeek V4 Pro',
    'DeepSeek',
    'chat',
    'auto',
    true,
    101,
    'plus',
    false,
    'plus',
    false,
    false,
    0.7,
    8192,
    'DeepSeek V4 Pro - 高性能对话模型'
) ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    vendor = EXCLUDED.vendor,
    usage_type = EXCLUDED.usage_type,
    routing_mode = EXCLUDED.routing_mode,
    is_enabled = EXCLUDED.is_enabled,
    sort_order = EXCLUDED.sort_order,
    required_tier = EXCLUDED.required_tier,
    supports_reasoning = EXCLUDED.supports_reasoning,
    reasoning_required_tier = EXCLUDED.reasoning_required_tier,
    is_reasoning_default = EXCLUDED.is_reasoning_default,
    supports_vision = EXCLUDED.supports_vision,
    default_temperature = EXCLUDED.default_temperature,
    default_max_tokens = EXCLUDED.default_max_tokens,
    description = EXCLUDED.description;

-- 4. 绑定模型到 DeepSeek 网关
-- 获取 DeepSeek 网关 ID
DO $$
DECLARE
    deepseek_gateway_id uuid;
    deepseek_flash_model_id uuid;
    deepseek_pro_model_id uuid;
BEGIN
    SELECT id INTO deepseek_gateway_id FROM public.ai_gateways WHERE gateway_key = 'deepseek';
    SELECT id INTO deepseek_flash_model_id FROM public.ai_models WHERE model_key = 'deepseek-v4-flash';
    SELECT id INTO deepseek_pro_model_id FROM public.ai_models WHERE model_key = 'deepseek-v4-pro';

    -- 绑定 deepseek-v4-flash 到 DeepSeek 网关
    INSERT INTO public.ai_model_gateway_bindings (model_id, gateway_id, model_id_override, reasoning_model_id, is_enabled, priority)
    VALUES (deepseek_flash_model_id, deepseek_gateway_id, 'deepseek-v4-flash', 'deepseek-reasoner', true, 1)
    ON CONFLICT (model_id, gateway_id) DO UPDATE SET
        model_id_override = EXCLUDED.model_id_override,
        reasoning_model_id = EXCLUDED.reasoning_model_id,
        is_enabled = EXCLUDED.is_enabled,
        priority = EXCLUDED.priority;

    -- 绑定 deepseek-v4-pro 到 DeepSeek 网关
    INSERT INTO public.ai_model_gateway_bindings (model_id, gateway_id, model_id_override, is_enabled, priority)
    VALUES (deepseek_pro_model_id, deepseek_gateway_id, 'deepseek-v4-pro', true, 1)
    ON CONFLICT (model_id, gateway_id) DO UPDATE SET
        model_id_override = EXCLUDED.model_id_override,
        is_enabled = EXCLUDED.is_enabled,
        priority = EXCLUDED.priority;
END $$;

COMMIT;
