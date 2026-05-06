#!/bin/bash
# ============================================================
# 阿里云服务器微信支付环境变量配置脚本
# 使用方法: ./setup-wechat-pay.sh <服务器IP> <密码>
# ============================================================

SERVER_IP="${1:-your_server_ip}"
SSH_USER="root"
SSH_PORT=22

echo "=========================================="
echo "  阿里云服务器 - 微信支付配置工具"
echo "=========================================="
echo ""

# 检查参数
if [ "$SERVER_IP" = "your_server_ip" ]; then
    echo "❌ 请提供服务器 IP 地址"
    echo ""
    echo "使用方法:"
    echo "  $0 <服务器IP> [密码]"
    echo ""
    echo "示例:"
    echo "  $0 47.96.123.456 your_password"
    exit 1
fi

echo "📍 目标服务器: ${SSH_USER}@${SERVER_IP}"
echo ""

# 测试连接
echo "1️⃣  测试 SSH 连接..."
ssh -o ConnectTimeout=5 -o BatchMode=yes -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "echo '✅ 连接成功'" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⚠️  需要密码认证或首次连接"
    echo ""
    read -sp "请输入服务器密码: " SERVER_PASS
    echo ""
    
    # 使用 sshpass（如果可用）或提示手动操作
    if command -v sshpass &> /dev/null; then
        echo "✅ 使用 sshpass 自动登录"
        SSH_CMD="sshpass -p '${SERVER_PASS}' ssh"
    else
        echo "⚠️  未安装 sshpass，将生成手动操作指南"
        SSH_CMD=""
    fi
else
    SSH_CMD="ssh"
fi

echo ""

# 备份现有配置
echo "2️⃣  备份现有 .env 文件..."
if [ -n "$SSH_CMD" ]; then
    ${SSH_CMD} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} "
        cd /root/yiyouji || cd /home/yiyouji || cd /var/www/yiyouji
        
        if [ -f .env ]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            echo '✅ 已备份 .env 文件'
        else
            echo 'ℹ️  未找到 .env 文件，将创建新文件'
        fi
    "
else
    cat << 'MANUAL_GUIDE'

============================================================
  📋 手动操作指南（请在另一终端执行）
============================================================

步骤 1: SSH 连接到服务器
----------------------------------------
ssh root@${SERVER_IP}

步骤 2: 进入项目目录
----------------------------------------
cd /root/yiyouji   # 或你的实际项目路径
# 可能的路径：
# /root/yiyouji
# /home/yiyouji  
# /var/www/yiyouji
# /opt/yiyouji

步骤 3: 备份现有配置
----------------------------------------
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

步骤 4: 编辑 .env 文件
----------------------------------------
nano .env   # 或 vim .env

步骤 5: 添加/修改以下内容
----------------------------------------

在文件末尾添加（或修改已有的）：

# ==================== ⭐ 代理配置（关键！）====================
# 生产环境清除所有代理设置，使用直连模式
ALL_PROXY=
all_proxy=
HTTP_PROXY=
http_proxy=
HTTPS_PROXY=
https_proxy=
NO_PROXY=localhost,127.0.0.1,::1,*.weixin.qq.com,*.qq.com

