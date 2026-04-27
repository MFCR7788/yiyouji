/**
 * 短信验证码验证路由
 *
 * 验证用户输入的验证码是否正确，并完成登录
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

        const localResult = verifyCode(phone, code);

        if (!localResult.success) {
            return NextResponse.json(
                { success: false, message: localResult.message },
                { status: 400 }
            );
        }

        const anonClient = createAnonClient();

        const { data: signInData, error: signInError } = await Promise.race([
            anonClient.auth.signInWithOtp({
                phone,
                token: code,
                type: 'sms',
            }),
            new Promise<{ data: null; error: Error }>((_, reject) => {
                setTimeout(() => reject(new Error('OTP verification timeout')), 15000);
            })
        ]);

        if (signInError) {
            console.error('[SMS API] OTP验证失败:', signInError.message);
            return NextResponse.json(
                { success: false, message: '验证码验证失败，请重试' },
                { status: 400 }
            );
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