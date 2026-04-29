/**
 * 发送短信验证码 API
 * 支持登录和注册场景
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/api-utils';
import { sendVerificationCode } from '@/lib/sms/verification-store';
import { sendAliyunSms } from '@/lib/sms/aliyun';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, type = 'login' } = body as { phone?: string; type?: 'login' | 'register' };

        if (!phone || phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
            return NextResponse.json(
                { success: false, message: '请输入正确的11位手机号' },
                { status: 400 }
            );
        }

        // 检查手机号是否已注册（如果是注册场景）
        if (type === 'register') {
            const supabase = createAnonClient();
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', phone)
                .single();

            if (existingUser) {
                return NextResponse.json(
                    { success: false, message: '该手机号已注册，请直接登录' },
                    { status: 400 }
                );
            }
        }

        // 生成并存储验证码
        const result = await sendVerificationCode(phone, type);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        console.info(`[SMS API] 准备发送验证码 ${result.code} 到 ${phone}`);

        // 发送真实短信
        const smsResult = await sendAliyunSms(phone, result.code);

        if (!smsResult.success) {
            console.error('[SMS API] 短信发送失败:', smsResult.message);

            if (process.env.NODE_ENV === 'development') {
                console.info(`[SMS API] 开发模式：验证码为 ${result.code}`);
                return NextResponse.json({
                    success: true,
                    message: '验证码已发送到您的手机',
                    devCode: result.code,
                });
            }

            return NextResponse.json(
                { success: false, message: smsResult.message || '发送失败，请稍后重试' },
                { status: 500 }
            );
        }

        console.info('[SMS API] 短信发送成功');

        return NextResponse.json(
            { success: true, message: '验证码已发送到您的手机' },
            { status: 200 }
        );
    } catch (error) {
        console.error('[SMS Send API] Error:', error);
        return NextResponse.json(
            { success: false, message: '发送失败，请稍后重试' },
            { status: 500 }
        );
    }
}
