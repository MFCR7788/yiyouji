#!/bin/bash

# =============================================================================
# 服务器环境变量一键配置脚本（安全版）
# 
# ⚠️ 重要提示：
# 此脚本不包含任何真实的 API 密钥或密码
# 请在使用前将 <YOUR_XXX> 占位符替换为实际值
#
# 用法: ./scripts/deploy-env.sh [服务器IP] [用户名] [项目路径]
# 示例: ./scripts/deploy-env.sh 42.121.219.223 root /www/yiyouji
# =============================================================================

set -e

echo "=========================================="
echo "🚀 服务器环境变量自动部署工具"
echo "=========================================="
echo ""

SERVER_IP="${1:-42.121.219.223}"
SERVER_USER="${2:-root}"
PROJECT_PATH="${3:-/www/yiyouji}"

echo "📋 配置信息:"
echo "   服务器: ${SERVER_IP}"
echo "   用户:   ${SERVER_USER}"
echo "   路径:   ${PROJECT_PATH}"
echo ""

read -p "是否继续？(y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "[1/5] 连接服务器..."

if ! ssh -o ConnectTimeout=5 -o BatchMode=yes ${SERVER_USER}@${SERVER_IP} "echo 'SSH连接成功'" 2>/dev/null; then
    echo "❌ 无法连接到服务器"
    exit 1
fi

echo "✅ SSH连接正常"
echo ""

echo "[2/5] 检查项目目录..."
ssh ${SERVER_USER}@${SERVER_IP} "
if [ ! -d '${PROJECT_PATH}' ]; then
    echo '❌ 项目目录不存在'
    exit 1
fi
echo '✅ 项目目录验证通过'
"

echo ""
echo "[3/5] 备份现有配置..."
ssh ${SERVER_USER}@${SERVER_IP} "
cd ${PROJECT_PATH}
if [ -f '.env.local' ] || [ -f '.env' ]; then
    BACKUP_NAME=\".env.backup.\$(date +%Y%m%d_%H%M%S)\"
    cp .env.local \$BACKUP_NAME 2>/dev/null || cp .env \$BACKUP_NAME 2>/dev/null || true
    echo \"✅ 已备份\"
else
    echo ℹ️  无旧配置，将创建新文件
fi
"

echo ""
echo "[4/5] 创建新的 .env.local 文件..."
ssh ${SERVER_USER}@${SERVER_IP} "
cd ${PROJECT_PATH}
cat > .env.local << 'ENVEOF'
NODE_ENV=production
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SECRET_KEY=<YOUR_SUPABASE_SECRET_KEY>
SUPABASE_SYSTEM_ADMIN_EMAIL=<YOUR_ADMIN_EMAIL>
SUPABASE_SYSTEM_ADMIN_PASSWORD=<YOUR_ADMIN_PASSWORD>
INTERNAL_API_SECRET=<YOUR_INTERNAL_API_SECRET>
CRON_SECRET=<YOUR_CRON_SECRET>
DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
VOLC_API_KEY=<YOUR_VOLC_API_KEY>
ALIYUN_SMS_ACCESS_KEY_ID=<YOUR_ALIYUN_ACCESS_KEY_ID>
ALIYUN_SMS_ACCESS_KEY_SECRET=<YOUR_ALIYUN_ACCESS_KEY_SECRET>
AMAP_WEB_SERVICE_KEY=15f07bda1a25f9b0768a03cd44a43058
WECHAT_PAY_MCHID=<YOUR_WECHAT_MCHID>
WECHAT_PAY_APPID=<YOUR_WECHAT_APPID>
WECHAT_PAY_API_V3_KEY=<YOUR_WECHAT_API_V3_KEY>
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
USE_LOCAL_DB=false
ENVEOF
echo '✅ 模板文件已创建'
"

echo ""
echo "[5/5] 重启服务..."
ssh ${SERVER_USER}@${SERVER_IP} "
cd ${PROJECT_PATH}
pm2 restart all 2>/dev/null || echo '请手动重启服务'
"

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
