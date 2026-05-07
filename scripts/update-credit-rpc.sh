#!/bin/bash
# 更新积分扣减 RPC 函数脚本

set -e

echo "=========================================="
echo "📦 更新积分扣减 RPC 函数"
echo "=========================================="
echo ""

# 检查是否在应用目录
if [ ! -f ".env.local" ]; then
    echo "❌ 错误：请在应用根目录运行此脚本"
    echo "   cd /opt/apps/yiyouji && bash scripts/update-credit-rpc.sh"
    exit 1
fi

# 读取环境变量
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env.local | cut -d'=' -f2- | tr -d '"')
SUPABASE_KEY=$(grep "^SUPABASE_SECRET_KEY=" .env.local | cut -d'=' -f2- | tr -d '"')

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ 错误：无法读取 Supabase 配置"
    exit 1
fi

echo "📡 连接到 Supabase..."
echo "   URL: ${SUPABASE_URL}"
echo ""

# 创建临时 SQL 文件
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << 'EOF_SQL'
CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid, amount integer DEFAULT 1)
RETURNS integer AS $$
DECLARE
    remaining integer;
BEGIN
    UPDATE public.users
    SET ai_chat_count = ai_chat_count - amount
    WHERE id = user_id AND ai_chat_count >= amount
    RETURNING ai_chat_count INTO remaining;
    
    IF remaining IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN remaining;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO authenticated;
EOF_SQL

echo "📝 执行 SQL 脚本..."
echo ""

# 尝试使用 psql（如果可用）
if command -v psql &> /dev/null; then
    echo "使用 psql 连接..."
    psql "$SUPABASE_URL" -U postgres -f "$SQL_FILE"
else
    echo "使用 curl 连接..."
    curl -X POST "$SUPABASE_URL/rest/v1/rpc/run_sql" \
        -H "apikey: $SUPABASE_KEY" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$(cat "$SQL_FILE" | sed 's/"/\\"/g')\"}"
fi

echo ""
echo "✅ RPC 函数更新完成！"
echo ""
echo "💡 现在手相和面相分析应该可以正常扣减2积分了"

# 清理临时文件
rm -f "$SQL_FILE"