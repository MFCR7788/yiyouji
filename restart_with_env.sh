#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  重启服务并加载新环境变量"
echo "=========================================="

sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 1. 停止当前服务 ==="
pm2 stop yiyouji

echo ""
echo "=== 2. 确认环境变量文件存在 ==="
ls -la .env.production
echo ""
echo "关键配置检查:"
grep -E "^(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SECRET_KEY)=" .env.production

echo ""
echo "=== 3. 使用update-env重启服务 ==="
export $(cat .env.production | grep -v '^#' | xargs) && pm2 start /root/yiyouji/start.sh --name yiyouji --update-env

echo ""
echo "=== 4. 等待服务启动 ==="
sleep 5

echo ""
echo "=== 5. 查看服务状态 ==="
pm2 status

echo ""
echo "=== 6. 查看最新日志 ==="
pm2 logs yiyouji --lines 50 --nostream
EOF
