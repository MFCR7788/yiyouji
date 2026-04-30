DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.reminder_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.reminder_subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.reminder_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.reminder_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.reminder_subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.reminder_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的订阅" ON public.feature_subscriptions;
CREATE POLICY "用户可以更新自己的订阅"
  ON public.feature_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
