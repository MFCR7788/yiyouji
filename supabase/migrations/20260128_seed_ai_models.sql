-- AI 模型种子数据
-- 根据当前环境变量配置初始化模型和来源数据

-- ===== 插入模型配置 =====

-- 1. DeepSeek V3.2 (Free)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, is_reasoning_default, default_max_tokens, description)
VALUES ('deepseek-v3.2', 'DeepSeek V3.2', 'deepseek', true, 10, 'free', false, false, 4000, '硅基流动 DeepSeek V3.2，免费用户可用')
ON CONFLICT (model_key) DO NOTHING;

-- 2. DeepSeek Pro (Plus)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepseek-pro', 'DeepSeek Pro', 'deepseek', true, 11, 'plus', true, 'plus', false, 8000, 'DeepSeek 官方 API，支持推理模式')
ON CONFLICT (model_key) DO NOTHING;

-- 3. GLM-4.6 (Free)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('glm-4.6', 'GLM-4.6', 'glm', true, 20, 'free', true, 'plus', false, 4000, '硅基流动 GLM-4.6，支持思考模式')
ON CONFLICT (model_key) DO NOTHING;

-- 4. GLM-4.7 (Plus)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('glm-4.7', 'GLM-4.7', 'glm', true, 21, 'plus', true, 'plus', false, 8000, 'GLM-4.7 支持多来源：硅基流动、NVIDIA')
ON CONFLICT (model_key) DO NOTHING;

-- 5. Gemini 3 (Plus)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, is_reasoning_default, default_max_tokens, description)
VALUES ('gemini-3', 'Gemini 3', 'gemini', true, 30, 'plus', false, false, 4000, 'Google Gemini 3 Flash Preview')
ON CONFLICT (model_key) DO NOTHING;

-- 6. Gemini Pro 0 (Plus) - Gemini 2.5 Pro
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('gemini-pro-0', 'Gemini 2.5 Pro', 'gemini', true, 31, 'plus', true, 'plus', true, 8000, 'Gemini 2.5 Pro，默认开启推理')
ON CONFLICT (model_key) DO NOTHING;

-- 7. Gemini Pro 1 (Plus) - Gemini 3 Pro
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('gemini-pro-1', 'Gemini 3 Pro', 'gemini', true, 32, 'plus', true, 'plus', true, 8000, 'Gemini 3 Pro，默认开启推理')
ON CONFLICT (model_key) DO NOTHING;

-- 8. Qwen 3 Max (Plus)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('qwen-3-max', 'Qwen 3 Max', 'qwen', true, 40, 'plus', true, 'plus', true, 8000, '阿里 Qwen 3 Max，默认开启推理')
ON CONFLICT (model_key) DO NOTHING;

-- 9. DeepAI - DeepGLM Pro (Pro)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepai-deepglm-high', 'DeepGLM Pro', 'deepai', true, 50, 'pro', true, 'pro', true, 10000, 'DeepAI DeepGLM Pro，仅 Pro 用户可用')
ON CONFLICT (model_key) DO NOTHING;

-- 10. DeepAI - DeepGLM (Pro)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepai-deepglm-low', 'DeepGLM', 'deepai', true, 51, 'pro', true, 'pro', true, 10000, 'DeepAI DeepGLM，仅 Pro 用户可用')
ON CONFLICT (model_key) DO NOTHING;

-- 11. DeepAI - DeepGemini Pro (Pro)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepai-deepgeminipro-low', 'DeepGemini Pro', 'deepai', true, 52, 'pro', true, 'pro', true, 10000, 'DeepAI DeepGemini Pro')
ON CONFLICT (model_key) DO NOTHING;

-- 12. DeepAI - DeepGemini Ultra (Pro)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepai-deepgeminipro-high', 'DeepGemini Ultra', 'deepai', true, 53, 'pro', true, 'pro', true, 10000, 'DeepAI DeepGemini Ultra')
ON CONFLICT (model_key) DO NOTHING;

