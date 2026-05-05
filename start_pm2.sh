#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 配置并启动PM2服务 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 检查PM2 ==="
which pm2 || npm install -g pm2
pm2 --version

echo ""
echo "=== 检查构建产物 ==="
ls -la .next/standalone/ 2>/dev/null || echo "未找到standalone构建产物"
ls -la .next/ 2>/dev/null | head -10

echo ""
echo "=== 创建PM2启动脚本 ==="
cat > /root/yiyouji/start.sh << 'STARTSCRIPT'
#!/bin/bash
export NODE_ENV=production
export PORT=3000

cd /root/yiyouji

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
echo "=== 检查端口占用 ==="
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000 || echo "3000端口未被占用"

echo ""
echo "=== 启动PM2服务 ==="
cd /root/yiyouji
pm2 delete yiyouji 2>/dev/null || true
pm2 start /root/yiyouji/start.sh --name yiyouji

echo ""
echo "=== 查看PM2状态 ==="
pm2 status

echo ""
echo "=== 查看PM2日志 ==="
sleep 2
pm2 logs yiyouji --lines 20 --nostream
EOF
