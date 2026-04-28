/**
 * 短信验证码存储服务
 *
 * 使用内存存储验证码，支持过期自动清理
 * 生产环境建议改用 Redis
 */

interface VerificationRecord {
    code: string;
    expiresAt: number;
    createdAt: number;
    sendCount: number;
    nickname?: string;
}

const verificationStore = new Map<string, VerificationRecord>();

const CODE_TTL_MS = 5 * 60 * 1000; // 5分钟有效期
const MAX_SEND_COUNT = 3; // 最多发送3次
const SEND_COOLDOWN_MS = 60 * 1000; // 发送间隔60秒

/**
 * 存储验证码
 */
export function storeVerificationCode(
    phone: string,
    code: string,
    nickname?: string
): { success: boolean; message?: string } {
    const existing = verificationStore.get(phone);

    if (existing && Date.now() - existing.createdAt < SEND_COOLDOWN_MS) {
        const remaining = Math.ceil((SEND_COOLDOWN_MS - (Date.now() - existing.createdAt)) / 1000);
        return { success: false, message: `请 ${remaining} 秒后再试` };
    }

    if (existing && existing.sendCount >= MAX_SEND_COUNT) {
        return { success: false, message: '今日发送次数已达上限，请明天再试' };
    }

    verificationStore.set(phone, {
        code,
        expiresAt: Date.now() + CODE_TTL_MS,
        createdAt: Date.now(),
        sendCount: (existing?.sendCount || 0) + 1,
        nickname: nickname || existing?.nickname,
    });

    return { success: true };
}

/**
 * 验证验证码
 */
export function verifyCode(phone: string, code: string): {
    success: boolean;
    message?: string;
    nickname?: string;
} {
    const record = verificationStore.get(phone);

    if (!record) {
        return { success: false, message: '请先获取验证码' };
    }

    if (Date.now() > record.expiresAt) {
        verificationStore.delete(phone);
        return { success: false, message: '验证码已过期' };
    }

    if (record.code !== code) {
        return { success: false, message: '验证码错误' };
    }

    const nickname = record.nickname;
    verificationStore.delete(phone);
    return { success: true, nickname };
}

/**
 * 清理过期验证码（定时调用）
 */
export function cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [phone, record] of verificationStore.entries()) {
        if (now > record.expiresAt) {
            verificationStore.delete(phone);
        }
    }
}

// 每5分钟清理一次过期验证码
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);