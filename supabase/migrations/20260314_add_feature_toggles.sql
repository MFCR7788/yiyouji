-- 功能模块开关：在 app_settings 表中插入 feature_disabled:<id> 记录
-- setting_value = false 表示功能启用（默认），true 表示功能关闭
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('feature_disabled:fortune-hub', false),
  ('feature_disabled:bazi', false),
  ('feature_disabled:hepan', false),
  ('feature_disabled:ziwei', false),
  ('feature_disabled:tarot', false),
  ('feature_disabled:liuyao', false),
  ('feature_disabled:face', false),
  ('feature_disabled:palm', false),
  ('feature_disabled:mbti', false),
  ('feature_disabled:chat', false),
  ('feature_disabled:daily', false),
  ('feature_disabled:monthly', false),
  ('feature_disabled:records', false),
  ('feature_disabled:community', false),
  ('feature_disabled:knowledge-base', false),
  ('feature_disabled:mcp-service', false)
ON CONFLICT (setting_key) DO NOTHING;
