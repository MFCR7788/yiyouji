#!/bin/bash
echo "=== 开始SSH连接到服务器 ==="
echo "服务器: 42.121.219.223"
echo "用户: root"
echo ""

export SSHPASS='Admain>>>0307'

sshpass -e ssh -o StrictHostKeyChecking=no \
    -o ConnectTimeout=30 \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=5 \
    -o TCPKeepAlive=yes \
    root@42.121.219.223 << 'EOF'
echo "=========================================="
echo "  SSH连接成功！"
echo "=========================================="
echo ""
echo "=== 系统信息 ==="
uname -a
echo ""
echo "=== 系统运行时间 ==="
uptime
echo ""
echo "=== 磁盘使用情况 ==="
df -h /
echo ""
echo "=== 内存使用情况 ==="
free -h 2>/dev/null || cat /proc/meminfo | head -3
echo ""
echo "=== 检查Web服务状态 ==="
systemctl status nginx 2>/dev/null | head -10 || echo "nginx服务未找到"
echo "---"
systemctl status apache2 2>/dev/null | head -10 || systemctl status httpd 2>/dev/null | head -10 || echo "Apache/httpd服务未找到"
echo ""
echo "=== 检查Node.js/Python/Java进程 ==="
ps aux | grep -E '(node|python|java|pm2)' | grep -v grep | head -10
echo ""
echo "=== 检查Docker容器 ==="
docker ps 2>/dev/null || echo "Docker未安装或未运行"
echo ""
echo "=== 检查监听端口 ==="
netstat -tlnp 2>/dev/null | head -20 || ss -tlnp 2>/dev/null | head -20 || echo "无法获取端口信息"
echo ""
echo "=== 检查网站目录 ==="
for dir in /var/www/html /home/*/www /opt /srv/www; do
    if [ -d "$dir" ]; then
        echo "发现目录: $dir"
        ls -la "$dir" 2>/dev/null | head -5
        echo ""
    fi
done
echo ""
echo "=========================================="
echo "  服务器检查完成"
echo "=========================================="
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSH会话正常结束"
else
    echo ""
    echo "✗ SSH连接或执行命令时出错"
fi
