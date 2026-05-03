#!/bin/bash

# 环境变量验证脚本
# 检查 .env 文件是否配置正确

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
echo -e "${BLUE}  一游己 环境配置验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env 文件不存在!${NC}"
    echo ""
    echo -e "${YELLOW}请先运行配置脚本:${NC}"
    echo -e "  - ./scripts/setup-env.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ .env 文件存在${NC}"
echo ""

# 检查文件权限
PERMISSIONS=$(stat -c "%a" "$ENV_FILE")
if [ "$PERMISSIONS" = "600" ]; then
    echo -e "${GREEN}✅ 文件权限安全 (600)${NC}"
else
    echo -e "${YELLOW}⚠️  建议设置文件权限为 600${NC}"
    echo -e "${YELLOW}   运行: chmod 600 $ENV_FILE${NC}"
fi
echo ""

# 验证微信支付配置检查
echo -e "${BLUE}检查微信支付配置...${NC}"
echo ""

# 检查配置项
CONFIG_OK=true
check_config() {
    local key=$1
    local required=$2
    local value=$(grep "^$key=" "$ENV_FILE" | cut -d'=' -f2- | sed 's/^"//;s/"$//')
    if [ "$required" = "required" ]; then
        if [ -z "$value" ] || [ "$value" = "你的商户号" ] || [ "$value" = "你的AppID" ] || [ "$value" = "你的APIv3密钥" ] || [ "$value" = "你的证书序列号" ] || [ "$value" = "你的私钥内容" ]; then
            echo -e "${RED}❌ $key: 未配置${NC}"
            CONFIG_OK=false
        else
            local show_value=$(echo "$value" | head -c 20)
            [ ${#value} -gt 20 ] && show_value="$show_value..."
            echo -e "${GREEN}✅ $key: 已配置${NC}"
        fi
    else
        if [ -z "$value" ]; then
            echo -e "${YELLOW}⚠️  $key: 未配置 (可选)${NC}"
        else
            echo -e "${GREEN}✅ $key: 已配置${NC}"
        fi
    fi
}

echo -e "${BLUE}---${NC}"

check_config "WECHAT_PAY_MCHID" "required"
check_config "WECHAT_PAY_APPID" "required"
check_config "WECHAT_PAY_API_V3_KEY" "required"
check_config "WECHAT_PAY_MCH_SERIAL_NO" "required"
check_config "WECHAT_PAY_NOTIFY_URL" "required"
check_config "WECHAT_PAY_H5_DOMAIN" "optional"
check_config "WECHAT_PAY_PRIVATE_KEY" "required"

echo ""

if [ "$CONFIG_OK" = true ]; then
    echo -e "${GREEN}🎉 所有必需配置项验证成功!${NC}"
    echo ""
    echo -e "${BLUE}提示: 可以安全部署到服务器了！${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ 有配置项缺失，请重新配置${NC}"
    echo ""
    exit 1
fi
