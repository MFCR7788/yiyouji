#!/bin/bash

# 知识库创建失败深度诊断工具
# 用于获取详细的错误信息和系统状态

set -e

echo "=========================================="
echo "🔍 知识库创建失败 - 深度诊断"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}请按以下步骤操作获取详细错误信息：${NC}"
echo ""

# 步骤 1: 浏览器控制台
echo -e "${BLUE}[步骤 1] 打开浏览器开发者工具${NC}"
echo "----------------------------------------"
echo "1. 在知识库页面按 F12 (或右键 → 检查)"
echo "2. 切换到 'Console' (控制台) 标签"
echo "3. 再次点击 '创建知识库' 按钮"
echo "4. 查找红色错误信息，类似："
echo ""
echo -e "   ${RED}POST /api/knowledge-base 500${NC}"
echo -e "   ${RED}{error: '创建知识库失败', ...}${NC}"
echo ""
echo "5. 复制完整的错误信息"
echo ""

# 步骤 2: 网络请求详情
echo -e "${BLUE}[步骤 2] 检查网络请求${NC}"
echo "----------------------------------------"
echo "1. 切换到 'Network' (网络) 标签"
echo "2. 点击 'Fetch/XHR' 过滤器"
echo "3. 再次点击 '创建知识库'"
echo "4. 找到 'knowledge-base' 请求"
echo "5. 点击该请求 → 查看 'Response' (响应) 标签"
echo "6. 复制响应内容"
echo ""

# 步骤 3: 可能的原因列表
echo -e "${BLUE}[步骤 3] 常见原因排查${NC}"
echo "=========================================="
echo ""

echo -e "${YELLOW}❓ 请确认以下问题：${NC}"
echo ""
echo "1. 你的会员等级是什么？"
echo "   - Free 用户: ${RED}无法创建知识库${NC}（需要 Plus 或 Pro）"
echo "   - Plus 用户: 最多创建 3 个知识库"
echo "   - Pro 用户: 最多创建 10 个知识库"
echo ""
echo "2. 是否已经在 Supabase Dashboard 执行了 SQL 迁移？"
echo "   - 如果没有，函数 create_knowledge_base_with_limit 不存在"
echo ""
echo "3. 知识库功能是否在后台开启？"
echo "   - 需要在 app_settings 表中启用 'knowledge-base' 功能开关"
echo ""

# 步骤 4: 快速测试脚本
echo -e "${BLUE}[步骤 4] 自动化检测（如果可用）${NC}"
echo "----------------------------------------"

# 检查是否有 .env 文件且有配置
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ 发现 .env.local 文件${NC}"
    
    # 尝试读取关键配置（不显示敏感信息）
    if grep -q "SUPABASE_URL=" .env.local; then
        echo -e "${GREEN}✓ SUPABASE_URL 已配置${NC}"
    else
        echo -e "${RED}✗ SUPABASE_URL 未配置${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL 已配置${NC}"
    else
        echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL 未配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 未找到 .env.local 文件${NC}"
fi

echo ""

# 步骤 5: 提供解决方案
echo -e "${BLUE}[步骤 5] 解决方案${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}方案 A: 如果你是 Free 用户${NC}"
echo "  → 升级到 Plus 或 Pro 会员才能使用知识库功能"
echo ""
echo -e "${YELLOW}方案 B: 如果数据库函数未创建${NC}"
echo "  → 在 Supabase SQL Editor 执行迁移文件:"
echo "     supabase/migrations/20260505_fix_knowledge_base_rpc_functions.sql"
echo ""
echo -e "${YELLOW}方案 C: 如果功能开关未启用${NC}"
echo "  → 在 Supabase 执行:"
echo ""
cat << 'SQL_EOF'
-- 检查并启用知识库功能开关
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('knowledge-base', true)
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = true;

-- 验证
SELECT * FROM app_settings WHERE setting_key = 'knowledge-base';
SQL_EOF
echo ""
echo -e "${YELLOW}方案 D: 如果达到数量限制${NC}"
echo "  → 删除不需要的知识库或升级会员等级"
echo ""

echo "=========================================="
echo -e "${CYAN}💡 下一步操作建议${NC}"
echo "=========================================="
echo ""
echo "1. 先完成 [步骤 1] 和 [步骤 2]，获取具体错误信息"
echo "2. 将错误信息粘贴给我，我会提供针对性修复"
echo "3. 或者告诉我你的会员等级和已创建的知识库数量"
echo ""
echo -e "${GREEN}需要我帮你做什么？${NC}"
echo "- 检查会员等级？"
echo "- 验证数据库函数？"
echo "- 启用功能开关？"
echo "- 其他问题排查？"
echo ""
