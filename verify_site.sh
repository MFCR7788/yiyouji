#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 验证网站服务 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "=== 检查PM2状态 ==="
pm2 status

echo ""
echo "=== 检查端口监听 ==="
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000

echo ""
echo "=== 尝试本地访问 ==="
curl -I http://localhost:3000 2>&1 | head -15

echo ""
echo "=== 检查防火墙 ==="
ufw status 2>/dev/null || echo "防火墙未启用或不可用"
iptables -L -n 2>/dev/null | grep 3000 || echo "iptables未拦截3000端口"

echo ""
echo "=== 检查nginx ==="
which nginx && nginx -v || echo "nginx未安装"
systemctl status nginx 2>/dev/null | head -5 || echo "nginx服务未运行"
EOF
