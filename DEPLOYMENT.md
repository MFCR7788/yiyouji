# 一游己 阿里云服务器部署指南

## 📋 目录

1. [前置准备](#前置准备)
2. [环境配置](#环境配置)
3. [部署步骤](#部署步骤)
4. [验证部署](#验证部署)
5. [常见问题](#常见问题)

---

## 📝 前置准备

### 服务器要求

- 操作系统: Linux (Ubuntu/CentOS)
- Node.js 18+
- 内存: 至少 2GB
- 磁盘: 至少 10GB
- 域名: yiyouji.zjsifan.com (已绑定到服务器)

### 需要的配置信息

| 配置项 | 说明 |
|-------|------|
| 微信支付商户号 | 1624143377 |
| 微信支付 AppID | wx314d6d3cfbd33e79 |
| APIv3 密钥 | SmallFish7788Admin03072298887777 |
| 商户证书序列号 | 4C6F7C50450ED26AF84536A143BF7CF0F36D0AD5 |
| 商户私钥 | 完整的私钥内容 |

---

## ⚙️ 环境配置

### 方法一: 交互式配置（推荐）

```bash
# 1. 登录到阿里云服务器
ssh user@your-server

# 2. 进入项目目录
cd /path/to/yiyouji

# 3. 给脚本添加执行权限
chmod +x ./scripts/setup-env.sh

# 4. 运行配置脚本
./scripts/setup-env.sh
```

按提示输入配置信息，脚本会自动完成配置！

### 方法二: 手动配置

```bash
# 1. 在项目根目录创建 .env 文件
cat > .env << 'EOF'
# 微信支付配置
WECHAT_PAY_MCHID=1624143377
WECHAT_PAY_APPID=wx314d6d3cfbd33e79
WECHAT_PAY_API_V3_KEY=SmallFish7788Admin03072298887777
WECHAT_PAY_MCH_SERIAL_NO=4C6F7C50450ED26AF84536A143BF7CF0F36D0AD5
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
WECHAT_PAY_H5_DOMAIN=yiyouji.zjsifan.com
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
这里填入完整的私钥内容
-----END PRIVATE KEY-----"
EOF

# 2. 设置文件权限（重要！）
chmod 600 .env
```

### 验证配置

```bash
# 运行验证脚本
chmod +x ./scripts/validate-env.sh
./scripts/validate-env.sh
```

---

## 🚀 部署步骤

### 1. 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install

# 或者使用 npm
npm install
```

### 2. 构建项目

```bash
# 构建生产版本
pnpm build

# 或者使用 npm
npm run build
```

### 3. 启动服务

```bash
# 方式一: 使用 PM2（推荐，生产环境）
npm install -g pm2
pm2 start npm --name "yiyouji" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs yiyouji

# 开机自启动
pm2 startup
pm2 save

# 方式二: 直接启动（仅用于测试）
pnpm start
```

### 4. 配置 Nginx（可选，但推荐）

如果使用 Nginx 作为反向代理:

```nginx
server {
    listen 80;
    server_name yiyouji.zjsifan.com;

    # 强制 HTTPS（推荐）
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yiyouji.zjsifan.com;

    # SSL 证书配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # 反向代理到应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
# 使用 PM2
pm2 status

# 使用 curl
curl -I http://localhost:3000
```

### 2. 测试网站访问

在浏览器中访问: https://yiyouji.zjsifan.com

### 3. 测试微信支付

1. 登录账号
2. 进入会员购买页面
3. 点击"立即开通"
4. 扫码支付测试

### 4. 检查支付回调

确保支付回调地址可以被微信访问:
- https://yiyouji.zjsifan.com/api/membership/pay/callback

---

## 🔒 安全建议

### 1. 文件权限

```bash
# 设置 .env 文件权限（已在脚本中处理）
chmod 600 .env

# 设置其他敏感文件权限
chmod 600 ./node_modules/.cache # 如果不需要
```

### 2. 防火墙配置

```bash
# 开放必要端口（示例使用 ufw）
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 3. 定期更新依赖

```bash
# 更新项目依赖
pnpm update

# 检查安全漏洞
pnpm audit
```

---

## 📚 常见问题

### Q: 环境变量配置后不生效怎么办？

A: 需要重启服务:
```bash
pm2 restart yiyouji
```

### Q: 支付成功但会员没开通？

A: 检查以下几点:
1. 支付回调是否正常接收
2. Supabase 连接是否正常
3. 查看应用日志: `pm2 logs yiyouji`

### Q: 如何修改微信支付配置？

A: 编辑 `.env` 文件，然后重启服务:
```bash
# 编辑配置
nano .env

# 或者使用脚本重新配置
./scripts/setup-env.sh

# 重启服务
pm2 restart yiyouji
```

### Q: 脚本没有执行权限？

A: 给脚本添加执行权限:
```bash
chmod +x ./scripts/setup-env.sh
chmod +x ./scripts/validate-env.sh
```

---

## 📞 获取帮助

如有问题，请联系技术支持！
