-- 清理已废弃的功能订阅通知表

DROP POLICY IF EXISTS "用户可以查看自己的订阅" ON public.feature_subscriptions;
DROP POLICY IF EXISTS "用户可以创建自己的订阅" ON public.feature_subscriptions;
DROP POLICY IF EXISTS "用户可以删除自己的订阅" ON public.feature_subscriptions;
DROP POLICY IF EXISTS "用户可以更新自己的订阅" ON public.feature_subscriptions;

DROP TABLE IF EXISTS public.feature_subscriptions;
