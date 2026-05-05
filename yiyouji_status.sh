#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 易有吉服务管理脚本 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo ""
echo "=========================================="
echo "  易有吉 - 服务状态报告"
echo "=========================================="
echo ""

echo "=== PM2服务状态 ==="
pm2 status

echo ""
echo "=== PM2服务详细信息 ==="
pm2 info yiyouji | head -20

echo ""
echo "=== PM2实时日志 (最后50行) ==="
pm2 logs yiyouji --lines 50 --nostream

echo ""
echo "=== Nginx状态 ==="
systemctl status nginx | head -10

echo ""
echo "=== 端口监听状态 ==="
netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000)' || ss -tlnp 2>/dev/null | grep -E ':(80|443|3000)'

echo ""
echo "=== 磁盘使用情况 ==="
df -h /

echo ""
echo "=== 内存使用情况 ==="
free -h

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://42.121.219.223"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs yiyouji"
echo "  重启服务: pm2 restart yiyouji"
echo "  停止服务: pm2 stop yiyouji"
echo "  Nginx日志: tail -f /var/log/nginx/access.log"
echo ""
EOF
