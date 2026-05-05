#!/bin/bash
export SSHPASS="Admin>>>0307"

echo "=== 安装项目依赖 ==="
sshpass -e ssh -o StrictHostKeyChecking=no root@42.121.219.223 << 'EOF'
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

cd /root/yiyouji

echo "=== 检查.env配置 ==="
if [ -f ".env.production.example" ]; then
    echo "找到.env.production.example，复制为.env.production..."
    cp .env.production.example .env.production
    echo "需要配置以下环境变量:"
    grep -E "^[A-Z]" .env.production.example | head -20
elif [ -f ".env.example" ]; then
    echo "找到.env.example，复制为.env..."
    cp .env.example .env
    echo "需要配置以下环境变量:"
    grep -E "^[A-Z]" .env.example | head -20
else
    echo "未找到环境变量配置文件"
fi

echo ""
echo "=== 开始安装依赖 (pnpm install) ==="
pnpm install 2>&1

echo ""
echo "=== 依赖安装完成 ==="
echo "项目已安装的依赖数量:"
ls -la node_modules 2>/dev/null | head -5 || echo "node_modules不存在"
EOF
