#!/bin/bash
# 从本地 .env.local 文件同步配置到 GitHub Secrets

set -e

echo "=========================================="
echo "📦 从本地 .env.local 同步配置到 GitHub Secrets"
echo "=========================================="
echo ""

# 检查是否存在 .env.local 文件
if [ ! -f ".env.local" ]; then
    echo "❌ 错误：未找到 .env.local 文件"
    echo "   请确保在项目根目录运行此脚本"
    exit 1
fi

# 检查是否安装了 gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 错误：未安装 GitHub CLI (gh)"
    echo "   请先安装: https://cli.github.com/"
    exit 1
fi

# 检查是否已登录 GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ 错误：未登录 GitHub"
    echo "   请先登录: gh auth login"
    exit 1
fi

# 需要同步到 Secrets 的敏感配置列表
SECRETS_TO_SYNC=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SECRET_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_SYSTEM_ADMIN_EMAIL"
    "SUPABASE_SYSTEM_ADMIN_PASSWORD"
    "SUPABASE_DB_URL"
    "INTERNAL_API_SECRET"
    "CRON_SECRET"
    "DEEPSEEK_API_KEY"
    "DEEPSEEK_BASE_URL"
    "GEMINI_API_KEY"
    "VOLC_API_KEY"
    "ALIYUN_SMS_ACCESS_KEY_ID"
    "ALIYUN_SMS_ACCESS_KEY_SECRET"
    "DIFY_API_KEY"
    "DIFY_API_URL"
    "AMAP_WEB_SERVICE_KEY"
    "MCP_JWT_SECRET"
    "WECHAT_PRIVATE_KEY"
    "WECHAT_PAY_PRIVATE_KEY"
    "MINGAI_FALLBACK_MODELS_JSON"
    "LINUXDO_CLIENT_ID"
    "LINUXDO_CLIENT_SECRET"
    "NEWAPI_BASE_URL"
    "NEWAPI_API_KEY"
    "OCTOPUS_BASE_URL"
    "OCTOPUS_API_KEY"
)

echo "📝 正在读取 .env.local 文件..."
echo ""

# 读取每个配置并同步到 GitHub Secrets
for secret_name in "${SECRETS_TO_SYNC[@]}"; do
    # 从 .env.local 文件中读取值（处理引号）
    value=$(grep "^${secret_name}=" ".env.local" | cut -d'=' -f2- | sed 's/^"//;s/"$//')
    
    if [ -z "$value" ]; then
        echo "⚠️  跳过 $secret_name (值为空)"
        continue
    fi
    
    # 处理多行私钥
    if [[ "$secret_name" == *"PRIVATE_KEY"* ]]; then
        # 读取完整的多行私钥
        value=$(awk -v key="$secret_name" '
            BEGIN {in_key=0}
            $0 ~ "^"key"=" {in_key=1; print substr($0, length(key)+2); next}
            in_key {print; if ($0 ~ /"$/) exit}
        ' ".env.local" | sed 's/^"//;s/"$//')
    fi
    
    echo "🔄 同步 $secret_name..."
    
    # 使用 gh CLI 设置 Secret
    echo "$value" | gh secret set "$secret_name" --repo MFCR7788/yiyouji
    
    if [ $? -eq 0 ]; then
        echo "✅ $secret_name 同步成功"
    else
        echo "❌ $secret_name 同步失败"
    fi
    
    echo ""
done

echo "=========================================="
echo "🎉 配置同步完成！"
echo "=========================================="
echo ""
echo "💡 现在可以推送代码，GitHub Actions 会自动部署到阿里云服务器"
echo "   git add . && git commit -m \"chore: 更新配置\" && git push"