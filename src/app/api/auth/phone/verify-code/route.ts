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
        console.log('[SMS Verify API] 开始处理请求');
        const body = await request.json();
        const { phone, code, type = 'login', nickname } = body as {
            phone?: string;
            code?: string;
            type?: 'login' | 'register';
            nickname?: string;
        };

        console.log(`[SMS Verify API] 收到请求: phone=${phone}, code=${code}, type=${type}`);

        if (!phone || phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
            console.log('[SMS Verify API] 手机号验证失败');
            return NextResponse.json(
                { success: false, message: '请输入正确的11位手机号' },
                { status: 400 }
            );
        }

        if (!code || code.length !== 6) {
            console.log('[SMS Verify API] 验证码验证失败');
            return NextResponse.json(
                { success: false, message: '请输入6位验证码' },
                { status: 400 }
            );
        }

        console.log('[SMS Verify API] 开始验证验证码');
        const verifyResult = await verifyCode(phone, code);
        console.log('[SMS Verify API] 验证码验证结果:', verifyResult);
        
        if (!verifyResult.success) {
            console.log('[SMS Verify API] 验证码验证失败');
            return NextResponse.json(
                { success: false, message: verifyResult.message },
                { status: 400 }
            );
        }

        const userNickname = nickname || verifyResult.nickname || `用户${phone.slice(-4)}`;
        console.log('[SMS Verify API] 用户昵称:', userNickname);

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
            console.log('[SMS Verify API] 开发模式响应已发送');
            return response;
        }

        console.log('[SMS Verify API] 生产环境：开始 Supabase 登录');
        const supabase = createAnonClient();
        const email = `user_${phone}@mingai.fun`;
        const defaultPassword = `phone_${phone}_default_password`;
        console.log('[SMS Verify API] 登录邮箱:', email);

        let signInData: { session?: Session | null; user?: unknown };

        try {
            console.log('[SMS Verify API] 尝试使用密码登录');
            const result = await retryWithBackoff(async () => {
                console.log('[SMS Verify API] 调用 signInWithPassword');
                const authResult = await supabase.auth.signInWithPassword({
                    email,
                    password: defaultPassword
                });
                console.log('[SMS Verify API] signInWithPassword 完整结果:', {
                    data: !!authResult.data,
                    error: !!authResult.error,
                    errorMessage: authResult.error?.message,
                    errorCode: authResult.error?.code
                });
                if (authResult.error) {
                    throw authResult.error;
                }
                return authResult;
            });
            signInData = result.data;
            console.log('[SMS Verify API] signInWithPassword 结果:', { hasSession: !!result.data.session, hasUser: !!result.data.user });
        } catch (error) {
            console.error('[SMS Verify API] 登录失败:', error);
            const err = error as { code?: string; message?: string };
            console.log('[SMS Verify API] 错误信息:', { code: err.code, message: err.message });
            
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
                { success: false, message: err.message || '网络连接超时，请稍后重试' },
                { status: 503 }
            );
        }

        console.log('[SMS Verify API] 检查 session 是否存在:', { hasSession: !!signInData.session });
        
        if (!signInData.session) {
            console.log('[SMS Verify API] session 不存在，处理注册流程，type:', type);
            if (type === 'register') {
                const secretKey = getSupabaseSecretKey();
                if (!secretKey) {
                    console.error('[SMS Verify API] 缺少 SUPABASE_SECRET_KEY 环境变量');
                    return NextResponse.json(
                        { success: false, message: '登录失败，请稍后重试' },
                        { status: 500 }
                    );
                }

                console.log('[SMS Verify API] 使用 admin client 创建用户');
                const adminClient = createClient(getSupabaseUrl(), secretKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });

                try {
                    await retryWithBackoff(async () => {
                        console.log('[SMS Verify API] 调用 admin.createUser');
                        const { data, error } = await adminClient.auth.admin.createUser({
                            email,
                            password: defaultPassword,
                            email_confirm: true,
                            user_metadata: { nickname: userNickname, phone }
                        });
                        console.log('[SMS Verify API] createUser 结果:', { data: !!data, error: !!error, errorCode: error?.code });
                        if (error) {
                            if (error.code === 'email_exists') {
                                console.info('[SMS Verify API] 用户已存在，跳过创建');
                                return;
                            }
                            throw error;
                        }
                        console.log('[SMS Verify API] 用户创建成功:', data?.user?.id);
                    });
                } catch (error) {
                    console.error('[SMS Verify API] 注册失败:', error);
                    return NextResponse.json(
                        { success: false, message: '注册失败，请稍后重试' },
                        { status: 500 }
                    );
                }

                try {
                    console.log('[SMS Verify API] 再次尝试登录');
                    const result = await retryWithBackoff(async () => {
                        return await supabase.auth.signInWithPassword({
                            email,
                            password: defaultPassword
                        });
                    });
                    signInData = result.data;
                    console.log('[SMS Verify API] 第二次登录结果:', { hasSession: !!result.data.session });
                } catch (error) {
                    console.error('[SMS Verify API] 登录失败:', error);
                    return NextResponse.json(
                        { success: false, message: '网络连接超时，请稍后重试' },
                        { status: 503 }
                    );
                }
            } else {
                console.log('[SMS Verify API] 是登录请求但用户不存在，应该显示注册提示');
            }
        }

        console.log('[SMS Verify API] 最终检查 session:', { hasSession: !!signInData?.session, signInData: !!signInData });
        if (!signInData?.session) {
            console.error('[SMS Verify API] 无法获取 session，完整的 signInData:', signInData);
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

        console.log('[SMS Verify API] 设置 session cookies');
        setSessionCookies(response, signInData.session);

        console.log('[SMS Verify API] 发送响应');
        return response;
    } catch (error) {
        console.error('[SMS Verify API] Error:', error);
        return NextResponse.json(
            { success: false, message: '验证失败，请稍后重试' },
            { status: 500 }
        );
    }
}
