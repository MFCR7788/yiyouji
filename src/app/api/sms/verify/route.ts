/**
 * 短信验证码验证路由
 *
 * 验证用户输入的验证码是否正确，并完成登录或注册
 * 使用本地验证码验证 + Supabase 密码登录
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import { verifyCode } from '@/lib/sms/verification-store';
import { createAnonClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';

function buildDevSession(phone: string): Session {
    return {
        access_token: `dev-token-${phone}`,
        refresh_token: `dev-refresh-token-${phone}`,
        expires_at: Date.now() / 1000 + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
            id: `dev-user-${phone}`,
            app_metadata: {},
            user_metadata: { nickname: phone.slice(-4) === '0000' ? '测试用户' : `用户${phone.slice(-4)}`, phone },
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
        const body = await request.json();
        const { phone, code } = body as { phone?: string; code?: string };

        if (!phone) {
            return NextResponse.json(
                { success: false, message: '请提供手机号' },
                { status: 400 }
            );
        }

        if (!code) {
            return NextResponse.json(
                { success: false, message: '请提供验证码' },
                { status: 400 }
            );
        }

        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, message: '验证码格式不正确' },
                { status: 400 }
            );
        }

        const localResult = await verifyCode(phone, code);

        if (!localResult.success) {
            return NextResponse.json(
                { success: false, message: localResult.message },
                { status: 400 }
            );
        }

        if (process.env.NODE_ENV === 'development') {
            console.info(`[SMS API] 开发模式：验证码验证通过，创建开发 session: ${phone}`);
            const devSession = buildDevSession(phone);
            const response = NextResponse.json({
                success: true,
                message: '登录成功（开发模式）',
                session: devSession,
                user: devSession.user,
            });
            setSessionCookies(response, devSession);
            return response;
        }

        const anonClient = createAnonClient();
        const email = `user_${phone}@mingai.fun`;
        const nickname = localResult.nickname || '命理爱好者';

        const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
            email,
            password: `phone_${phone}_default_password`,
        });

        if (signInError) {
            const isEmailNotConfirmed = signInError.code === 'email_not_confirmed';
            if (isEmailNotConfirmed) {
                console.info(`[SMS API] 用户已注册但 email 未确认，尝试自动确认: ${phone}`);

                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const adminClient = createClient(
                        process.env.SUPABASE_URL || '',
                        process.env.SUPABASE_SECRET_KEY || '',
                        { auth: { persistSession: false, autoRefreshToken: false } }
                    );

                    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
                    if (listError) {
                        console.error('[SMS API] 查询用户列表失败:', listError);
                        return NextResponse.json(
                            { success: false, message: '登录失败，请重试' },
                            { status: 500 }
                        );
                    }

                    const existingUser = usersData.users.find(u =>
                        u.email === email || u.user_metadata?.phone === phone
                    );

                    if (!existingUser) {
                        console.error('[SMS API] 未找到对应用户');
                        return NextResponse.json(
                            { success: false, message: '登录失败，请重试' },
                            { status: 500 }
                        );
                    }

                    console.log('[SMS API] 找到用户，自动确认邮箱:', existingUser.id);
                    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
                        email_confirm: true,
                        user_metadata: { ...(existingUser.user_metadata || {}), phone }
                    });

                    if (updateError) {
                        console.error('[SMS API] 自动确认邮箱失败:', updateError);
                        return NextResponse.json(
                            { success: false, message: '登录失败，请重试' },
                            { status: 500 }
                        );
                    }

                    console.log('[SMS API] 邮箱已确认，重新登录...');
                    const retryAuth = await anonClient.auth.signInWithPassword({
                        email,
                        password: `phone_${phone}_default_password`,
                    });

                    if (retryAuth.error || !retryAuth.data?.session) {
                        console.error('[SMS API] 重新登录失败:', retryAuth.error?.message);
                        return NextResponse.json(
                            { success: false, message: '登录失败，请重试' },
                            { status: 500 }
                        );
                    }

                    console.info(`[SMS API] 自动确认邮箱后登录成功: ${phone}`);
                    const response = NextResponse.json({
                        success: true,
                        message: '登录成功',
                        session: retryAuth.data.session,
                        user: retryAuth.data.user,
                    });
                    setSessionCookies(response, retryAuth.data.session);
                    return response;
                } catch (adminError) {
                    console.error('[SMS API] 自动确认邮箱异常:', adminError);
                    return NextResponse.json(
                        { success: false, message: '登录失败，请重试' },
                        { status: 500 }
                    );
                }
            }

            const { error: signUpError } = await anonClient.auth.signUp({
                email,
                password: `phone_${phone}_default_password`,
                options: {
                    data: {
                        phone,
                        nickname,
                    },
                },
            });

            if (signUpError) {
                console.error('[SMS API] 注册失败:', signUpError.message);
                return NextResponse.json(
                    { success: false, message: '登录失败，请重试' },
                    { status: 500 }
                );
            }

            const { data: newSignInData, error: newSignInError } = await anonClient.auth.signInWithPassword({
                email,
                password: `phone_${phone}_default_password`,
            });

            if (newSignInError || !newSignInData?.session) {
                console.error('[SMS API] 登录失败:', newSignInError?.message);
                return NextResponse.json(
                    { success: false, message: '登录失败，请重试' },
                    { status: 500 }
                );
            }

            console.info(`[SMS API] 注册并登录成功: ${phone}`);

            const response = NextResponse.json({
                success: true,
                message: '登录成功',
                session: newSignInData.session,
                user: newSignInData.user,
            });

            if (newSignInData.session) {
                setSessionCookies(response, newSignInData.session);
            }

            return response;
        }

        if (!signInData?.session) {
            console.error('[SMS API] 登录失败，未获取到session');
            return NextResponse.json(
                { success: false, message: '登录失败，请重试' },
                { status: 500 }
            );
        }

        console.info(`[SMS API] 登录成功: ${phone}`);

        const response = NextResponse.json({
            success: true,
            message: '登录成功',
            session: signInData.session,
            user: signInData.user,
        });

        if (signInData.session) {
            setSessionCookies(response, signInData.session);
        }

        return response;
    } catch (error) {
        console.error('[SMS API] 验证异常:', error);
        return NextResponse.json(
            { success: false, message: '验证失败，请稍后重试' },
            { status: 500 }
        );
    }
}
