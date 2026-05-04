#!/bin/bash

# 知识库创建失败排查脚本
# 用于诊断和修复知识库相关的问题

set -e

echo "=========================================="
echo "知识库创建失败诊断工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# 1. 检查环境变量
echo -e "${BLUE}[1/6] 检查环境变量...${NC}"

if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}✗ SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_URL 未设置${NC}"
else
    check_status 0 "Supabase URL 已配置"
fi

if [ -z "$SUPABASE_ANON_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ SUPABASE_ANON_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置${NC}"
else
    check_status 0 "Supabase Anon Key 已配置"
fi

if [ -z "$INTERNAL_API_SECRET" ]; then
    echo -e "${YELLOW}⚠ INTERNAL_API_SECRET 未设置（向量索引功能可能不可用）${NC}"
else
    check_status 0 "Internal API Secret 已配置"
fi

if [ "$VECTOR_SEARCH_ENABLED" = "true" ] || [ "$VECTOR_SEARCH_ENABLED" = "1" ]; then
    check_status 0 "向量搜索功能已启用"
else
    echo -e "${YELLOW}⚠ 向量搜索功能未启用（可选）${NC}"
fi

echo ""

# 2. 检查 .env 文件
echo -e "${BLUE}[2/6] 检查 .env 文件...${NC}"

if [ -f ".env.local" ]; then
    check_status 0 ".env.local 文件存在"
elif [ -f ".env" ]; then
    check_status 0 ".env 文件存在"
elif [ -f ".env.production" ]; then
    check_status 0 ".env.production 文件存在"
else
    echo -e "${RED}✗ 未找到环境变量文件${NC}"
fi

echo ""

# 3. 检查数据库连接（如果安装了 supabase CLI）
echo -e "${BLUE}[3/6] 检查 Supabase 连接...${NC}"

if command -v supabase &> /dev/null; then
    check_status 0 "Supabase CLI 已安装"
    
    # 尝试检查项目链接状态
    if supabase db remote status &> /dev/null; then
        check_status 0 "Supabase 远程数据库已连接"
    else
        echo -e "${YELLOW}⚠ 无法验证远程数据库连接状态${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Supabase CLI 未安装，跳过数据库连接检查${NC}"
fi

echo ""

# 4. 检查迁移文件
echo -e "${BLUE}[4/6] 检查关键迁移文件...${NC}"

MIGRATION_FILE="supabase/migrations/20260505_fix_knowledge_base_rpc_functions.sql"

if [ -f "$MIGRATION_FILE" ]; then
    check_status 0 "修复迁移文件已创建: $MIGRATION_FILE"
    
    # 检查文件内容
    if grep -q "create_knowledge_base_with_limit" "$MIGRATION_FILE"; then
        check_status 0 "包含 create_knowledge_base_with_limit 函数"
    else
        echo -e "${RED}✗ 缺少 create_knowledge_base_with_limit 函数${NC}"
    fi
    
    if grep -q "kb_replace_source_entries" "$MIGRATION_FILE"; then
        check_status 0 "包含 kb_replace_source_entries 函数"
    else
        echo -e "${RED}✗ 缺少 kb_replace_source_entries 函数${NC}"
    fi
else
    echo -e "${RED}✗ 修复迁移文件不存在: $MIGRATION_FILE${NC}"
fi

echo ""

# 5. 检查代码一致性
echo -e "${BLUE}[5/6] 检查 API 路由代码...${NC}"

ROUTE_FILE="src/app/api/knowledge-base/route.ts"

if [ -f "$ROUTE_FILE" ]; then
    check_status 0 "API 路由文件存在: $ROUTE_FILE"
    
    # 检查是否调用了正确的函数
    if grep -q "create_knowledge_base_with_limit" "$ROUTE_FILE"; then
        check_status 0 "API 调用了 create_knowledge_base_with_limit"
    else
        echo -e "${RED}✗ API 未调用 create_knowledge_base_with_limit${NC}"
    fi
else
    echo -e "${RED}✗ API 路由文件不存在: $ROUTE_FILE${NC}"
fi

INGEST_FILE="src/lib/knowledge-base/ingest.ts"

if [ -f "$INGEST_FILE" ]; then
    check_status 0 "Ingest 文件存在: $INGEST_FILE"
    
    if grep -q "kb_replace_source_entries" "$INGEST_FILE"; then
        check_status 0 "Ingest 调用了 kb_replace_source_entries"
    else
        echo -e "${RED}✗ Ingest 未调用 kb_replace_source_entries${NC}"
    fi
else
    echo -e "${RED}✗ Ingest 文件不存在: $INGEST_FILE${NC}"
fi

echo ""

# 6. 提供修复建议
echo -e "${BLUE}[6/6] 修复建议...${NC}"
echo ""
echo -e "${YELLOW}请按以下步骤执行修复：${NC}"
echo ""
echo "1. 执行数据库迁移："
echo "   ${GREEN}supabase db push${NC}"
echo "   或者手动执行 SQL："
echo "   ${GREEN}psql \$DATABASE_URL -f supabase/migrations/20260505_fix_knowledge_base_rpc_functions.sql${NC}"
echo ""
echo "2. 验证函数是否创建成功："
echo "   ${GREEN}supabase db reset --dry-run${NC}"
echo ""
echo "3. 重启开发服务器："
echo "   ${GREEN}pnpm dev${NC}"
echo ""
echo "4. 测试知识库创建功能"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
