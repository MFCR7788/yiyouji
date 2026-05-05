#!/bin/bash

# 环境变量诊断工具 - 检查所有必需的环境变量是否已配置
# 用法: ./scripts/check-env.sh [env_file]
# 示例: ./scripts/check-env.sh .env.local

set -e

echo "=========================================="
echo "🔍 环境变量诊断工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 要检查的文件（优先级：参数 > .env.local > .env）
ENV_FILE="${1:-.env.local}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 文件不存在: $ENV_FILE${NC}"
    echo ""
    echo -e "${YELLOW}可用选项:${NC}"
    echo "  1. 使用默认文件: .env.local"
    echo "  2. 指定其他文件: $0 <file_path>"
    exit 1
fi

echo -e "${CYAN}📄 检查文件: $ENV_FILE${NC}"
echo ""

# 统计变量
TOTAL=0
CONFIGURED=0
MISSING=0
EMPTY=0

# 定义要检查的环境变量及其重要性
declare -A ENV_VARS=(
    # 基础配置
    ["NODE_ENV"]="基础|必填"
    
    # Supabase 核心配置（最关键）
    ["SUPABASE_URL"]="Supabase|必填"
    ["SUPABASE_ANON_KEY"]="Supabase|必填"
    ["SUPABASE_SECRET_KEY"]="Supabase|推荐"
    ["SUPABASE_SYSTEM_ADMIN_EMAIL"]="系统管理|必填"
    ["SUPABASE_SYSTEM_ADMIN_PASSWORD"]="系统管理|必填"
    ["SUPABASE_DB_URL"]="数据库|可选"
    
    # 内部API密钥
    ["INTERNAL_API_SECRET"]="内部API|必填"
    
    # AI API 配置
    ["NEWAPI_BASE_URL"]="AI网关|推荐"
    ["NEWAPI_API_KEY"]="AI网关|推荐"
    ["DEEPSEEK_API_KEY"]="DeepSeek|推荐"
    ["DEEPSEEK_BASE_URL"]="DeepSeek|可选"
    ["GEMINI_API_KEY"]="Gemini|可选"
    ["VOLC_API_KEY"]="火山引擎|可选"
    
    # 微信支付
    ["WECHAT_PAY_MCHID"]="微信支付|必填"
    ["WECHAT_PAY_APPID"]="微信支付|必填"
    ["WECHAT_PAY_API_V3_KEY"]="微信支付|必填"
    ["WECHAT_PAY_MCH_SERIAL_NO"]="微信支付|必填"
    ["WECHAT_PAY_PRIVATE_KEY"]="微信支付|必填"
    ["WECHAT_PAY_NOTIFY_URL"]="微信支付|必填"
    
    # MCP 服务配置
    ["MCP_JWT_SECRET"]="MCP OAuth|必填"
    ["MCP_ISSUER_URL"]="MCP OAuth|推荐"
    ["TAIBU_SITE_URL"]="品牌站点|推荐"
    
    # 其他服务
    ["ALIYUN_SMS_ACCESS_KEY_ID"]="阿里云短信|可选"
    ["AMAP_WEB_SERVICE_KEY"]="高德地图|可选"
    ["DIFY_API_KEY"]="Dify工作流|可选"
    ["CRON_SECRET"]="定时任务|必填"
)

echo -e "${BLUE}📊 环境变量检查结果${NC}"
echo "----------------------------------------"

# 分类统计
CRITICAL_MISSING=""
IMPORTANT_MISSING=""

