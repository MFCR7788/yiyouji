#!/bin/bash

# 微信支付配置更新脚本
# 使用方法：在服务器上运行此脚本

ENV_FILE="/opt/apps/yiyouji/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 配置文件不存在: $ENV_FILE"
    exit 1
fi

echo "🔧 开始更新微信支付配置..."

# 备份原配置文件
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ 配置文件已备份"

# 临时文件
TEMP_FILE=$(mktemp)

# 复制原配置，但排除微信支付相关的行
grep -v -E "^WECHAT_PAY_" "$ENV_FILE" > "$TEMP_FILE"

# 添加新的微信支付配置
cat >> "$TEMP_FILE" << 'WECHAT_CONFIG'

# 微信支付配置
WECHAT_PAY_MCHID=1624143377
WECHAT_PAY_APPID=wx314d6d3cfbd33e79
WECHAT_PAY_API_V3_KEY=SmallFish7788Admin03072298887777
WECHAT_PAY_MCH_SERIAL_NO=4C6F7C50450ED26AF84536A143BF7CF0F36D0AD5
WECHAT_PAY_NOTIFY_URL=https://yiyouji.zjsifan.com/api/membership/pay/callback
WECHAT_PAY_H5_DOMAIN=yiyouji.zjsifan.com
WECHAT_PAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDHC32bPlhtiGkM
AqST4AJeN58bpfIVnsc1xVfZxy7Sv0aLBmXmEPltlDyk/BIvE2pYr2+7nMfOS8Is
X1pxuEoUkhHlAwIHhMNCrwO4Zhs+GhHWmFoKBTqyafNmD5RNU3g/hDx5+C0FBWBt
wh+Q3T8K50Sdm2DAqHkXr88j9Zf6uRymY80+bRE02jVl+G3dBU9QEW/Yvu6+jPlw
eQhFxmj8upxRy8aeSPIyo+IOS5WmNVz4mD61EiwCQwtv50p2wSPA+s45jrUSyJ9a
Eb/KPZSldWs7YLWzK1Y22aMkUMsg/3Mlbvey3FEuj9zYojGMZMZZ8c1KOErttW9B
xTRcTHClAgMBAAECggEBAIX2SddOIp21jV2z+ag8v9tBfChTi5bZgiHCa9n6oJze
d0/iQnqROg5yEk7ICET+wDhn+r8+SYuimVDb7DdVXSZzGPAVEiyVQgWDXPGiZvto
+FCBwTe1RUgG3vX1zk4su2WkTj+YtFQIxlmYqT4Kaf+gnyGkDX4c5UL35GXDSUJI
XAufYhvfWquB00/5a6vLGC+kCVjCyKwgxkprwIBZvkSJI1U104lNnT12hfURgWYk
O4dmI52HLDk5r0P/v6BKcN45xkn2GLnqWEhYpap/tfoovY0KfvmR+m4WKqpjEte0
zxISDXWq6jwarUfpxcPu9w1/wOwD3TOi8lxMAcSta5ECgYEA5JFaF37fbx3Wow4i
Ml+lY3Jojbn7S77WA/62xQpReCzK2QMb+kblsk/xhp/6PaVRUG7GXMUQAEwD8jcd
mSLyjLhxbZEob5SUeM3wyEhwthY0G1qcP1/+TqYp32e1asHkgzRYXs9oh0JamEF/
6+FwCAnu3BgMtNVhMEhdxy86pSsCgYEA3u8PbydLwV48qoAQwuZu31YxzdMyOmsU
P7FnkKIIvXgRhPWf2Dudb8jzqplW8plitFIXps8YeI2/RREMWOX8CigGaiGhPz90
+rlBOZtyF9Js+4ZddDBM4a09DR5Vyq74KszXi8XxYvF++EnUuMjmbNiG6Nzk7wmW
EwIMu9mo+W8CgYEAgr19qfjhd166+lPITcYWBVdY5NCgJIiJRIm7I+QuC66bbRxx
MWzCUIeX4Oi7K+3XIEns3v29lF3m1/Kc1I5/7OxHvWONnJ2Be8RY2UdOaWkz7v2a
aEnRXk1/oBFjXSiBPGeBsOG0qcHTrkmxEUzHV2HPJkf/ZKS1Tffm5FtokTcCgYA3
xEFuIrxWkMZIOGT4/D+76onm3O/xoRudmzk2+vGIw+JOCkuEAdWuQuyBPn57jVcd
mHOGLMQIVB0Gn+8gxdc4iy6fme4GLk+K8JCaYoI151OPz9rM19BDm9xrzazUWNSH
kFpTAp8Riyuh3IYz+z14+Ok2kxtJmHJMKvUYgKg+TQKBgQCDMH68nR3oLn9OfBet
YWNfSLuZr6dkuQ4WpQNAv8/+Vdo944XHRYQ6wYXm7gvU5CVR9iVj9mvCKbGJpdmd
TM1q4uD+eRLr7XDDn/qLcy1rBMv1+IqJw+YPw+VTtyRY5pZiydtMPl2prgjngch3
6uAhF7hEbl8nkHommSqcjA+LoQ==
-----END PRIVATE KEY-----"
WECHAT_CONFIG

# 替换原配置文件
mv "$TEMP_FILE" "$ENV_FILE"

echo "✅ 微信支付配置已更新"

# 重启服务
echo "🔄 重启服务..."
pm2 restart yiyouji

echo "🎉 完成！"
