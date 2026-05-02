#!/bin/bash

# =====================================================
# 易有吉 - 一键部署脚本
# 功能：本地构建 → 推送 GitHub → 手动部署到服务器
# 使用：./deploy.sh [选项]
#   -s, --skip-github    跳过 GitHub 推送，直接部署
#   -n, --no-build       跳过构建，使用现有 .next
#   -h, --help           显示帮助
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_DIR="/Users/aplle/文稿/yiyouji"
SERVER="root@42.121.219.223"
SERVER_APP_DIR="/opt/apps/yiyouji"
DEPLOY_FILE="yiyouji-deploy.tar.gz"
PM2_PROCESS_NAME="yiyouji"

# 参数解析
SKIP_GITHUB=false
NO_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--skip-github)
            SKIP_GITHUB=true
            shift
            ;;
        -n|--no-build)
            NO_BUILD=true
            shift
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  -s, --skip-github    跳过 GitHub 推送，直接部署到服务器"
            echo "  -n, --no-build       跳过构建，使用现有的 .next 目录"
            echo "  -h, --help           显示此帮助信息"
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "git 未安装"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装"
        exit 1
    fi
    
    log_success "前置条件检查通过"
}

# Git 操作：提交和推送
git_operations() {
    if [ "$SKIP_GITHUB" = true ]; then
        log_warn "跳过 GitHub 推送"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # 检查是否有未提交的更改
    if git diff --quiet && git diff --cached --quiet; then
        log_info "没有未提交的更改"
    else
        log_info "发现未提交的更改，自动提交..."
        
        # 显示更改状态
        git status --short
        
        # 自动添加所有文件
        git add -A
        
        # 生成提交信息（包含时间戳）
        COMMIT_MSG="deploy: auto-deploy $(date '+%Y-%m-%d %H:%M:%S')"
        
        # 提交
        git commit -m "$COMMIT_MSG" || log_warn "没有需要提交的内容"
        
        # 推送
        log_info "推送到 GitHub..."
        git push origin master
        
        log_success "代码已推送到 GitHub"
    fi
}

# 构建项目
build_project() {
    if [ "$NO_BUILD" = true ]; then
        log_warn "跳过构建，使用现有 .next 目录"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    log_info "清理旧的构建缓存..."
    rm -rf .next
    
    log_info "开始构建项目 (pnpm build)..."
    pnpm build
    
    if [ $? -ne 0 ]; then
        log_error "构建失败！"
        exit 1
    fi
    
    log_success "项目构建成功"
}

# 打包部署文件
package_deploy() {
    cd "$PROJECT_DIR"
    
    log_info "打包部署文件..."
    
    # 删除旧的打包文件
    rm -f "$DEPLOY_FILE"
    
    # 创建新的打包文件（只包含必要文件）
    tar -czvf "$DEPLOY_FILE" \
        -C .next/standalone . \
        -C ../.. .env public \
        2>&1 | tail -5
    
    FILE_SIZE=$(du -h "$DEPLOY_FILE" | cut -f1)
    log_success "打包完成: $DEPLOY_FILE ($FILE_SIZE)"
}

# 部署到服务器
deploy_to_server() {
    log_info "上传到服务器: $SERVER ..."
    
    # 上传打包文件
    scp "$PROJECT_DIR/$DEPLOY_FILE" "$SERVER:/opt/apps/"
    
    log_info "在服务器上执行部署..."
    
    # SSH 到服务器执行部署脚本
    ssh "$SERVER" bash -c "'
        set -e
        
        # 停止旧服务
        echo "[DEPLOY] 停止旧服务..."
        pm2 delete '"$PM2_PROCESS_NAME"' 2>/dev/null || true
        
        # 备份旧版本（保留最近3个）
        echo "[DEPLOY] 备份旧版本..."
        BACKUP_NAME=\"yiyouji-backup-\$(date +%Y%m%d%H%M%S)\"
        if [ -d \"'"$SERVER_APP_DIR"'\" ]; then
            mv \"'"$SERVER_APP_DIR"'" \"/opt/apps/\$BACKUP_NAME\" 2>/dev/null || true
            
            # 清理旧备份（保留最近3个）
            ls -dt /opt/apps/yiyouji-backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
        fi
        
        # 创建新目录并解压
        echo "[DEPLOY] 解压新版本..."
        mkdir -p \"'"$SERVER_APP_DIR"'\"
        cd \"'"$SERVER_APP_DIR"'\"
        tar -xzf /opt/apps/'"$DEPLOY_FILE"'
        
        # 启动新服务
        echo "[DEPLOY] 启动新服务..."
        pm2 start server.js --name '"$PM2_PROCESS_NAME"'
        
        # 等待服务启动
        sleep 8
        
        # 验证服务状态
        echo "[DEPLOY] 验证服务状态..."
        pm2 status '"$PM2_PROCESS_NAME"'
        
        HTTP_STATUS=\$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3000)
        echo \"[DEPLOY] HTTP 状态码: \$HTTP_STATUS\"
        
        if [ \"\$HTTP_STATUS\" = \"200\" ]; then
            echo \"[SUCCESS] 部署成功！\"
        else
            echo \"[WARN] HTTP 状态码异常: \$HTTP_STATUS，可能需要手动检查\"
        fi
    '"
    
    log_success "部署完成！"
}

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "  易有吉 - 一键部署工具"
    echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""
    
    # 执行各步骤
    check_prerequisites
    git_operations
    build_project
    package_deploy
    deploy_to_server
    
    echo ""
    echo "=========================================="
    log_success "部署流程全部完成！"
    echo "=========================================="
    echo ""
    echo "下一步操作:"
    echo "  1. 访问 https://yiyouji.zjsifan.com 测试功能"
    echo "  2. 检查面相/手相页面的模型选择器"
    echo "  3. 如有问题查看日志: pm2 logs yiyouji"
    echo ""
}

# 执行主函数
main "$@"
