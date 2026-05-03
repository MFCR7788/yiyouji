#!/bin/bash
# 积分增加脚本 v5 - 简化版

PHONE="13968618333"
AMOUNT=500

cd /opt/apps/yiyouji

SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2-)
SUPABASE_KEY=$(grep "^SUPABASE_SECRET_KEY=" .env | cut -d'=' -f2-)

echo "========================================="
echo "🔍 查找用户: $PHONE"
echo "========================================="

# 查询用户
RESPONSE=$(curl -s "$SUPABASE_URL/rest/v1/users?phone=eq.$PHONE&select=id,phone,nickname,ai_chat_count&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

echo "API 响应: $RESPONSE"

# 用 python 解析
python3 << PYEOF
import json
import subprocess
import os

os.chdir("/opt/apps/yiyouji")

# 读取 .env
with open(".env") as f:
    lines = f.readlines()

url = ""
key = ""
for line in lines:
    if line.startswith("SUPABASE_URL="):
        url = line.split("=", 1)[1].strip()
    if line.startswith("SUPABASE_SECRET_KEY="):
        key = line.split("=", 1)[1].strip()

import urllib.request
import urllib.error

phone = "$PHONE"
amount = $AMOUNT

print(f"\n📡 连接 Supabase...")

# 查询用户
req = urllib.request.Request(
    f"{url}/rest/v1/users?phone=eq.{phone}&select=id,phone,nickname,ai_chat_count&limit=1",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        
        if not data:
            print(f"\n❌ 未找到手机号 {phone} 的用户")
            
            # 列出所有用户
            req2 = urllib.request.Request(
                f"{url}/rest/v1/users?select=id,phone,nickname,ai_chat_count&order=created_at.desc&limit=20",
                headers={"apikey": key, "Authorization": f"Bearer {key}"}
            )
            with urllib.request.urlopen(req2) as resp2:
                all_users = json.loads(resp2.read().decode())
                print(f"\n📋 最近注册的 {len(all_users)} 个用户:")
                found = False
                for u in all_users:
                    p = u.get('phone', 'N/A')
                    c = u.get('ai_chat_count', 0)
                    marker = ' ✅✅✅' if str(p) == phone else ''
                    print(f"  {u['id'][:16]} | {p:15s} | 积分: {c:4d}{marker}")
                    if str(p) == phone:
                        found = True
                        user_id = u['id']
                        old_credits = c
                
                if not found:
                    print(f"\n❌ 该手机号不在列表中")
            exit(1)
        
        user_id = data[0]['id']
        old_credits = data[0].get('ai_chat_count', 0)
        nickname = data[0].get('nickname', '未设置')
        
        print(f"\n✅ 找到用户:")
        print(f"   ID: {user_id}")
        print(f"   昵称: {nickname}")
        print(f"   当前积分: {old_credits}")
        
        # 增加积分
        print(f"\n💰 增加 {amount} 积分...")
        
        incr_data = json.dumps({"user_id": user_id, "amount": amount}).encode()
        req3 = urllib.request.Request(
            f"{url}/rest/v1/rpc/increment_ai_chat_count",
            data=incr_data,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req3) as resp3:
                result = json.loads(resp3.read().decode())
                print(f"   ✅ RPC 响应: {result}")
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"   ⚠️ HTTP {e.code}: {body[:100]}")
        
        # 记录交易日志
        log_data = json.dumps({
            "user_id": user_id,
            "amount": amount,
            "type": "earn",
            "source": "admin_manual",
            "description": f"管理员手动增加 {amount} 秒分"
        }).encode()
        
        req4 = urllib.request.Request(
            f"{url}/rest/v1/credit_transactions",
            data=log_data,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        
        try:
            urllib.request.urlopen(req4)
            print(f"   ✅ 交易日志已记录")
        except Exception as e:
            print(f"   ⚠️ 日志记录失败: {str(e)[:50]}")
        
        # 验证最终积分
        req5 = urllib.request.Request(
            f"{url}/rest/v1/users?id=eq.{user_id}&select=ai_chat_count",
            headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        
        with urllib.request.urlopen(req5) as resp5:
            final_data = json.loads(resp5.read().decode())
            new_credits = final_data[0]['ai_chat_count'] if final_data else 0
        
        print(f"\n{'='*50}")
        print(f"✅ 积分增加成功！")
        print(f"{'='*50}")
        print(f"   手机号: {phone}")
        print(f"   用户ID: {user_id[:16]}...")
        print(f"   原积分: {old_credits}")
        print(f"   增加: +{amount}")
        print(f"   现积分: {new_credits}")
        print(f"{'='*50}")

except urllib.error.URLError as e:
    print(f"\n❌ 网络错误: {e.reason}")
    exit(1)
except Exception as e:
    print(f"\n❌ 错误: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)

PYEOF
