-- 加固匿名映射表的 SELECT 策略，防止通过直接查询泄露 user_id
-- 仅允许 service_role 读取，业务读取通过服务端 API 完成

ALTER TABLE public.community_anonymous_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view anonymous mappings" ON public.community_anonymous_mapping;

CREATE POLICY "Service role can view anonymous mappings"
  ON public.community_anonymous_mapping
  FOR SELECT
  USING (auth.role() = 'service_role');
