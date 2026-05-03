-- 会员购买订单表
CREATE TABLE IF NOT EXISTS public.membership_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id text NOT NULL CHECK (plan_id IN ('plus', 'plus_6m', 'pro')),
    amount integer NOT NULL,
    months integer NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
    pay_method text,
    pay_transaction_id text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_orders_user ON membership_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_orders_status ON membership_orders(status) WHERE status = 'pending';

ALTER TABLE membership_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON membership_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON membership_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
