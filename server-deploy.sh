#!/bin/bash
set -e

APP_DIR="/opt/apps/yiyouji"
DEPLOY_FILE="/opt/apps/yiyouji-deploy.tar.gz"
PM2_NAME="yiyouji"

echo "[DEPLOY] 停止旧服务..."
pm2 stop $PM2_NAME 2>/dev/null || true

echo "[DEPLOY] 备份旧版本..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
if [ -d "$APP_DIR" ]; then
    mv "$APP_DIR" "${APP_DIR}-backup-${TIMESTAMP}" || rm -rf "$APP_DIR"
    ls -dt /opt/apps/yiyouji-backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
fi

echo "[DEPLOY] 创建目录并解压..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"
tar -xzf "$DEPLOY_FILE"
rm -f "$DEPLOY_FILE"

echo "[DEPLOY] 验证 .env 文件中的 JSON 格式..."
if grep -q "MINGAI_FALLBACK_MODELS_JSON=" .env; then
    echo "✅ MINGAI_FALLBACK_MODELS_JSON 已写入"
    python3 << 'PYEOF'
import json
with open('.env', 'r') as f:
    content = f.read()
for line in content.split('\n'):
    if line.startswith('MINGAI_FALLBACK_MODELS_JSON='):
        json_str = line.split('=', 1)[1]
        try:
            data = json.loads(json_str)
            vision_models = [m for m in data if m.get('supportsVision') == True]
            print(f'✅ JSON 格式正确，包含 {len(data)} 个模型，其中 {len(vision_models)} 个视觉模型')
            for m in vision_models:
                print(f'   ✅ {m.get("name")} ({m.get("vendor")})')
        except Exception as e:
            print(f'❌ JSON 解析失败: {e}')
        break
PYEOF
else
    echo "❌ MINGAI_FALLBACK_MODELS_JSON 未找到"
fi

echo "[DEPLOY] 启动新服务..."
pm2 delete $PM2_NAME 2>/dev/null || true
pm2 start server.js --name $PM2_NAME

echo "[DEPLOY] 等待服务启动..."
sleep 8

echo "[DEPLOY] 验证服务状态..."
pm2 status $PM2_NAME

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "[DEPLOY] HTTP 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 部署成功！"
else
    echo "⚠️ HTTP 状态码异常: $HTTP_CODE，可能需要手动检查"
fi

ls -dt /opt/apps/yiyouji-backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

echo ""
echo "=========================================="
echo "🎉 部署流程完成！"
echo "=========================================="
