-- 修复匿名映射 RLS 策略
-- 创建时间: 2026-01-17

-- 删除旧的过于宽松的策略
DROP POLICY IF EXISTS "System can manage anonymous mappings" ON public.community_anonymous_mapping;

-- 创建新的安全策略：用户只能管理自己的匿名映射
CREATE POLICY "Users can create own anonymous mappings" ON public.community_anonymous_mapping
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anonymous mappings" ON public.community_anonymous_mapping
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own anonymous mappings" ON public.community_anonymous_mapping
  FOR DELETE USING (auth.uid() = user_id);
