/**
 * 发送短信验证码 API
 * 支持登录和注册场景 - 使用加密的 Cookie 存储验证码
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/api-utils';
import { 
    generateVerificationCode, 
    generateVerificationCookie,
    VERIFICATION_COOKIE_NAME 
} from '@/lib/sms/secure-verification';
import { sendAliyunSms } from '@/lib/sms/aliyun';

export async function POST(request: NextRequest) {
    try {
        console.log('[SMS Send API] 开始处理发送验证码请求');
        const body = await request.json();
        const { phone, type = 'login' } = body as { phone?: string; type?: 'login' | 'register' };

        console.log(`[SMS Send API] 收到请求: phone=${phone}, type=${type}`);

        if (!phone || phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
            console.log('[SMS Send API] 手机号验证失败');
            return NextResponse.json(
                { success: false, message: '请输入正确的11位手机号' },
                { status: 400 }
            );
        }

        // 检查手机号是否已注册（如果是注册场景）
        if (type === 'register') {
            console.log('[SMS Send API] 检查用户是否已注册');
            const supabase = createAnonClient();
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', phone)
                .single();

            if (existingUser) {
                console.log('[SMS Send API] 用户已注册');
                return NextResponse.json(
                    { success: false, message: '该手机号已注册，请直接登录' },
                    { status: 400 }
                );
            }
        }

        // 生成验证码
        const code = generateVerificationCode();
        console.log('[SMS Send API] 验证码已生成:', code ? '***' : 'N/A');

        console.info(`[SMS API] 准备发送验证码到 ${phone}`);

        // 发送真实短信
        console.log('[SMS Send API] 调用阿里云短信服务');
        const smsResult = await sendAliyunSms(phone, code);
        console.log('[SMS Send API] 短信发送结果:', smsResult);

        if (!smsResult.success) {
            console.error('[SMS API] 短信发送失败:', smsResult.message);

            if (process.env.NODE_ENV === 'development') {
                console.info(`[SMS API] 开发模式：验证码为 ${code}`);
                return NextResponse.json({
                    success: true,
                    message: '验证码已发送到您的手机',
                    devCode: code,
                });
            }

            return NextResponse.json(
                { success: false, message: smsResult.message || '发送失败，请稍后重试' },
                { status: 500 }
            );
        }

        console.info('[SMS API] 短信发送成功');

        // 创建响应并设置加密的 Cookie
        const response = NextResponse.json(
            { success: true, message: '验证码已发送到您的手机' },
            { status: 200 }
        );

        const cookieValue = generateVerificationCookie(phone, code);
        response.cookies.set(VERIFICATION_COOKIE_NAME, cookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60, // 5 分钟
            path: '/',
            sameSite: 'lax'
        });

        return response;
    } catch (error) {
        console.error('[SMS Send API] Error:', error);
        return NextResponse.json(
            { success: false, message: '发送失败，请稍后重试' },
            { status: 500 }
        );
    }
}
