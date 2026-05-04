-- 修复 membership_orders 表的 RLS 策略
-- 允许服务端角色（service_role）绕过行级安全策略

-- 1. 启用 RLS（如果尚未启用）
ALTER TABLE public.membership_orders ENABLE ROW LEVEL SECURITY;

-- 2. 为 service_role 添加完全访问权限（用于后端 API 操作）
CREATE POLICY "Service role can do everything on membership_orders" 
ON public.membership_orders 
TO service_role
USING (true)
WITH CHECK (true);

-- 3. 确保认证用户只能操作自己的订单（原有策略保留）
CREATE POLICY "Users can view own orders" ON public.membership_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.membership_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.membership_orders 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
