#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 构建项目 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 检查环境变量 ==="
echo ".env.production内容:"
cat .env.production 2>/dev/null | head -30 || echo "未找到.env.production"

echo ""
echo "=== 开始构建项目 ==="
pnpm build 2>&1
EOF
