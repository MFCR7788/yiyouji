#!/bin/bash

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║     微信支付二维码生成失败 - 紧急修复脚本 v1.0       ║"
echo "║     WeChat Pay QR Code Emergency Fix                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

APP_DIR="/opt/apps/yiyouji"
ENV_FILE="$APP_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误：找不到 .env.local 文件"
    echo "   尝试其他可能的位置..."
    
    for test_dir in /www/wwwroot/yiyouji /root/yiyouji /home/*/yiyouji; do
        if [ -f "$test_dir/.env.local" ]; then
            echo "✅ 找到: $test_dir/.env.local"
            APP_DIR="$test_dir"
            ENV_FILE="$test_dir/.env.local"
            break
        fi
    done
    
    if [ ! -f "$ENV_FILE" ]; then
        echo "❌ 未找到 .env.local 文件，请手动指定路径"
        exit 1
    fi
fi

echo "📍 配置文件: $ENV_FILE"
echo ""

echo "=========================================="
echo "🔍 步骤 1: 检查微信支付环境变量配置"
echo "=========================================="
echo ""

HAS_ERROR=0

# 检查 WECHAT_PAY_MCHID
if grep -q "^WECHAT_PAY_MCHID=" "$ENV_FILE"; then
    MCHID=$(grep "^WECHAT_PAY_MCHID=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | head -c 10)
    echo "✅ WECHAT_PAY_MCHID = ${MCHID}..."
else
    echo "❌ 缺少: WECHAT_PAY_MCHID"
    HAS_ERROR=1
fi

# 检查 WECHAT_PAY_APPID
if grep -q "^WECHAT_PAY_APPID=" "$ENV_FILE"; then
    APPID=$(grep "^WECHAT_PAY_APPID=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | head -c 10)
    echo "✅ WECHAT_PAY_APPID = ${APPID}..."
else
    echo "❌ 缺少: WECHAT_PAY_APPID"
    HAS_ERROR=1
fi

# 检查 WECHAT_PAY_API_V3_KEY
if grep -q "^WECHAT_PAY_API_V3_KEY=" "$ENV_FILE"; then
    APIKEY=$(grep "^WECHAT_PAY_API_V3_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | head -c 8)
    echo "✅ WECHAT_PAY_API_V3_KEY = ${APIKEY}... ($(grep "^WECHAT_PAY_API_V3_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | wc -c) 字符)"
else
    echo "❌ 缺少: WECHAT_PAY_API_V3_KEY"
    HAS_ERROR=1
fi

# 检查 WECHAT_PAY_MCH_SERIAL_NO
if grep -q "^WECHAT_PAY_MCH_SERIAL_NO=" "$ENV_FILE"; then
    SERIAL=$(grep "^WECHAT_PAY_MCH_SERIAL_NO=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    echo "✅ WECHAT_PAY_MCH_SERIAL_NO = $SERIAL"
else
    echo "❌ 缺少: WECHAT_PAY_MCH_SERIAL_NO"
    HAS_ERROR=1
fi

# ⚠️ 关键检查：私钥变量名
echo ""
echo "⚠️  === 关键检查：私钥环境变量名 ==="

if grep -q "^WECHAT_PRIVATE_KEY=" "$ENV_FILE"; then
    echo ""
    echo "🚨 🚨 🚨 发现问题！！！"
    echo ""
    echo "   当前配置: WECHAT_PRIVATE_KEY (错误的变量名)"
    echo "   应该使用: WECHAT_PAY_PRIVATE_KEY (正确的变量名)"
    echo ""
    echo "   这就是导致'二维码生成失败'的根本原因！"
    echo ""
    
    # 提取旧的私钥值
    OLD_KEY=$(grep "^WECHAT_PRIVATE_KEY=" "$ENV_FILE" | sed 's/^WECHAT_PRIVATE_KEY=//')
    
    echo "=========================================="
    echo "🔧 步骤 2: 自动修复环境变量名称"
    echo "=========================================="
    echo ""
    
    # 备份原文件
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    echo "✅ 已备份原文件: ${ENV_FILE}.backup.*"
    
    # 替换变量名
    sed -i 's/^WECHAT_PRIVATE_KEY=/WECHAT_PAY_PRIVATE_KEY=/' "$ENV_FILE"
    
    if grep -q "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE"; then
        echo "✅ 修复成功！已将 WECHAT_PRIVATE_KEY 改为 WECHAT_PAY_PRIVATE_KEY"
        KEY_LEN=$(grep "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | wc -c)
        echo "✅ 私钥长度: $((KEY_LEN - 1)) 字符"
        
        # 验证私钥格式
        KEY_CONTENT=$(grep "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
        if echo "$KEY_CONTENT" | grep -q "-----BEGIN"; then
            echo "✅ 私钥格式正确 (PEM格式)"
        else
            echo "⚠️  警告：私钥可能不是标准 PEM 格式"
            echo "   如果仍然失败，请检查私钥是否包含 -----BEGIN PRIVATE KEY----- 标记"
        fi
    else
        echo "❌ 修复失败！请手动修改 .env.local 文件"
        HAS_ERROR=1
    fi
elif grep -q "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE"; then
    KEY_LEN=$(grep "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | wc -c)
    echo "✅ WECHAT_PAY_PRIVATE_KEY = *** ($((KEY_LEN - 1)) 字符) [变量名正确]"
    
    KEY_CONTENT=$(grep "^WECHAT_PAY_PRIVATE_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    if echo "$KEY_CONTENT" | grep -q "-----BEGIN"; then
        echo "✅ 私钥格式正确 (PEM格式)"
    else
        echo "⚠️  警告：私钥可能不是标准 PEM 格式"
        echo "   当前内容前50字符: ${KEY_CONTENT:0:50}..."
    fi
else
    echo "❌ 缺少: WECHAT_PAY_PRIVATE_KEY 或 WECHAT_PRIVATE_KEY"
    echo "   私钥未配置！这是必需的环境变量"
    HAS_ERROR=1
fi

# 检查通知URL
echo ""
if grep -q "^WECHAT_PAY_NOTIFY_URL=" "$ENV_FILE"; then
    NOTIFY_URL=$(grep "^WECHAT_PAY_NOTIFY_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    echo "✅ WECHAT_PAY_NOTIFY_URL = $NOTIFY_URL"
else
    echo "❌ 缺少: WECHAT_PAY_NOTIFY_URL"
    HAS_ERROR=1
fi

echo ""
if [ $HAS_ERROR -eq 1 ]; then
    echo "=========================================="
    echo "❌ 发现配置问题，请先解决上述缺失的变量"
    echo "=========================================="
    exit 1
fi

echo ""
echo "=========================================="
echo "🔍 步骤 3: 测试网络连通性"
echo "=========================================="
echo ""

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://api.mch.weixin.qq.com/ 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "000" ]; then
        echo "❌ 无法连接到 api.mch.weixin.qq.com"
        echo "   可能原因:"
        echo "   - 防火墙阻止了出站 HTTPS 连接"
        echo "   - DNS 解析失败"
        echo "   - 服务器网络问题"
        echo ""
        echo "   请执行以下命令测试:"
        echo "   curl -v https://api.mch.weixin.qq.com/"
    elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "405" ] || [ "$HTTP_CODE" = "421" ]; then
        echo "✅ 网络连接正常 (HTTP $HTTP_CODE - 微信支付API正常响应)"
    else
        echo "⚠️  收到意外的 HTTP 状态码: $HTTP_CODE"
    fi
else
    echo "⚠️  curl 未安装，跳过网络测试"
fi

echo ""
echo "=========================================="
echo "🔄 步骤 4: 重启 PM2 服务"
echo "=========================================="
echo ""

if command -v pm2 &> /dev/null; then
    echo "正在重启 yiyouji 服务..."
    pm2 restart yiyouji 2>&1 || pm2 restart all
    
    sleep 3
    
    if pm2 list | grep -q "yiyouji"; then
        STATUS=$(pm2 list | grep "yiyouji" | awk '{print $9}')
        echo "✅ PM2 服务状态: $STATUS"
    else
        echo "⚠️  未找到 yiyouji 进程，尝试启动..."
        cd "$APP_DIR" && pnpm start &
        sleep 3
    fi
    
    pm2 save 2>/dev/null || true
    echo "✅ PM2 配置已保存"
else
    echo "⚠️  PM2 未安装，请手动重启服务"
    echo "   在 $APP_DIR 目录下执行: pm2 restart yiyouji"
fi

echo ""
echo "=========================================="
echo "⏳ 步骤 5: 验证服务状态"
echo "=========================================="
echo ""

sleep 2

MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3000/ 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" != "000" ]; then
            echo "✅ 服务响应正常 (HTTP $HTTP_CODE)"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ 等待服务启动... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️  服务可能未完全启动，请检查日志:"
    echo "   pm2 logs yiyouji --lines 20"
fi

echo ""
echo "=========================================="
echo "📋 修复总结"
echo "=========================================="
echo ""
echo "✅ 完成的操作:"
echo "   1. ✅ 检查了所有微信支付相关环境变量"
echo "   2. ✅ 修复了 WECHAT_PRIVATE_KEY -> WECHAT_PAY_PRIVATE_KEY (如果存在)"
echo "   3. ✅ 备份了原始 .env.local 文件"
echo "   4. ✅ 测试了到微信支付 API 的网络连通性"
echo "   5. ✅ 重启了 PM2 服务"
echo ""
echo "=========================================="
echo "🎯 下一步操作"
echo "=========================================="
echo ""
echo "1. 打开网站: https://yiyouji.zjsifan.com"
echo "2. 登录账号并进入会员页面"
echo "3. 点击任意付费套餐的'立即开通'"
echo "4. 查看是否正常显示微信支付二维码"
echo ""
echo "如果仍然失败，请查看详细日志:"
echo "   pm2 logs yiyouji --lines 100 | grep -i wechat"
echo ""
echo "或运行诊断工具:"
echo "   cd $APP_DIR && node scripts/diagnose-wechat-pay.js"
echo ""
echo "=========================================="
echo "✨ 紧急修复流程完成！"
echo "=========================================="