-- 13. DeepAI - DeepQwen (Pro)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, default_max_tokens, description)
VALUES ('deepai-deepqwen', 'DeepQwen', 'deepai', true, 54, 'pro', true, 'pro', true, 10000, 'DeepAI DeepQwen')
ON CONFLICT (model_key) DO NOTHING;

-- 14. Qwen VL Plus (Plus, Vision)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, supports_vision, default_max_tokens, description)
VALUES ('qwen-vl-plus', 'Qwen 3 Plus', 'qwen-vl', true, 60, 'plus', true, 'plus', false, true, 8000, 'Qwen 视觉模型，支持图像分析')
ON CONFLICT (model_key) DO NOTHING;

-- 15. Gemini VL 0 (Plus, Vision)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, supports_vision, default_max_tokens, description)
VALUES ('gemini-vl-0', 'Gemini 2.5 Pro (视觉)', 'gemini-vl', true, 61, 'plus', true, 'plus', true, true, 8000, 'Gemini 视觉模型，支持图像分析')
ON CONFLICT (model_key) DO NOTHING;

-- 16. Gemini VL 1 (Plus, Vision)
INSERT INTO public.ai_models (model_key, display_name, vendor, is_enabled, sort_order, required_tier, supports_reasoning, reasoning_required_tier, is_reasoning_default, supports_vision, default_max_tokens, description)
VALUES ('gemini-vl-1', 'Gemini 3 Pro (视觉)', 'gemini-vl', true, 62, 'plus', true, 'plus', true, true, 8000, 'Gemini 视觉模型，支持图像分析')
ON CONFLICT (model_key) DO NOTHING;

-- ===== 插入来源配置 =====

-- DeepSeek V3.2 - 硅基流动
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'siliconflow', '硅基流动', 'https://api.siliconflow.cn/v1/chat/completions', 'DEEPSEEK_API_KEY', 'deepseek-ai/DeepSeek-V3.2', true, true, 1, '主要来源'
FROM public.ai_models WHERE model_key = 'deepseek-v3.2'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- DeepSeek Pro - 官方
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, reasoning_model_id, is_active, is_enabled, priority, notes)
SELECT id, 'official', '官方 API', 'https://api.deepseek.com/chat/completions', 'DEEPSEEK_PRO_API_KEY', 'deepseek-chat', 'deepseek-reasoner', true, true, 1, 'DeepSeek 官方 API，支持 Reasoner'
FROM public.ai_models WHERE model_key = 'deepseek-pro'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- GLM-4.6 - 硅基流动
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'siliconflow', '硅基流动', 'https://api.siliconflow.cn/v1/chat/completions', 'GLM_API_KEY', 'zai-org/GLM-4.6', true, true, 1, '免费额度来源'
FROM public.ai_models WHERE model_key = 'glm-4.6'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- GLM-4.7 - 硅基流动 Pro
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'siliconflow', '硅基流动 Pro', 'https://api.siliconflow.cn/v1/chat/completions', 'GLM_PRO_API_KEY', 'Pro/zai-org/GLM-4.7', true, true, 1, '硅基流动付费版本'
FROM public.ai_models WHERE model_key = 'glm-4.7'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- GLM-4.7 - NVIDIA (备用来源)
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'nvidia', 'NVIDIA', 'https://integrate.api.nvidia.com/v1/chat/completions', 'NVIDIA_API_KEY', 'z-ai/glm4.7', false, true, 2, 'NVIDIA API 备用来源'
FROM public.ai_models WHERE model_key = 'glm-4.7'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Gemini 3 - Google 官方
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'google', 'Google', 'https://generativelanguage.googleapis.com/v1beta', 'GEMINI_API_KEY', 'gemini-3-flash-preview', true, true, 1, 'Google 官方 API'
FROM public.ai_models WHERE model_key = 'gemini-3'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Gemini Pro 0 - 第三方
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'thirdparty', '第三方 API', 'https://api2.qiandao.mom/v1/chat/completions', 'GEMINI_PRO_API_KEY', 'gemini-3-pro-preview-h', true, true, 1, '第三方转发'
FROM public.ai_models WHERE model_key = 'gemini-pro-0'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Gemini Pro 1 - 第三方
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'thirdparty', '第三方 API', 'https://api2.qiandao.mom/v1/chat/completions', 'GEMINI_PRO_API_KEY', 'gemini-2.5-pro-preview-p', true, true, 1, '第三方转发'
FROM public.ai_models WHERE model_key = 'gemini-pro-1'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Qwen 3 Max - 阿里云
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'alibaba', '阿里云', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', 'QWEN_API_KEY', 'qwen3-max', true, true, 1, '阿里云 DashScope'
FROM public.ai_models WHERE model_key = 'qwen-3-max'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- DeepAI 模型来源
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'deepai', 'DeepAI', 'https://mingai-deepai.zeabur.app/v1/chat/completions', 'DEEPAI_API_KEY', 'deepglm-high', true, true, 1, 'DeepAI 自建服务'
FROM public.ai_models WHERE model_key = 'deepai-deepglm-high'
ON CONFLICT (model_id, source_key) DO NOTHING;

INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'deepai', 'DeepAI', 'https://mingai-deepai.zeabur.app/v1/chat/completions', 'DEEPAI_API_KEY', 'deepglm-low', true, true, 1, 'DeepAI 自建服务'
FROM public.ai_models WHERE model_key = 'deepai-deepglm-low'
ON CONFLICT (model_id, source_key) DO NOTHING;

INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'deepai', 'DeepAI', 'https://mingai-deepai.zeabur.app/v1/chat/completions', 'DEEPAI_API_KEY', 'deepgeminipro-low', true, true, 1, 'DeepAI 自建服务'
FROM public.ai_models WHERE model_key = 'deepai-deepgeminipro-low'
ON CONFLICT (model_id, source_key) DO NOTHING;

INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'deepai', 'DeepAI', 'https://mingai-deepai.zeabur.app/v1/chat/completions', 'DEEPAI_API_KEY', 'deepgeminipro-high', true, true, 1, 'DeepAI 自建服务'
FROM public.ai_models WHERE model_key = 'deepai-deepgeminipro-high'
ON CONFLICT (model_id, source_key) DO NOTHING;

INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'deepai', 'DeepAI', 'https://mingai-deepai.zeabur.app/v1/chat/completions', 'DEEPAI_API_KEY', 'deepqwen', true, true, 1, 'DeepAI 自建服务'
FROM public.ai_models WHERE model_key = 'deepai-deepqwen'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Qwen VL - 阿里云
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'alibaba', '阿里云', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', 'QWEN_VL_API_KEY', 'qwen3-vl-plus', true, true, 1, '阿里云视觉模型'
FROM public.ai_models WHERE model_key = 'qwen-vl-plus'
ON CONFLICT (model_id, source_key) DO NOTHING;

-- Gemini VL - 第三方
INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'thirdparty', '第三方 API', 'https://api2.qiandao.mom/v1/chat/completions', 'GEMINI_VL_API_KEY', 'gemini-3-pro-preview-h', true, true, 1, '第三方视觉模型'
FROM public.ai_models WHERE model_key = 'gemini-vl-0'
ON CONFLICT (model_id, source_key) DO NOTHING;

INSERT INTO public.ai_model_sources (model_id, source_key, source_name, api_url, api_key_env_var, model_id_override, is_active, is_enabled, priority, notes)
SELECT id, 'thirdparty', '第三方 API', 'https://api2.qiandao.mom/v1/chat/completions', 'GEMINI_VL_API_KEY', 'gemini-2.5-pro-preview-p', true, true, 1, '第三方视觉模型'
FROM public.ai_models WHERE model_key = 'gemini-vl-1'
ON CONFLICT (model_id, source_key) DO NOTHING;
