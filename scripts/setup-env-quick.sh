#!/bin/bash

# 微信支付快速配置脚本
# 适用于已知道所有配置信息的部署场景

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目目录
PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$PROJECT_DIR/.env"

# 打印标题
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  一游己 微信支付快速配置${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否已存在 .env 文件
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  发现已存在 .env 文件!${NC}"
    read -p "是否覆盖？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}取消配置，保留现有文件。${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}⚠️  请手动编辑脚本中的配置信息!${NC}"
echo -e "${YELLOW}⚠️  或者使用 setup-env.sh 交互式配置${NC}"
echo ""

# 创建 .env 文件（模板，不含敏感信息）
cat > "$ENV_FILE" << 'EOF'
# 微信支付配置
WECHAT_PAY_MCHID=你的商户号
WECHAT_PAY_APPID=你的AppID
WECHAT_PAY_API_V3_KEY=你的APIv3密钥
WECHAT_PAY_MCH_SERIAL_NO=你的证书序列号
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
WECHAT_PAY_H5_DOMAIN=yiyouji.zjsifan.com
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
你的私钥内容
-----END PRIVATE KEY-----"
EOF

# 设置文件权限
chmod 600 "$ENV_FILE"

echo -e "${GREEN}✅ 配置完成！${NC}"
echo -e "${GREEN}✅ 文件权限已设置为 600 (仅所有者可读写)${NC}"
echo ""
echo -e "${BLUE}配置文件位置: $ENV_FILE${NC}"
echo ""

# 验证配置
echo -e "${BLUE}正在验证配置...${NC}"
echo ""

# 检查必要字段是否配置
CONFIG_OK=true
check_config() {
    local key=$1
    local value=$(grep "^$key=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -z "$value" ] || [ "$value" = "\"\"" ]; then
        echo -e "${RED}❌ $key: 未配置${NC}"
        CONFIG_OK=false
    else
        echo -e "${GREEN}✅ $key: 已配置${NC}"
    fi
}

check_config "WECHAT_PAY_MCHID"
check_config "WECHAT_PAY_APPID"
check_config "WECHAT_PAY_API_V3_KEY"
check_config "WECHAT_PAY_MCH_SERIAL_NO"
check_config "WECHAT_PAY_NOTIFY_URL"
check_config "WECHAT_PAY_PRIVATE_KEY"

echo ""
if [ "$CONFIG_OK" = true ]; then
    echo -e "${GREEN}🎉 所有配置项验证成功！${NC}"
    echo ""
    echo -e "${YELLOW}提示: 如需修改配置，直接编辑 $ENV_FILE${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ 有配置项缺失，请重新运行脚本或手动编辑 .env 文件${NC}"
    echo ""
    exit 1
fi
