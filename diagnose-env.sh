#!/bin/bash

# =====================================================
# 易有吉 - 环境变量诊断脚本
# 用途：检查生产环境的 VOLC_API_KEY 和 MINGAI_FALLBACK_MODELS_JSON 配置
# 使用：ssh root@42.121.219.223 'bash -s' < diagnose-env.sh
# =====================================================

echo "🔍 易有吉 - 生产环境诊断脚本"
echo "=========================================="
echo ""

# 检查 .env 文件是否存在
ENV_FILE="/opt/apps/yiyouji/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env 文件不存在: $ENV_FILE"
    exit 1
fi

echo "✅ 找到 .env 文件: $ENV_FILE"
echo ""

# 检查 VOLC_API_KEY
echo "1️⃣  检查 VOLC_API_KEY:"
VOLC_KEY=$(grep "^VOLC_API_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VOLC_KEY" ]; then
    echo "   ✅ VOLC_API_KEY 已配置"
    echo "   值: ${VOLC_KEY:0:10}...${VOLC_KEY: -4}"
else
    echo "   ❌ VOLC_API_KEY 未配置或为空"
fi
echo ""

# 检查 MINGAI_FALLBACK_MODELS_JSON
echo "2️⃣  检查 MINGAI_FALLBACK_MODELS_JSON:"
JSON_VALUE=$(grep "^MINGAI_FALLBACK_MODELS_JSON=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -z "$JSON_VALUE" ]; then
    echo "   ❌ MINGAI_FALLBACK_MODELS_JSON 未配置"
else
    echo "   ✅ MINGAI_FALLBACK_MODELS_JSON 已配置"
    echo "   长度: ${#JSON_VALUE} 字符"
    echo ""
    
    # 尝试解析 JSON
    echo "   📝 JSON 内容预览 (前 200 字符):"
    echo "   ${JSON_VALUE:0:200}..."
    echo ""
    
    # 使用 Python 验证 JSON 格式
    if command -v python3 &> /dev/null; then
        echo "   🔬 验证 JSON 格式..."
        PARSED=$(echo "$JSON_VALUE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ JSON 格式正确')
    print(f'   模型数量: {len(data)}')
    
    # 检查视觉模型
    vision_models = [m for m in data if m.get('supportsVision') == True]
    print(f'   视觉模型数量: {len(vision_models)}')
    
    for m in vision_models:
        print(f\"   ✅ {m.get('name')} ({m.get('vendor')})\")
        
except Exception as e:
    print(f'❌ JSON 解析失败: {e}')
" 2>&1)
        
        echo "$PARSED" | while read line; do
            echo "   $line"
        done
    else
        echo "   ⚠️ Python3 未安装，无法验证 JSON"
    fi
fi
echo ""

# 检查 PM2 进程状态
echo "3️⃣  检查 PM2 服务状态:"
pm2 list 2>/dev/null || echo "   ⚠️ PM2 未运行"
echo ""

# 检查应用日志中的错误
echo "4️⃣  检查最近的错误日志:"
pm2 logs yiyouji --lines 20 --nostream 2>/dev/null | grep -i "error\|fail\|vision\|model" | tail -5 || echo "   （无相关错误）"
echo ""

echo "=========================================="
echo "🏁 诊断完成"
echo "=========================================="
