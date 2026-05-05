#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 配置域名SSL证书 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "=== 1. 安装Certbot ==="
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

echo ""
echo "=== 2. 检查域名DNS解析 ==="
echo "yiyouji.zjsifan.com 解析状态:"
nslookup yiyouji.zjsifan.com 2>/dev/null || dig yiyouji.zjsifan.com +short 2>/dev/null || host yiyouji.zjsifan.com 2>/dev/null || echo "请确认域名已解析到 42.121.219.223"

echo ""
echo "=== 3. 停止nginx临时 ==="
systemctl stop nginx

echo ""
echo "=== 4. 获取SSL证书 ==="
certbot certonly --standalone -d yiyouji.zjsifan.com --non-interactive --agree-tos --email admin@zjsifan.com --http-01-port 80

echo ""
echo "=== 5. 检查证书是否获取成功 ==="
ls -la /etc/letsencrypt/live/yiyouji.zjsifan.com/ 2>/dev/null || echo "证书目录不存在"

echo ""
echo "=== 6. 重新启动nginx ==="
systemctl start nginx
systemctl status nginx | head -10
EOF
