#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 安装并配置Nginx ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "=== 安装nginx ==="
apt-get update -y
apt-get install -y nginx

echo ""
echo "=== 配置nginx反向代理 ==="
cat > /etc/nginx/sites-available/yiyouji << 'NGINXCONF'
server {
    listen 80;
    server_name 42.121.219.223;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        client_max_body_size 100M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF

echo ""
echo "=== 启用站点配置 ==="
ln -sf /etc/nginx/sites-available/yiyouji /etc/nginx/sites-enabled/yiyouji

echo ""
echo "=== 测试nginx配置 ==="
nginx -t

echo ""
echo "=== 重启nginx ==="
systemctl restart nginx
systemctl enable nginx

echo ""
echo "=== 检查nginx状态 ==="
systemctl status nginx | head -10

echo ""
echo "=== 查看PM2服务 ==="
pm2 status
EOF
