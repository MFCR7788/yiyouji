#!/usr/bin/env python3
"""积分增加工具 - v7 修复版 (查询 auth.users 表)"""
import json
import urllib.request
import urllib.error
import sys

def read_env():
    """读取 .env 文件"""
    url = key = ""
    with open("/opt/apps/yiyouji/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                url = line.split("=", 1)[1].strip().strip("'\"")
            elif line.startswith("SUPABASE_SECRET_KEY="):
                key = line.split("=", 1)[1].strip().strip("'\"")
    return url, key

def api_request(url, key, method="GET", data=None):
    """发送 API 请求"""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    req_data = json.dumps(data).encode() if data else None
    
    req = urllib.request.Request(
        url,
        data=req_data,
        headers=headers,
        method=method
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"error": body[:200]}
    except Exception as e:
        return 0, {"error": str(e)}

def main():
    PHONE = "13968618333"
    AMOUNT = 500
    
    print("=" * 60)
    print(f"🔍 查找用户: {PHONE}")
    print("=" * 60)
    
    url, key = read_env()
    
    if not url or not key:
        print("❌ 无法读取 Supabase 配置")
        sys.exit(1)
    
    # 步骤1: 从 auth.users 表查询手机号
    print("\n📋 查询 auth.users 表...")
    status, data = api_request(
        f"{url}/auth/v1/admin/users?phone={PHONE}",
        key
    )
    
    user_id = old_credits = None
    
    if status == 200 and data and isinstance(data, dict) and 'users' in data:
        users_list = data['users']
        if len(users_list) > 0:
            user_auth = users_list[0]
            user_id = user_auth.get('id')
            
            # 查询 public.users 获取积分
            status2, pub_data = api_request(
                f"{url}/rest/v1/users?id=eq.{user_id}&select=id,nickname,ai_chat_count&limit=1",
                key
            )
            
            if status2 == 200 and pub_data and len(pub_data) > 0:
                old_credits = pub_data[0].get('ai_chat_count', 0) or 0
                nickname = pub_data[0].get('nickname') or '未设置'
                
                print(f"\n✅ 找到用户:")
                print(f"   ID: {user_id}")
                print(f"   昵称: {nickname}")
                print(f"   当前积分: {old_credits}")
            else:
                nickname = user_auth.get('user_metadata', {}).get('nickname') or '未设置'
                old_credits = 0
                print(f"\n✅ 在 auth.users 找到用户 (public.users 可能不存在):")
                print(f"   ID: {user_id}")
                print(f"   昵称: {nickname}")
                print(f"   当前积分: {old_credits} (默认)")
        else:
            print(f"\n❌ 未找到手机号 {PHONE}")
            sys.exit(1)
    else:
        print(f"\n❌ 查询失败 (HTTP {status}): {str(data)[:100]}")
        
        # 尝试列出所有用户
        print("\n📋 尝试列出所有 auth.users...")
        status3, all_users = api_request(
            f"{url}/auth/v1/admin/users?per_page=50",
            key
        )
        
        if status3 == 200 and isinstance(all_users, dict):
            users_list = all_users.get('users', [])
            print(f"共 {len(users_list)} 个用户:\n")
            
            for u in users_list:
                uid = u.get('id', '')[:16]
                phone = u.get('phone') or 'N/A'
                email = (u.get('email') or '')[:25]
                
                marker = ''
                if phone == PHONE:
                    marker = ' ✅✅✅ ← 目标'
                    user_id = u.get('id')
                
                print(f"  {uid} | {phone:15s} | {email}{marker}")
            
            if not user_id:
                print(f"\n❌ 未找到目标手机号")
                sys.exit(1)
        else:
            print(f"❌ 无法获取用户列表")
            sys.exit(1)
    
    if not user_id:
        print("\n❌ 未找到有效用户 ID")
        sys.exit(1)
    
    # 步骤2: 增加积分
    print(f"\n💰 增加 {AMOUNT} 积分...")
    
    status4, result = api_request(
        f"{url}/rest/v1/rpc/increment_ai_chat_count",
        key,
        method="POST",
        data={"user_id": user_id, "amount": AMOUNT}
    )
    
    if status4 in [200, 201, 204]:
        print(f"   ✅ 积分增加成功!")
    else:
        print(f"   ⚠️ RPC 返回 HTTP {status4}: {str(result)[:150]}")
    
    # 步骤3: 记录交易日志
    print(f"   📝 记录交易日志...")
    
    status5, _ = api_request(
        f"{url}/rest/v1/credit_transactions",
        key,
        method="POST",
        data={
            "user_id": user_id,
            "amount": AMOUNT,
            "type": "earn",
            "source": "admin_manual",
            "description": f"管理员手动增加 {AMOUNT} 积分"
        }
    )
    
    if status5 in [200, 201]:
        print(f"   ✅ 日志记录成功")
    else:
        print(f"   ⚠️ 日志记录失败 (HTTP {status5})")
    
    # 步骤4: 验证最终积分
    status6, final_data = api_request(
        f"{url}/rest/v1/users?id=eq.{user_id}&select=ai_chat_count",
        key
    )
    
    new_credits = 0
    if status6 == 200 and final_data and len(final_data) > 0:
        new_credits = final_data[0].get('ai_chat_count') or 0
    
    # 输出最终结果
    print()
    print("=" * 60)
    print("✅ 操作完成！")
    print("=" * 60)
    print(f"   📱 手机号: {PHONE}")
    print(f"   👤 用户ID: {str(user_id)[:20]}...")
    print(f"   💳 原积分: {old_credits}")
    print(f"   ➕ 增加: +{AMOUNT}")
    print(f"   💰 现积分: {new_credits}")
    print("=" * 60)

if __name__ == "__main__":
    main()
