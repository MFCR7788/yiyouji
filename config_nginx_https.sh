#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 配置Nginx支持HTTPS域名 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "=== 1. 创建完整的Nginx配置文件 ==="
cat > /etc/nginx/sites-available/yiyouji << 'NGINXCONF'
server {
    listen 80;
    server_name yiyouji.zjsifan.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yiyouji.zjsifan.com;

    ssl_certificate /etc/letsencrypt/live/yiyouji.zjsifan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yiyouji.zjsifan.com/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    ssl_stapling on;
    ssl_stapling_verify on;

    client_max_body_size 100M;

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

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF

echo ""
echo "=== 2. 删除旧的IP配置 ==="
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "=== 3. 启用新配置 ==="
ln -sf /etc/nginx/sites-available/yiyouji /etc/nginx/sites-enabled/yiyouji

echo ""
echo "=== 4. 测试Nginx配置 ==="
nginx -t

echo ""
echo "=== 5. 重启Nginx ==="
systemctl restart nginx
systemctl status nginx | head -10

echo ""
echo "=== 6. 检查端口监听 ==="
netstat -tlnp 2>/dev/null | grep -E ':(80|443)' || ss -tlnp 2>/dev/null | grep -E ':(80|443)'

echo ""
echo "=== 7. 查看PM2服务 ==="
pm2 status

echo ""
echo "=== 8. 测试本地访问 ==="
curl -I http://localhost 2>&1 | head -10
curl -I https://localhost 2>&1 | head -10
EOF
