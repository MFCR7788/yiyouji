#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  修改启动脚本并重启服务"
echo "=========================================="

sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 1. 备份并修改启动脚本 ==="
cat > /root/yiyouji/start.sh << 'STARTSCRIPT'
#!/bin/bash
set -e

export NODE_ENV=production
export PORT=3000

cd /root/yiyouji

if [ -f ".env.production" ]; then
    set -a
    source .env.production
    set +a
fi

if [ -d ".next/standalone" ]; then
    echo "使用standalone模式启动..."
    cd .next/standalone
    PORT=3000 node server.js
else
    echo "使用next start启动..."
    pnpm start
fi
STARTSCRIPT

chmod +x /root/yiyouji/start.sh

echo ""
echo "=== 2. 停止PM2服务 ==="
pm2 delete yiyouji 2>/dev/null || true

echo ""
echo "=== 3. 查看环境变量加载 ==="
echo "检查关键环境变量:"
grep -E "^(SUPABASE_URL|SUPABASE_ANON_KEY)=" .env.production

echo ""
echo "=== 4. 使用环境变量启动PM2 ==="
set -a
source .env.production
set +a
pm2 start /root/yiyouji/start.sh --name yiyouji

echo ""
echo "=== 5. 等待服务启动 ==="
sleep 5

echo ""
echo "=== 6. 查看PM2状态 ==="
pm2 status

echo ""
echo "=== 7. 查看最新日志 ==="
pm2 logs yiyouji --lines 50 --nostream
EOF
