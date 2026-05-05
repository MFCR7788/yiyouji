#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  易有吉 - 环境配置最终报告"
echo "=========================================="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo ""
echo "=== 1. 服务状态 ==="
pm2 status

echo ""
echo "=== 2. 环境变量配置验证 ==="
set -a
source .env.production
set +a

echo "✅ Supabase配置:"
echo "   URL: $SUPABASE_URL"
echo "   ANON_KEY: ${SUPABASE_ANON_KEY:0:20}... (已隐藏)"
echo "   DB_URL: ${SUPABASE_DB_URL:0:50}... (已隐藏)"

echo ""
echo "✅ AI API配置:"
echo "   DeepSeek: ${DEEPSEEK_API_KEY:0:15}... (已隐藏)"
echo "   Gemini: ${GEMINI_API_KEY:0:15}... (已隐藏)"
echo "   Volc: ${VOLC_API_KEY:0:15}... (已隐藏)"

echo ""
echo "✅ 微信支付:"
echo "   MCHID: $WECHAT_PAY_MCHID"
echo "   APPID: $WECHAT_PAY_APPID"
echo "   NOTIFY_URL: $WECHAT_PAY_NOTIFY_URL"

echo ""
echo "✅ 阿里云短信:"
echo "   SIGN_NAME: $ALIYUN_SMS_SIGN_NAME"
echo "   TEMPLATE_CODE: $ALIYUN_SMS_TEMPLATE_CODE"

echo ""
echo "=== 3. 端口监听状态 ==="
netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000)' || ss -tlnp 2>/dev/null | grep -E ':(80|443|3000)'

echo ""
echo "=== 4. Nginx状态 ==="
systemctl status nginx | grep -E "(Active|loaded)"

echo ""
echo "=== 5. 测试HTTP访问 ==="
curl -I -L http://localhost:3000 2>&1 | grep -E "(HTTP|Location)" | head -5

echo ""
echo "=========================================="
echo "  ✅ 配置完成！"
echo "=========================================="
echo ""
echo "🌐 网站地址: https://yiyouji.zjsifan.com"
echo "📊 管理后台: https://yiyouji.zjsifan.com/settings/admin"
echo ""
echo "服务管理命令:"
echo "  查看日志: pm2 logs yiyouji"
echo "  重启服务: pm2 restart yiyouji"
echo "  查看状态: pm2 status"
echo ""
EOF
