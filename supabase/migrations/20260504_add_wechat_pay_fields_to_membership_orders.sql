-- 添加微信支付相关字段到会员订单表
ALTER TABLE public.membership_orders
    ADD COLUMN IF NOT EXISTS out_trade_no text UNIQUE,
    ADD COLUMN IF NOT EXISTS transaction_id text;

CREATE INDEX IF NOT EXISTS idx_membership_orders_out_trade_no ON membership_orders(out_trade_no) WHERE out_trade_no IS NOT NULL;
