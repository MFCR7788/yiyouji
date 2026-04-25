/**
 * 短信验证码发送路由
 *
 * 接收手机号，生成验证码并通过阿里云短信发送
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendAliyunSms, generateVerificationCode } from '@/lib/sms/aliyun';
import { storeVerificationCode } from '@/lib/sms/verification-store';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone } = body as { phone?: string };

        if (!phone) {
            return NextResponse.json(
                { success: false, message: '请提供手机号' },
                { status: 400 }
            );
        }

        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return NextResponse.json(
                { success: false, message: '手机号格式不正确' },
                { status: 400 }
            );
        }

        const code = generateVerificationCode();

        const storeResult = storeVerificationCode(phone, code);
        if (!storeResult.success) {
            return NextResponse.json(
                { success: false, message: storeResult.message },
                { status: 429 }
            );
        }

        const smsResult = await sendAliyunSms(phone, code);

        if (!smsResult.success) {
            return NextResponse.json(
                { success: false, message: smsResult.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '验证码已发送',
        });
    } catch (error) {
        console.error('[SMS API] 发送异常:', error);
        return NextResponse.json(
            { success: false, message: '发送失败，请稍后重试' },
            { status: 500 }
        );
    }
}