for var in "${!ENV_VARS[@]}"; do
    TOTAL=$((TOTAL + 1))
    
    # 从文件中读取值
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
    
    category_importance="${ENV_VARS[$var]}"
    category=$(echo "$category_importance" | cut -d'|' -f1)
    importance=$(echo "$category_importance" | cut -d'|' -f2)
    
    if [ -z "$value" ] || [ "$value" = "" ]; then
        MISSING=$((MISSING + 1))
        
        if [ "$importance" = "必填" ]; then
            CRITICAL_MISSING="$CRITICAL_MISSING\n  ❌ $var ($category)"
            echo -e "${RED}❌ ${var}${NC} ${YELLOW}[${importance}]${NC} ${RED}<未设置>${NC}"
        else
            IMPORTANT_MISSING="$IMPORTANT_MISSING\n  ⚠️  $var ($category) [${importance}]"
            echo -e "${YELLOW}⚠️  ${var}${NC} ${YELLOW}[${importance}]${NC} ${YELLOW}<未设置>${NC}"
        fi
    else
        CONFIGURED=$((CONFIGURED + 1))
        
        # 显示部分敏感信息（隐藏密钥中间部分）
        display_value=""
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
            if [ ${#value} -gt 8 ]; then
                display_value="${value:0:4}...${value: -4}"
            else
                display_value="***已设置***"
            fi
        else
            display_value="$value"
        fi
        
        echo -e "${GREEN}✅ ${var}${NC} ${YELLOW}[${importance}]${NC} ${GREEN}= ${display_value}${NC}"
    fi
done

echo ""
echo "----------------------------------------"
echo -e "${BLUE}📈 统计信息${NC}"
echo "----------------------------------------"
echo -e "总变量数:     ${CYAN}$TOTAL${NC}"
echo -e "已配置:       ${GREEN}$CONFIGURED${NC}"
echo -e "未配置:       ${RED}$MISSING${NC}"

# 计算百分比
PERCENT=$((CONFIGURED * 100 / TOTAL))

if [ $PERCENT -ge 80 ]; then
    STATUS_COLOR=$GREEN
    STATUS_MSG="良好"
elif [ $PERCENT -ge 50 ]; then
    STATUS_COLOR=$YELLOW
    STATUS_MSG="一般"
else
    STATUS_COLOR=$RED
    STATUS_MSG="需要完善"
fi

echo -e "完成度:       ${STATUS_COLOR}${PERCENT}% (${STATUS_MSG})${NC}"
echo ""

# 关键缺失项提示
if [ -n "$CRITICAL_MISSING" ]; then
    echo -e "${RED}⚠️  关键缺失项（可能导致功能异常）:${NC}"
    echo -e "$CRITICAL_MISSING"
    echo ""
fi

if [ -n "$IMPORTANT_MISSING" ]; then
    echo -e "${YELLOW}💡 推荐配置项（影响部分功能体验）:${NC}"
    echo -e "$IMPORTANT_MISSING"
    echo ""
fi

# 快速修复建议
echo -e "${BLUE}🔧 快速修复建议${NC}"
echo "----------------------------------------"
echo ""

case $PERCENT in
    100)
        echo -e "${GREEN}✨ 完美！所有环境变量都已正确配置！${NC}"
        ;;
    [8-9][0-9])
        echo -e "${GREEN}✅ 配置基本完整，建议补充以下项目以获得最佳体验：${NC}"
        ;;
    [5-7][0-9])
        echo -e "${YELLOW}⚠️  部分关键变量未配置，请尽快补充：${NC}"
        ;;
    *)
        echo -e "${RED}❌ 大量关键变量未配置，应用可能无法正常运行！${NC}"
        echo -e "${RED}   请立即参考 .env.example 文件进行配置。${NC}"
        ;;
esac

echo ""
echo -e "${CYAN}📝 下一步操作${NC}"
echo "----------------------------------------"
echo ""
echo "1. 复制模板文件:"
echo "   ${GREEN}cp .env.example .env.local${NC}"
echo ""
echo "2. 编辑并填写实际值:"
echo "   ${GREEN}nano .env.local${NC}"
echo "   或使用 VS Code / 其他编辑器打开"
echo ""
echo "3. 重新运行此脚本验证:"
echo "   ${GREEN}./scripts/check-env.sh .env.local${NC}"
echo ""
echo "4. 重启服务使配置生效:"
echo "   ${GREEN}pnpm dev${NC} (开发环境)"
echo "   ${GREEN}pnpm build && pnpm start${NC} (生产环境)"
echo ""

echo "=========================================="
echo -e "${CYAN}诊断完成${NC}"
echo "=========================================="
