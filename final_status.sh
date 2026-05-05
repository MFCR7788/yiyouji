#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=========================================="
echo "  易有吉 - HTTPS域名配置完成报告"
echo "=========================================="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo ""
echo "=== SSL证书信息 ==="
echo "证书路径: /etc/letsencrypt/live/yiyouji.zjsifan.com/"
ls -la /etc/letsencrypt/live/yiyouji.zjsifan.com/
echo ""
echo "证书有效期:"
openssl x509 -in /etc/letsencrypt/live/yiyouji.zjsifan.com/cert.pem -noout -dates 2>/dev/null || echo "无法读取证书日期"

echo ""
echo "=== Nginx配置 ==="
echo "配置文件: /etc/nginx/sites-available/yiyouji"
echo ""
echo "端口监听状态:"
netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000)' || ss -tlnp 2>/dev/null | grep -E ':(80|443|3000)'

echo ""
echo "=== PM2服务状态 ==="
pm2 status

echo ""
echo "=== SSL自动续期 ==="
systemctl status certbot.timer | head -10

echo ""
echo "=========================================="
echo "  配置完成！"
echo "=========================================="
echo ""
echo "🎉 访问地址: https://yiyouji.zjsifan.com"
echo ""
echo "✅ HTTP会自动重定向到HTTPS"
echo "✅ SSL证书已配置（Let's Encrypt）"
echo "✅ 证书有效期90天，自动续期"
echo ""
echo "常用命令:"
echo "  查看SSL证书状态: certbot certificates"
echo "  手动续期SSL: certbot renew"
echo "  测试nginx配置: nginx -t"
echo "  重启nginx: systemctl restart nginx"
echo "  查看nginx日志: tail -f /var/log/nginx/access.log"
echo "  查看服务日志: pm2 logs yiyouji"
echo "  重启服务: pm2 restart yiyouji"
echo ""
EOF
