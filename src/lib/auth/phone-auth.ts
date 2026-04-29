/**
 * 手机号验证码认证客户端
 */
import type { Session } from '@supabase/supabase-js';

export interface SendCodeResult {
    success: boolean;
    message: string;
    devCode?: string;
}

export interface VerifyCodeResult {
    success: boolean;
    message: string;
    session?: Session;
    user?: unknown;
}

export async function sendPhoneCode(
    phone: string,
    type: 'login' | 'register' = 'login'
): Promise<SendCodeResult> {
    try {
        const response = await fetch('/api/auth/phone/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, type })
        });
        
        const data = await response.json();
        return {
            success: data.success === true,
            message: data.message || (data.success ? '验证码已发送' : '发送失败'),
            devCode: data.devCode
        };
    } catch (error) {
        console.error('[Phone Auth] 发送验证码失败:', error);
        return {
            success: false,
            message: '发送失败，请重试'
        };
    }
}

export async function verifyPhoneCode(
    phone: string,
    code: string,
    type: 'login' | 'register' = 'login',
    nickname?: string
): Promise<VerifyCodeResult> {
    try {
        const response = await fetch('/api/auth/phone/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code, type, nickname })
        });
        
        const data = await response.json();
        return {
            success: data.success === true,
            message: data.message || (data.success ? '验证成功' : '验证失败'),
            session: data.session,
            user: data.user
        };
    } catch (error) {
        console.error('[Phone Auth] 验证验证码失败:', error);
        return {
            success: false,
            message: '验证失败，请重试'
        };
    }
}
