/**
 * 客户端短信验证码工具函数
 */

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { applySession } from '@/lib/auth';

export interface SmsSendResult {
    success: boolean;
    message?: string;
}

export interface SmsVerifyResult {
    success: boolean;
    message?: string;
    session?: Session | null;
    user?: SupabaseUser | null;
}

/**
 * 发送短信验证码
 */
export async function sendSmsCode(phone: string, nickname?: string): Promise<SmsSendResult> {
    try {
        const response = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, nickname }),
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
        const result = {
            success: data.success === true,
            message: data.message || (data.success ? '验证成功' : '验证失败'),
            session: data.session as Session | null,
            user: data.user as SupabaseUser | null,
        };
        
        // 验证成功后应用 session 到本地缓存
        if (result.success && result.session) {
            applySession(result.session, 'SIGNED_IN');
        }
        
        return result;
    } catch {
        return {
            success: false,
            message: '网络异常，请稍后重试',
        };
    }
}