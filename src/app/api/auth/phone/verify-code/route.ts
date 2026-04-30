/**
 * 验证短信验证码并完成登录/注册
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAnonClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';
import { verifyCode } from '@/lib/sms/verification-store';
import { IS_DEV_MODE } from '@/lib/dev-mode';

function getSupabaseUrl() {
    return process.env.SUPABASE_URL || '';
}

function getSupabaseSecretKey() {
    return process.env.SUPABASE_SECRET_KEY || '';
}

import type { Session } from '@supabase/supabase-js';

// 开发模式下构建模拟会话
function buildDevSession(phone: string, nickname?: string): Session {
    return {
        access_token: `dev-token-${phone}-${Date.now()}`,
        refresh_token: `dev-refresh-${phone}`,
        expires_at: Date.now() / 1000 + 3600,
        expires_in: 3600,
        token_type: 'bearer' as const,
        user: {
            id: `dev-user-${phone}`,
            app_metadata: {},
            user_metadata: { nickname: nickname || `用户${phone.slice(-4)}`, phone },
            aud: 'authenticated',
            role: 'authenticated',
            email: `user_${phone}@mingai.fun`,
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    };
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 2, baseDelay: number = 1000): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[SMS Verify API] 操作失败，第 ${i + 1} 次尝试:`, lastError.message);
            
            if (i < maxRetries) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error('重试次数已用完');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, code, type = 'login', nickname } = body as {
            phone?: string;
            code?: string;
            type?: 'login' | 'register';
            nickname?: string;
        };

        if (!phone || phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
            return NextResponse.json(
                { success: false, message: '请输入正确的11位手机号' },
                { status: 400 }
            );
        }

        if (!code || code.length !== 6) {
            return NextResponse.json(
                { success: false, message: '请输入6位验证码' },
                { status: 400 }
            );
        }

        const verifyResult = verifyCode(phone, code);
        if (!verifyResult.success) {
            return NextResponse.json(
                { success: false, message: verifyResult.message },
                { status: 400 }
            );
        }

        const userNickname = nickname || verifyResult.nickname || `用户${phone.slice(-4)}`;

        if (IS_DEV_MODE) {
            console.info(`[SMS Verify API] 开发模式：登录成功 ${phone}`);
            const devSession = buildDevSession(phone, userNickname);
            const response = NextResponse.json({
                success: true,
                message: '登录成功',
                session: devSession,
                user: devSession.user
            });
            setSessionCookies(response, devSession);
            return response;
        }

        const supabase = createAnonClient();
        const email = `user_${phone}@mingai.fun`;
        const defaultPassword = `phone_${phone}_default_password`;

        let signInData: { session?: Session; user?: unknown };

        try {
            const result = await retryWithBackoff(async () => {
                return await supabase.auth.signInWithPassword({
                    email,
                    password: defaultPassword
                });
            });
            signInData = result.data;
        } catch (error) {
            console.error('[SMS Verify API] 登录失败:', error);
            const err = error as { code?: string };
            
            if (err.code === 'invalid_credentials' && type === 'login') {
                console.info('[SMS Verify API] 用户不存在，需要注册:', phone);
                return NextResponse.json({
                    success: false,
                    message: '用户不存在，请先注册',
                    needRegister: true,
                    phone
                }, { status: 404 });
            }
            
            return NextResponse.json(
                { success: false, message: '网络连接超时，请稍后重试' },
                { status: 503 }
            );
        }

        if (!signInData.session) {
            if (type === 'register') {
                const secretKey = getSupabaseSecretKey();
                if (!secretKey) {
                    console.error('[SMS Verify API] 缺少 SUPABASE_SECRET_KEY 环境变量');
                    return NextResponse.json(
                        { success: false, message: '登录失败，请稍后重试' },
                        { status: 500 }
                    );
                }

                const adminClient = createClient(getSupabaseUrl(), secretKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });

                try {
                    await retryWithBackoff(async () => {
                        const { error } = await adminClient.auth.admin.createUser({
                            email,
                            password: defaultPassword,
                            email_confirm: true,
                            user_metadata: { nickname: userNickname, phone }
                        });
                        if (error) {
                            if (error.code === 'email_exists') {
                                console.info('[SMS Verify API] 用户已存在，跳过创建');
                                return;
                            }
                            throw error;
                        }
                    });
                } catch (error) {
                    console.error('[SMS Verify API] 注册失败:', error);
                    return NextResponse.json(
                        { success: false, message: '注册失败，请稍后重试' },
                        { status: 500 }
                    );
                }

                try {
                    const result = await retryWithBackoff(async () => {
                        return await supabase.auth.signInWithPassword({
                            email,
                            password: defaultPassword
                        });
                    });
                    signInData = result.data;
                } catch (error) {
                    console.error('[SMS Verify API] 登录失败:', error);
                    return NextResponse.json(
                        { success: false, message: '网络连接超时，请稍后重试' },
                        { status: 503 }
                    );
                }
            }
        }

        if (!signInData?.session) {
            console.error('[SMS Verify API] 无法获取 session');
            return NextResponse.json(
                { success: false, message: '登录失败，请稍后重试' },
                { status: 500 }
            );
        }

        console.info(`[SMS Verify API] 登录成功: ${phone}`);

        const response = NextResponse.json({
            success: true,
            message: '登录成功',
            session: signInData.session,
            user: signInData.user
        });

        setSessionCookies(response, signInData.session);

        return response;
    } catch (error) {
        console.error('[SMS Verify API] Error:', error);
        return NextResponse.json(
            { success: false, message: '验证失败，请稍后重试' },
            { status: 500 }
        );
    }
}
