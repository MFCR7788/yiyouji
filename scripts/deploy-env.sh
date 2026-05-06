#!/bin/bash
# ============================================================
# 阿里云服务器 - 一键部署 .env 配置文件
# 
# 使用方法:
#   方法 1: ./deploy-env.sh <服务器IP> [密码]
#   方法 2: 手动执行下面的命令
#
# 功能:
#   - 自动备份现有配置
#   - 上传新的 .env 文件
#   - 设置正确的文件权限
#   - 验证配置是否正确
# ============================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SERVER_IP="${1:-}"
SSH_USER="root"
SSH_PORT=22
LOCAL_ENV_FILE=".env.production"
REMOTE_PROJECT_DIR=""  # 将自动检测

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     阿里云服务器 - 微信支付配置部署工具          ║"
echo "║     易有吉 (yiyouji.zjsifan.com)                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 检查本地文件是否存在
if [ ! -f "$LOCAL_ENV_FILE" ]; then
    echo -e "${RED}❌ 错误: 未找到 $LOCAL_ENV_FILE 文件${NC}"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

echo -e "${BLUE}📄 本地配置文件: $LOCAL_ENV_FILE${NC}"

# 检查参数
if [ -z "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  未提供服务器 IP 地址${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 <服务器IP> [密码]"
    echo ""
    echo "示例:"
    echo "  $0 47.96.123.456 your_password"
    echo ""
    
    read -p "请输入服务器 IP 地址: " SERVER_IP
    
    if [ -z "$SERVER_IP" ]; then
        echo -e "${RED}❌ 未提供 IP，退出${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📍 目标服务器: ${SSH_USER}@${SERVER_IP}${NC}"
echo ""

# 测试 SSH 连接
echo -e "${YELLOW}1️⃣  测试 SSH 连接...${NC}"
ssh -o ConnectTimeout=5 -o BatchMode=yes -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "echo '✅ 连接成功'" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  需要密码认证${NC}"
    
    if [ -z "$2" ]; then
        read -sp "请输入服务器密码: " SERVER_PASS
        echo ""
    else
        SERVER_PASS="$2"
    fi
    
    if command -v sshpass &> /dev/null; then
        echo -e "${GREEN}✅ 使用 sshpass 自动登录${NC}"
        SSH_PREFIX="sshpass -p '${SERVER_PASS}' ssh"
        SCP_PREFIX="sshpass -p '${SERVER_PASS}' scp"
    else
        echo -e "${RED}❌ 未安装 sshpass，请先安装:${NC}"
        echo "  macOS: brew install sshpass (或使用 brew install hudochenkov/sshpass/sshpass)"
        echo "  Ubuntu: sudo apt install sshpass"
        echo "  CentOS: sudo yum install sshpass"
        echo ""
        echo "或者使用下面的手动部署方式"
        exit 1
    fi
else
    SSH_PREFIX="ssh"
    SCP_PREFIX="scp"
fi

# 检测远程项目目录
echo -e "${YELLOW}2️⃣  检测远程项目目录...${NC}"
REMOTE_PROJECT_DIR=$(${SSH_PREFIX} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} bash -s << 'DETECT_DIR'
for dir in /root/yiyouji /home/yiyouji /var/www/yiyouji /opt/yiyouji /srv/yiyouji; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo "$dir"
        exit 0
    fi
done
echo "NOT_FOUND"
DETECT_DIR
)

if [ "$REMOTE_PROJECT_DIR" = "NOT_FOUND" ] || [ -z "$REMOTE_PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  未自动检测到项目目录${NC}"
    read -p "请输入远程项目路径 (如 /root/yiyouji): " REMOTE_PROJECT_DIR
    
    if [ -z "$REMOTE_PROJECT_DIR" ]; then
        echo -e "${RED}❌ 未提供路径，退出${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ 项目目录: $REMOTE_PROJECT_DIR${NC}"
echo ""

# 备份现有配置
echo -e "${YELLOW}3️⃣  备份现有配置...${NC}"
${SSH_PREFIX} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "
cd ${REMOTE_PROJECT_DIR}
if [ -f .env ]; then
    BACKUP_FILE=.env.backup.$(date +%Y%m%d_%H%M%S)
    cp .env \$BACKUP_FILE
    echo \"✅ 已备份到 \$BACKUP_FILE\"
else
    echo \"ℹ️  无现有 .env 文件\"
fi
"

# 上传新配置
echo -e "${YELLOW}4️⃣  上传新的 .env 文件...${NC}"
${SCP_PREFIX} -P ${SSH_PORT} ${LOCAL_ENV_FILE} ${SSH_USER}@${SERVER_IP}:${REMOTE_PROJECT_DIR}/.env

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 文件上传成功${NC}"
else
    echo -e "${RED}❌ 文件上传失败${NC}"
    exit 1
fi

# 设置权限
echo -e "${YELLOW}5️⃣  设置文件权限...${NC}"
${SSH_PREFIX} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "
cd ${REMOTE_PROJECT_DIR}
chmod 600 .env
echo '✅ 权限设置为 600 (仅所有者可读写)'
"

# 验证配置
echo -e "${YELLOW}6️⃣  验证配置...${NC}"
${SSH_PREFIX} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} << 'VERIFY_CONFIG'
cd ${REMOTE_PROJECT_DIR}

