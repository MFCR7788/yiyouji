#!/usr/bin/env python3
"""执行数据库 Migration"""
import json
import urllib.request
import sys

def read_env():
    url = key = ""
    with open("/opt/apps/yiyouji/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                url = line.split("=", 1)[1].strip().strip("'\"")
            elif line.startswith("SUPABASE_SECRET_KEY="):
                key = line.split("=", 1)[1].strip().strip("'\"")
    return url, key

def exec_sql(url, key, sql):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/exec_sql",
        data=body,
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode()) if e.fp else {"error": str(e)}

def main():
    url, key = read_env()

    migrations = [
        ("fix_checkin_reward", """
CREATE OR REPLACE FUNCTION public.perform_daily_checkin_as_service(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_today date;
    v_existing record;
    v_user_info record;
    v_new_credits integer;
    v_reward integer := 10;
BEGIN
    v_today := CURRENT_DATE;
    SELECT * INTO v_existing FROM public.daily_checkins WHERE user_id = p_user_id AND checkin_date = v_today;
    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'already_checked_in', 'reward_credits', v_existing.reward_credits);
    END IF;
    SELECT ai_chat_count, membership INTO v_user_info FROM public.users WHERE id = p_user_id;
    IF v_user_info IS NULL THEN RETURN jsonb_build_object('status', 'error'); END IF;
    INSERT INTO public.daily_checkins (user_id, checkin_date, reward_credits) VALUES (p_user_id, v_today, v_reward);
    UPDATE public.users SET ai_chat_count = ai_chat_count + v_reward WHERE id = p_user_id RETURNING ai_chat_count INTO v_new_credits;
    RETURN jsonb_build_object('status', 'ok', 'reward_credits', v_reward, 'credits', v_new_credits);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;
"""),
        ("create_membership_orders", """
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
ALTER TABLE membership_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON membership_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON membership_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
"""),
    ]

    for name, sql in migrations:
        print(f"\n{'='*50}")
        print(f"📦 执行 Migration: {name}")
        print(f"{'='*50}")
        status, result = exec_sql(url, key, sql)
        if status in [200, 201]:
            print(f"   ✅ {name} 执行成功")
        else:
            print(f"   ⚠️ {name} HTTP {status}: {str(result)[:150]}")

    print(f"\n{'='*50}")
    print("✅ 全部 Migration 完成！")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
