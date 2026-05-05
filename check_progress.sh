#!/bin/bash
export SSHPASS="Admin>>>0307"
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
echo "=== 检查部署进度 ==="
echo ""
echo "=== 检查node ==="
node --version 2>/dev/null || echo "node未完成安装"
npm --version 2>/dev/null || echo "npm未完成安装"

echo ""
echo "=== 检查pnpm ==="
ls -la /root/.local/share/pnpm/ 2>/dev/null || echo "pnpm目录不存在"

echo ""
echo "=== 检查仓库 ==="
ls -la /root/ 2>/dev/null
EOF