echo ""
echo "=== 关键配置检查 ==="

# 检查微信支付配置
echo ""
echo "📌 微信支付配置:"
for var in WECHAT_PAY_MCHID WECHAT_PAY_APPID WECHAT_PAY_API_V3_KEY WECHAT_PAY_MCH_SERIAL_NO WECHAT_PAY_PRIVATE_KEY WECHAT_PAY_NOTIFY_URL; do
    value=$(grep "^${var}=" .env | cut -d'=' -f2-)
    if [ -n "$value" ]; then
        if [ "$var" = "WECHAT_PAY_PRIVATE_KEY" ]; then
            echo "  ✅ $var = ***已配置*** (长度: ${#value})"
        elif [ "$var" = "WECHAT_PAY_API_V3_KEY" ]; then
            echo "  ✅ $var = ***已配置*** (长度: ${#value})"
        else
            echo "  ✅ $var = $value"
        fi
    else
        echo "  ❌ $var = 未配置"
    fi
done

# 检查代理配置
echo ""
echo "📌 代理配置:"
if grep -q "^ALL_PROXY=$" .env; then
    echo "  ✅ ALL_PROXY = (空 - 直连模式)"
else
    ALL_PROXY_VAL=$(grep "^ALL_PROXY=" .env | cut -d'=' -f2-)
    if [ -n "$ALL_PROXY_VAL" ]; then
        echo "  ⚠️  ALL_PROXY = $ALL_PROXY_VAL (将影响微信支付)"
    else
        echo "  ℹ️  ALL_PROXY = 未设置"
    fi
fi

# 检查其他关键配置
echo ""
echo "📌 其他关键配置:"
for var in NODE_ENV SUPABASE_URL WEB_PORT MCP_PORT; do
    value=$(grep "^${var}=" .env | cut -d'=' -f2-)
    echo "  ✅ $var = $value"
done

echo ""
echo "=== 验证完成 ==="
VERIFY_CONFIG

# 重启服务提示
echo ""
echo -e "${YELLOW}7️⃣  下一步操作...${NC}"
echo ""
echo -e "${GREEN}✅ 配置文件已成功部署！${NC}"
echo ""
echo "现在需要重启服务使配置生效："
echo ""
echo "方法 1 - PM2 (推荐):"
echo "  ssh ${SSH_USER}@${SERVER_IP} 'cd ${REMOTE_PROJECT_DIR} && pm2 restart all'"
echo ""
echo "方法 2 - Systemd:"
echo "  ssh ${SSH_USER}@${SERVER_IP} 'systemctl restart yiyouji'"
echo ""
echo "方法 3 - Docker:"
echo "  ssh ${SSH_USER}@${SERVER_IP} 'cd ${REMOTE_PROJECT_DIR} && docker-compose restart'"
echo ""

read -p "是否现在重启服务? (y/n): " RESTART_NOW

if [ "$RESTART_NOW" = "y" ] || [ "$RESTART_NOW" = "Y" ]; then
    echo -e "${YELLOW}正在重启服务...${NC}"
    ${SSH_PREFIX} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "
cd ${REMOTE_PROJECT_DIR}
if command -v pm2 &> /dev/null && pm2 list &>/dev/null; then
    pm2 restart all
    echo '✅ PM2 服务已重启'
elif [ -f docker-compose.yml ]; then
    docker-compose restart
    echo '✅ Docker 容器已重启'
else
    echo '⚠️  无法自动确定服务管理方式，请手动重启'
fi
"
    echo -e "${GREEN}✅ 服务重启完成！${NC}"
fi

# 最终提示
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              🎉 部署完成！                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                ║"
echo "║  📍 服务器: ${SERVER_IP}                       ║"
echo "║  📂 项目目录: ${REMOTE_PROJECT_DIR}            ║"
echo "║  📄 配置文件: .env (权限: 600)                ║"
echo "║                                                ║"
echo "║  ⏭️  下一步:                                   ║"
echo "║  1. 访问 https://yiyouji.zjsifan.com           ║"
echo "║  2. 测试订阅支付功能                           ║"
echo "║  3. 查看日志确认无报错                         ║"
echo "║                                                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 清理临时函数
unset SSH_PREFIX SCP_PREFIX