# ==================== 微信支付配置 ====================
WECHAT_PAY_MCHID=1624143377
WECHAT_PAY_APPID=wx314d6d3cfbd33e79
WECHAT_PAY_API_V3_KEY=SmallFish7788Admin03072298887777
WECHAT_PAY_MCH_SERIAL_NO=4C6F7C50450ED26AF84536A143BF7CF0F36D0AD5
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDHC32bPlhtiGkMAqST4AJeN58bpfIVnsc1xVfZxy7Sv0aLBmXmEPltlDyk/BIvE2pYr2+7nMfOS8IsX1pxuEoUkhHlAwIHhMNCrwO4Zhs+GhHWmFoKBTqyafNmD5RNU3g/hDx5+C0FBWBtwh+Q3T8K50Sdm2DAqHkXr88j9Zf6uRymY80+bRE02jVl+G3dBU9QEW/Yvu6+jPlweQhFxmj8upxRy8aeSPIyo+IOS5WmNVz4mD61EiwCQwtv50p2wSPA+s45jrUSyJ9aEb/KPZSldWs7YLWzK1Y22aMkUMsg/3Mlbvey3FEuj9zYojGMZMZZ8c1KOErttW9BxTRcTHClAgMBAAECggEBAIX2SddOIp21jV2z+ag8v9tBfChTi5bZgiHCa9n6oJzed0/iQnqROg5yEk7ICET+wDhn+r8+SYuimVDb7DdVXSZzGPAVEiyVQgWDXPGiZvto+FCBwTe1RUgG3vX1zk4su2WkTj+YtFQIxlmYqT4Kaf+gnyGkDX4c5UL35GXDSUJIXAufYhvfWquB00/5a6vLGC+kCVjCyKwgxkprwIBZvkSJI1U104lNnT12hfURgWYkO4dmI52HLDk5r0P/v6BKcN45xkn2GLnqWEhYpap/tfoovY0KfvmR+m4WKqpjEte0zxISDXWq6jwarUfpxcPu9w1/wOwD3TOi8lxMAcSta5ECgYEA5JFaF37fbx3Wow4iMl+lY3Jojbn7S77WA/62xQpReCzK2QMb+kblsk/xhp/6PaVRUG7GXMUQAEwD8jcdmSLyjLhxbZEob5SUeM3wyEhwthY0G1qcP1/+TqYp32e1asHkgzRYXs9oh0JamEF/6+FwCAnu3BgMtNVhMEhdxy86pSsCgYEA3u8PbydLwV48qoAQwuZu31YxzdMyOmsUP7FnkKIIvXgRhPWf2Dudb8jzqplW8plitFIXps8YeI2/RREMWOX8CigGaiGhPz90+rlBOZtyF9Js+4ZddDBM4a09DR5Vyq74KszXi8XxYvF++EnUuMjmbNiG6Nzk7wmWEwIMu9mo+W8CgYEAgr19qfjhd166+lPITcYWBVdY5NCgJIiJRIm7I+QuC66bbRxxMWzCUIeX4Oi7K+3XIEns3v29lF3m1/Kc1I5/7OxHvWONnJ2Be8RY2UdOaWkz7v2aaEnRXk1/oBFjXSiBPGeBsOG0qcHTrkmxEUzHV2HPJkf/ZKS1Tffm5FtokTcCgYA3xEFuIrxWkMZIOGT4/D+76onm3O/xoRudmzk2+vGIw+JOCkuEAdWuQuyBPn57jVcdmHOGLMQIVB0Gn+8gxdc4iy6fme4GLk+K8JCaYoI151OPz9rM19BDm9xrzazUWNSHkFpTAp8Riyuh3IYz+z14+Ok2kxtJmHJMKvUYgKg+TQKBgQCDMH68nR3oLn9OfBetYWNfSLuZr6dkuQ4WpQNAv8/+Vdo944XHRYQ6wYXm7gvU5CVR9iVj9mvCKbGJpdmdTM1q4uD+eRLr7XDDn/qLcy1rBMv1+IqJw+YPw+VTtyRY5pZiydtMPl2prgjngch36uAhF7hEbl8nkHommSqcjA+LoQ==
-----END PRIVATE KEY-----"
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
WECHAT_PAY_H5_DOMAIN=yiyouji.zjsifan.com

步骤 6: 保存并退出
----------------------------------------
Ctrl+O (保存)
Enter (确认)
Ctrl+X (退出)

步骤 7: 重启应用服务
----------------------------------------
pm2 restart all          # 如果使用 PM2
# 或
systemctl restart your-app  # 如果使用 systemd
# 或
docker-compose restart     # 如果使用 Docker

步骤 8: 验证配置
----------------------------------------
source .env && env | grep WECHAT_PAY

============================================================

MANUAL_GUIDE
    exit 0
fi

# 自动配置流程
if [ -n "$SSH_CMD" ]; then
    echo "3️⃣  配置微信支付环境变量..."
    
    ${SSH_CMD} -p ${SSH_PORT} ${SSH_USER}@${SERVER_IP} << 'REMOTE_SCRIPT'
        
        # 查找项目目录
        PROJECT_DIR=""
        for dir in /root/yiyouji /home/yiyouji /var/www/yiyouji /opt/yiyouji; do
            if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
                PROJECT_DIR="$dir"
                break
            fi
        done
        
        if [ -z "$PROJECT_DIR" ]; then
            echo "❌ 未找到项目目录，请手动指定路径"
            exit 1
        fi
        
        echo "📂 项目目录: $PROJECT_DIR"
        cd "$PROJECT_DIR"
        
        # 创建或更新 .env 文件
        cat >> .env << 'ENV_CONTENT'

# ==================== 微信支付配置（自动添加于 $(date)）====================
WECHAT_PAY_MCHID=1624143377
WECHAT_PAY_APPID=wx314d6d3cfbd33e79
WECHAT_PAY_API_V3_KEY=SmallFish7788Admin03072298887777
WECHAT_PAY_MCH_SERIAL_NO=4C6F7C50450ED26AF84536A143BF7CF0F36D0AD5
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
WECHAT_PAY_H5_DOMAIN=yiyouji.zjsifan.com

ENV_CONTENT
        
        echo "✅ 环境变量已写入 .env 文件"
        
        # 显示当前微信支付配置
        echo ""
        echo "4️⃣  当前微信支付配置:"
        grep -E "^WECHAT_PAY" .env | sed 's/=.*/=***/'  # 隐藏敏感信息
        
REMOTE_SCRIPT
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 配置完成！"
        echo ""
        echo "下一步操作:"
        echo "  1. 重启应用服务使配置生效:"
        echo "     ssh ${SSH_USER}@${SERVER_IP} 'pm2 restart all'"
        echo "     或"
        echo "     ssh ${SSH_USER}@${SERVER_IP} 'systemctl restart your-service'"
        echo ""
        echo "  2. 测试支付功能"
        echo "  3. 查看日志确认无报错"
    fi
fi

echo ""
echo "=========================================="
echo "  配置完成！"
echo "=========================================="
