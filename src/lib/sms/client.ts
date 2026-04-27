/**
 * 客户端短信验证码工具函数
 */

export interface SmsSendResult {
    success: boolean;
    message?: string;
}

export interface SmsVerifyResult {
    success: boolean;
    message?: string;
    session?: unknown;
    user?: unknown;
}

/**
 * 发送短信验证码
 */
export async function sendSmsCode(phone: string): Promise<SmsSendResult> {
    try {
        const response = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });

        const data = await response.json();
        return {
            success: data.success === true,
            message: data.message || (data.success ? '发送成功' : '发送失败'),
        };
    } catch {
        return {
            success: false,
            message: '网络异常，请稍后重试',
        };
    }
}

/**
 * 验证短信验证码
 */
export async function verifySmsCode(
    phone: string,
    code: string
): Promise<SmsVerifyResult> {
    try {
        const response = await fetch('/api/sms/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code }),
        });

        const data = await response.json();
        return {
            success: data.success === true,
            message: data.message || (data.success ? '验证成功' : '验证失败'),
            session: data.session,
            user: data.user,
        };
    } catch {
        return {
            success: false,
            message: '网络异常，请稍后重试',
        };
    }
}