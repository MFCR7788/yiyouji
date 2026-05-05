#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  清理端口并重启服务"
echo "=========================================="

sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 1. 检查3000端口占用 ==="
lsof -i :3000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000

echo ""
echo "=== 2. 杀掉所有占用3000端口的进程 ==="
pkill -f "next-server" 2>/dev/null || true
pkill -f "node.*3000" 2>/dev/null || true
sleep 2

echo ""
echo "=== 3. 确认端口已释放 ==="
lsof -i :3000 2>/dev/null || echo "端口3000已释放"

echo ""
echo "=== 4. 删除PM2进程 ==="
pm2 delete yiyouji 2>/dev/null || true

echo ""
echo "=== 5. 使用环境变量启动PM2 ==="
set -a
source .env.production
set +a
pm2 start /root/yiyouji/start.sh --name yiyouji

echo ""
echo "=== 6. 等待服务启动 ==="
sleep 5

echo ""
echo "=== 7. 查看PM2状态 ==="
pm2 status

echo ""
echo "=== 8. 查看最新错误日志 ==="
pm2 logs yiyouji --err --lines 30 --nostream

echo ""
echo "=== 9. 查看最新输出日志 ==="
pm2 logs yiyouji --out --lines 20 --nostream

echo ""
echo "=== 10. 测试服务 ==="
curl -I http://localhost:3000 2>&1 | head -15
EOF
