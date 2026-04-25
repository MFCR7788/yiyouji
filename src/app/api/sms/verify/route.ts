/**
 * 短信验证码验证路由
 *
 * 验证用户输入的验证码是否正确
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/sms/verification-store';

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

        const result = verifyCode(phone, code);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '验证成功',
        });
    } catch (error) {
        console.error('[SMS API] 验证异常:', error);
        return NextResponse.json(
            { success: false, message: '验证失败，请稍后重试' },
            { status: 500 }
        );
    }
}