/**
 * 短信验证码验证路由
 *
 * 验证用户输入的验证码是否正确，并完成登录
 * 使用本地验证码验证 + Supabase 密码登录
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/sms/verification-store';
import { createAnonClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';

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

        // 本地验证码验证
        const localResult = verifyCode(phone, code);

        if (!localResult.success) {
            return NextResponse.json(
                { success: false, message: localResult.message },
                { status: 400 }
            );
        }

        const anonClient = createAnonClient();
        const email = `${phone}@phone.xingbu.app`;

        // 尝试使用固定密码登录（用户注册时设置的密码）
        // 如果登录失败，说明用户未注册，需要先注册
        const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
            email,
            password: `phone_${phone}_default_password`,
        });

        if (signInError) {
            // 用户可能未注册，尝试注册
            const { error: signUpError } = await anonClient.auth.signUp({
                email,
                password: `phone_${phone}_default_password`,
                options: {
                    data: {
                        phone,
                        nickname: '命理爱好者',
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

            // 注册成功后再次登录
            const { data: newSignInData, error: newSignInError } = await anonClient.auth.signInWithPassword({
                email,
                password: `phone_${phone}_default_password`,
            });

            if (newSignInError || !newSignInData.session) {
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
