# 服务器环境变量快速配置指南

## 🚨 **问题诊断：环境变量未设置**

如果你的服务器上应用无法启动或功能异常，**90% 的原因是环境变量未正确配置**。

---

## 📋 **必填项清单（按优先级排序）**

### 🔴 **P0 - 必须立即配置（否则应用无法运行）**

| 变量名 | 获取位置 | 说明 |
|--------|---------|------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | 匿名访问密钥 |
| `SUPABASE_SECRET_KEY` | Supabase Dashboard → Settings → API | 服务端密钥 |
| `INTERNAL_API_SECRET` | 自行生成 (`openssl rand -hex 32`) | 内部通信签名 |
| `CRON_SECRET` | 自行生成 (`openssl rand -hex 32`) | 定时任务验证 |
| `SUPABASE_SYSTEM_ADMIN_EMAIL` | 自定义 | 系统管理员邮箱 |
| `SUPABASE_SYSTEM_ADMIN_PASSWORD` | 自定义（至少8位） | 管理员密码 |

### 🟡 **P1 - 强烈推荐配置（影响核心功能）**

| 变量名 | 说明 | 缺失后果 |
|--------|------|---------|
| `NEWAPI_BASE_URL` / `NEWAPI_API_KEY` | AI 统一网关 | ❌ 所有AI功能不可用 |
| `DEEPSEEK_API_KEY` | DeepSeek 模型 | ⚠️ 无法使用DeepSeek模型 |
| `WECHAT_PAY_*` (6个) | 微信支付配置 | ❌ 支付功能不可用 |
| `MCP_JWT_SECRET` | MCP OAuth 密钥 | ❌ MCP服务无法启动 |

### 🟢 **P2 - 可选配置（增强功能体验）**

| 变量名 | 说明 |
|--------|------|
| `GEMINI_API_KEY` | Gemini 模型支持 |
| `VOLC_API_KEY` | 火山引擎模型支持 |
| `ALIYUN_SMS_*` (4个) | 验证码短信发送 |
| `AMAP_WEB_SERVICE_KEY` | 高德地图经纬度转换 |
| `DIFY_API_KEY` / `DIFY_API_URL` | Dify 工作流集成 |

---

## 🛠️ **快速配置步骤**

### **方法 A: 使用诊断工具自动检查（推荐）**

```bash
# 1. 运行诊断脚本
./scripts/check-env.sh .env.local

# 2. 根据提示补充缺失项
# 3. 再次运行验证
```

### **方法 B: 手动创建配置文件**

#### **Step 1: 复制模板**
```bash
# 开发环境
cp .env.example .env.local

# 生产环境
cp .env.production.example .env.production
```

#### **Step 2: 编辑配置文件**
```bash
# 使用 nano 编辑器
nano .env.local

# 或使用 VS Code 打开
code .env.local
```

#### **Step 3: 填写关键变量**

**最简配置示例（仅能启动）：**
```bash
# Supabase（从 Dashboard 复制）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIs...

# 内部API密钥（自行生成）
INTERNAL_API_SECRET=abc123def456...（32字符以上）

# 定时任务密钥
CRON_SECRET=your-cron-secret

# 管理员账户
SUPABASE_SYSTEM_ADMIN_EMAIL=admin@yourdomain.com
SUPABASE_SYSTEM_ADMIN_PASSWORD=YourSecurePassword123
```

**完整配置示例（包含所有功能）：**
参见 `.env.production.example` 文件

#### **Step 4: 验证并重启**
```bash
# 运行诊断检查
./scripts/check-env.sh .env.local

# 重启服务
pnpm dev          # 开发环境
# 或
pnpm build && pnpm start  # 生产环境
```

---

## 🔑 **获取各类密钥的方法**

### **Supabase 配置**

1. 登录 https://supabase.com/dashboard
2. 选择你的项目
3. 左侧菜单 → **Settings** → **API**
4. 找到以下信息：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service role** → `SUPABASE_SECRET_KEY`

### **内部API密钥生成**

```bash
# 生成 INTERNAL_API_SECRET
openssl rand -hex 32

# 输出示例: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### **微信支付配置**

参考文档: `docs/WECHAT_PAY_SETUP.md`

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com)
2. 获取商户号、AppID、API密钥等
3. 下载证书并填入私钥内容

### **AI API 密钥**

- **NewAPI/OneAPI**: 从你的 AI 中转平台获取
- **DeepSeek**: https://platform.deepseek.com/
- **Gemini**: https://aistudio.google.com/apikey

---

## ⚠️ **常见错误及解决方案**

### **错误 1: "Missing environment variable"**

**原因**: 必填项未配置  
**解决**: 
```bash
./scripts/check-env.sh .env.local  # 检查缺失项
```

### **错误 2: "Invalid Supabase URL"**

**原因**: URL 格式错误或复制不完整  
**解决**: 确保 URL 以 `https://` 开头且以 `.co` 或 `.supabase.co` 结尾

### **错误 3: "JWT secret too short"**

**原因**: 密钥长度不足（至少32字符）  
**解决**: 使用 `openssl rand -hex 32` 重新生成

### **错误 4: "WeChat Pay initialization failed"**

**原因**: 微信支付配置缺失或格式错误  
**解决**: 检查所有 `WECHAT_PAY_*` 变量是否完整

### **错误 5: "Database connection failed"**

**原因**: 数据库URL或凭据错误  
**解决**: 
- 检查 `SUPABASE_DB_URL` 格式是否正确
- 如果不需要向量索引功能，可以留空

---

## ✅ **部署前最终检查清单**

- [ ] 已复制 `.env.example` 为 `.env.local`
- [ ] 已填写所有 **P0 必填项**（7个）
- [ ] 已填写 **P1 推荐项**（至少 NEWAPI 和 DEEPSEEK）
- [ ] 已运行 `./scripts/check-env.sh` 验证通过（≥80%）
- [ ] 已确认密钥安全性（无泄露风险）
- [ ] 已将 `.env.local` 加入 `.gitignore`（防止提交到Git）

---

## 📞 **需要帮助？**

如果遇到其他问题，请提供：

1. **完整的错误日志**（终端输出）
2. **当前的环境变量状态**（运行诊断脚本的输出）
3. **你使用的部署方式**（Docker / PM2 / 直接运行）

---

## 💡 **最佳实践**

1. **不要在代码中硬编码密钥** → 始终使用环境变量
2. **定期轮换敏感密钥** → 特别是 JWT 和 API 密钥
3. **使用不同的开发/生产密钥** → 避免混淆
4. **监控环境变量加载** → 应用启动时验证关键变量
5. **备份配置文件** → 但不要备份到公开仓库

---

**🎯 快速开始命令汇总：**

```bash
# 1. 创建配置文件
cp .env.example .env.local

# 2. 编辑配置
nano .env.local

# 3. 检查配置完整性
chmod +x scripts/check-env.sh
./scripts/check-env.sh .env.local

# 4. 启动应用
pnpm dev  # 或 pnpm build && pnpm start
```

祝部署顺利！🚀
