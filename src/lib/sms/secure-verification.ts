/**
 * 安全的验证码管理系统
 * 使用加密的 cookies 存储验证码，完全不依赖服务器内存或数据库
 */

import crypto from 'crypto';

const SECRET_KEY = process.env.SMS_VERIFICATION_SECRET || 'fallback-secret-key-please-change-in-production';
const CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效期

// 加密数据
function encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// 解密数据
function decryptData(encryptedData: string): string {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) return '';
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch {
        return '';
    }
}

// 生成 6 位数字验证码
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成验证码 cookie 值
export function generateVerificationCookie(phone: string, code: string): string {
    const data = JSON.stringify({
        phone,
        code,
        expiresAt: Date.now() + CODE_TTL_MS,
        createdAt: Date.now()
    });
    return encryptData(data);
}

// 验证验证码
export function verifyCodeFromCookie(phone: string, code: string, cookieValue: string): {
    success: boolean;
    message: string;
} {
    if (!cookieValue) {
        return { success: false, message: '请先获取验证码' };
    }

    const decrypted = decryptData(cookieValue);
    if (!decrypted) {
        return { success: false, message: '验证码已失效，请重新获取' };
    }

    try {
        const data = JSON.parse(decrypted);
        
        // 检查是否过期
        if (Date.now() > data.expiresAt) {
            return { success: false, message: '验证码已过期，请重新获取' };
        }

        // 检查手机号是否匹配
        if (data.phone !== phone) {
            return { success: false, message: '验证码与手机号不匹配' };
        }

        // 检查验证码是否匹配
        if (data.code !== code) {
            return { success: false, message: '验证码错误' };
        }

        return { success: true, message: '验证成功' };
    } catch {
        return { success: false, message: '验证码无效，请重新获取' };
    }
}

// 验证码 Cookie 名称
export const VERIFICATION_COOKIE_NAME = 'sms_verification';
