/**
 * 验证短信验证码并完成登录/注册 - 使用 Cookie 中的验证码
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAnonClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';
import { 
    verifyCodeFromCookie, 
    VERIFICATION_COOKIE_NAME 
} from '@/lib/sms/secure-verification';
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

        // 开发模式：接受任意6位数字验证码
        if (IS_DEV_MODE) {
            console.info('[SMS Verify API] 开发模式：验证通过', { phone, code });
            const userNickname = nickname || `用户${phone.slice(-4)}`;
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

        // 测试账号固定验证码（跳过短信验证）
        const TEST_PHONE = '13800138000';
        const TEST_CODE = '888888';
        if (phone === TEST_PHONE && code === TEST_CODE) {
            console.log('[SMS Verify API] 测试账号登录，跳过验证码验证');
        } else {
            // 从 Cookie 中获取验证码并验证
            const verificationCookie = request.cookies.get(VERIFICATION_COOKIE_NAME)?.value;
            console.log('[SMS Verify API] 从 Cookie 获取验证码');
            
            const verifyResult = verifyCodeFromCookie(phone, code, verificationCookie || '');
            console.log('[SMS Verify API] 验证码验证结果:', verifyResult);
            
            if (!verifyResult.success) {
                console.log('[SMS Verify API] 验证码验证失败');
                return NextResponse.json(
                    { success: false, message: verifyResult.message },
                    { status: 400 }
                );
            }
        }

        const userNickname = nickname || `用户${phone.slice(-4)}`;
        console.log('[SMS Verify API] 用户昵称:', userNickname);

        console.log('[SMS Verify API] 生产环境：开始 Supabase 登录');
        const supabase = createAnonClient();
        const email = `user_${phone}@mingai.fun`;
        const defaultPassword = `phone_${phone}_default_password`;
        console.log('[SMS Verify API] 登录邮箱:', email);

        let signInData: { session?: Session | null; user?: unknown };

        try {
            console.log('[SMS Verify API] 尝试使用密码登录');
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
                const errorCode = authResult.error.code;

                if (type === 'register' && errorCode === 'invalid_credentials') {
                    console.info('[SMS Verify API] 用户不存在，开始创建用户');
                    signInData = { session: null, user: null };
                } else if (errorCode === 'email_not_confirmed') {
                    console.info('[SMS Verify API] 用户已注册但邮箱未确认，尝试自动确认并重新登录:', phone);

                    const secretKey = getSupabaseSecretKey();
                    if (!secretKey) {
                        console.error('[SMS Verify API] 缺少 SUPABASE_SECRET_KEY 环境变量');
                        throw authResult.error;
                    }

                    const adminClient = createClient(getSupabaseUrl(), secretKey, {
                        auth: { persistSession: false, autoRefreshToken: false }
                    });

                    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
                    if (listError) {
                        console.error('[SMS Verify API] 查询用户列表失败:', listError);
                        throw authResult.error;
                    }

                    const existingUser = usersData.users.find(u =>
                        u.email === email || u.user_metadata?.phone === phone
                    );

                    if (!existingUser) {
                        console.error('[SMS Verify API] 未找到对应用户');
                        throw authResult.error;
                    }

                    console.log('[SMS Verify API] 找到用户，自动确认邮箱:', existingUser.id);
                    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
                        email_confirm: true,
                        user_metadata: { ...(existingUser.user_metadata || {}), phone }
                    });

                    if (updateError) {
                        console.error('[SMS Verify API] 自动确认邮箱失败:', updateError);
                        throw authResult.error;
                    }

                    console.log('[SMS Verify API] 邮箱已确认，重新登录...');
                    const retryAuth = await supabase.auth.signInWithPassword({
                        email,
                        password: defaultPassword
                    });

                    if (retryAuth.error) {
                        console.error('[SMS Verify API] 重新登录失败:', retryAuth.error);
                        throw retryAuth.error;
                    }

                    signInData = retryAuth.data;
                    console.log('[SMS Verify API] 自动确认邮箱后登录成功');
                } else {
                    throw authResult.error;
                }
            } else {
                signInData = authResult.data;
                console.log('[SMS Verify API] signInWithPassword 结果:', { hasSession: !!signInData.session, hasUser: !!signInData.user });
            }
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

                let existingUserId: string | null = null;

                try {
                    const { data, error } = await adminClient.auth.admin.createUser({
                        email,
                        password: defaultPassword,
                        email_confirm: true,
                        user_metadata: { nickname: userNickname, phone }
                    });
                    
                    console.log('[SMS Verify API] createUser 结果:', { data: !!data, error: !!error, errorCode: error?.code });
                    if (error) {
                        if (error.code === 'email_exists') {
                            console.info('[SMS Verify API] 用户已存在，查找并更新密码');
                            
                            // 通过 listUsers 查找已存在的用户
                            const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
                            if (listError) {
                                throw new Error('查询用户列表失败: ' + listError.message);
                            }
                            
                            // 从用户列表中找到匹配的用户
                            const existingUser = usersData.users.find(u => 
                                u.email === email || u.user_metadata?.phone === phone
                            );
                            
                            if (!existingUser) {
                                throw new Error('未找到对应用户');
                            }
                            
                            existingUserId = existingUser.id;
                            console.log('[SMS Verify API] 找到已存在用户 ID:', existingUserId);
                            
                            // 更新用户密码为默认密码
                            const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUserId, {
                                password: defaultPassword,
                                user_metadata: { nickname: userNickname, phone }
                            });
                            
                            if (updateError) {
                                throw new Error('更新密码失败: ' + updateError.message);
                            }
                            
                            console.log('[SMS Verify API] 密码更新成功');
                        } else {
                            throw error;
                        }
                    } else {
                        existingUserId = data.user?.id || null;
                        console.log('[SMS Verify API] 用户创建成功:', existingUserId);
                    }
                } catch (error) {
                    console.error('[SMS Verify API] 注册/更新失败:', error);
                    return NextResponse.json(
                        { success: false, message: '注册失败，请稍后重试' },
                        { status: 500 }
                    );
                }

                try {
                    console.log('[SMS Verify API] 尝试登录');
                    const authResult = await supabase.auth.signInWithPassword({
                        email,
                        password: defaultPassword
                    });
                    
                    if (authResult.error) {
                        console.error('[SMS Verify API] 登录失败:', authResult.error.message, authResult.error.code);
                        throw authResult.error;
                    }
                    
                    signInData = authResult.data;
                    console.log('[SMS Verify API] 登录结果:', { hasSession: !!signInData.session, userId: signInData.session?.user?.id });
                } catch (error) {
                    console.error('[SMS Verify API] 登录异常:', error);
                    const err = error as { code?: string; message?: string };
                    return NextResponse.json(
                        { success: false, message: err.message || '网络连接超时，请稍后重试' },
                        { status: 503 }
                    );
                }
            } else {
                console.log('[SMS Verify API] 是登录请求但用户不存在，应该显示注册提示');
            }
        }

        console.log('[SMS Verify API] 最终检查 session:', { hasSession: !!signInData?.session });
        if (!signInData?.session) {
            console.error('[SMS Verify API] 无法获取 session');
            return NextResponse.json(
                { success: false, message: '登录失败，请稍后重试' },
                { status: 500 }
            );
        }

        console.info(`[SMS Verify API] 登录成功: ${phone}`);

        // 新注册用户自动赠送 100 积分
        if (type === 'register' && signInData?.session?.user?.id) {
            const newUserId = signInData.session.user.id;
            try {
                // 首先确保 users 表中有该用户的记录
                const { ensureUserRecordRow } = await import(`@/lib/user/profile-record`);
                const ensured = await ensureUserRecordRow(supabase, signInData.session.user);
                if (!ensured.ok) {
                    console.error('[SMS Verify API] 创建用户记录失败:', ensured.error);
                } else {
                    console.info('[SMS Verify API] 用户记录已确保存在');
                }

                // 增加 100 积分
                const { error: creditError } = await supabase.rpc('increment_ai_chat_count', {
                    user_id: newUserId,
                    amount: 100
                });
                if (creditError) {
                    console.error('[SMS Verify API] 注册赠送积分失败:', creditError);
                } else {
                    console.info('[SMS Verify API] 新用户注册赠送 100 积分成功');
                }

                const { logRegistrationBonus } = await import('@/lib/user/credit-transactions');
                await logRegistrationBonus(newUserId, 100);
            } catch (e) {
                console.error('[SMS Verify API] 赠送积分异常:', e);
            }
        }

        const response = NextResponse.json({
            success: true,
            message: '登录成功',
            session: signInData.session,
            user: signInData.user
        });

        console.log('[SMS Verify API] 设置 session cookies');
        setSessionCookies(response, signInData.session);

        // 清理验证码 cookie
        response.cookies.delete(VERIFICATION_COOKIE_NAME);

        console.log('[SMS Verify API] 发送响应');
        return response;
    } catch (error) {
        console.error('[SMS Verify API] 未捕获异常:', error);
        const err = error as Error;
        const errorMessage = err?.message || '未知错误';
        const errorStack = err?.stack || '';
        
        console.error('[SMS Verify API] 异常详情:', {
            message: errorMessage,
            stack: errorStack
        });
        
        let userMessage = '验证失败，请稍后重试';
        
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
            userMessage = '网络连接异常，请检查网络后重试';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEDOUT')) {
            userMessage = '请求超时，请稍后重试';
        } else if (errorMessage.includes('Supabase') || errorMessage.includes('supabase')) {
            userMessage = '服务暂时不可用，请稍后重试';
        }
        
        return NextResponse.json(
            { success: false, message: userMessage },
            { status: 500 }
        );
    }
}
