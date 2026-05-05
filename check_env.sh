#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  检查环境配置文件"
echo "=========================================="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo ""
echo "=== 检查.env.production文件 ==="
if [ -f ".env.production" ]; then
    echo "✅ .env.production 文件存在"
    echo ""
    echo "文件大小: $(wc -c < .env.production) 字节"
    echo "行数: $(wc -l < .env.production) 行"
    echo ""

    echo "=== 环境变量列表 ==="
    grep -E "^[A-Z]" .env.production | sort

    echo ""
    echo "=== 详细配置内容（隐藏敏感信息）==="
    cat .env.production | sed -E 's/(SUPABASE_URL=|SUPABASE_SECRET_KEY=|INTERNAL_API_SECRET=|CRON_SECRET=|NEWAPI_API_KEY=|DEEPSEEK_API_KEY=|GEMINI_API_KEY=|VOLC_API_KEY=|WECHAT_PAY_PRIVATE_KEY=)(.*)/\1[已隐藏]/g'

    echo ""
    echo "=== 配置完整性检查 ==="

    # 检查必填配置项
    required_vars=(
        "NODE_ENV"
        "SUPABASE_URL"
        "SUPABASE_URL"
        "SUPABASE_SECRET_KEY"
        "SUPABASE_SYSTEM_ADMIN_EMAIL"
        "SUPABASE_SYSTEM_ADMIN_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env.production; then
            value=$(grep "^${var}=" .env.production | cut -d'=' -f2)
            if [ -n "$value" ] && [ "$value" != "your-"* ] && [ "$value" != "your-project"* ] && [ "$value" != "your-anon"* ] && [ "$value" != "your-service"* ] && [ "$value" != "your-secure"* ] && [ "$value" != "your-mchid"* ] && [ "$value" != "your-appid"* ] && [ "$value" != "your-api-v3"* ] && [ "$value" != "your-serial"* ]; then
                echo "✅ ${var} - 已配置"
            else
                echo "⚠️  ${var} - 需要填写实际值"
            fi
        else
            echo "❌ ${var} - 缺失"
        fi
    done

    # 检查可选但重要的配置项
    echo ""
    echo "=== 可选配置项 ==="
    optional_vars=(
        "INTERNAL_API_SECRET"
        "CRON_SECRET"
        "NEWAPI_BASE_URL"
        "NEWAPI_API_KEY"
        "DEEPSEEK_API_KEY"
        "DEEPSEEK_BASE_URL"
        "GEMINI_API_KEY"
        "VOLC_API_KEY"
    )

    for var in "${optional_vars[@]}"; do
        if grep -q "^${var}=" .env.production; then
            value=$(grep "^${var}=" .env.production | cut -d'=' -f2)
            if [ -n "$value" ] && [ "$value" != "your-"* ] && [ "$value" != "sk-"* ] && [ "$value" != "your-generated"* ]; then
                echo "✅ ${var} - 已配置"
            else
                echo "⚠️  ${var} - 未配置或为示例值"
            fi
        else
            echo "➖ ${var} - 未设置"
        fi
    done

else
    echo "❌ .env.production 文件不存在"
fi

echo ""
echo "=== 检查其他可能的配置文件 ==="
ls -la .env* 2>/dev/null || echo "未找到其他.env文件"
EOF
