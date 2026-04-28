/**
 * 手机号密码重置路由
 *
 * 通过手机号重置密码（需先通过短信验证码验证）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, password } = body as { phone?: string; password?: string };

        if (!phone || phone.length !== 11) {
            return NextResponse.json(
                { success: false, message: '请输入正确的11位手机号' },
                { status: 400 }
            );
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { success: false, message: '密码长度至少为6位' },
                { status: 400 }
            );
        }

        const anonClient = createAnonClient();
        const email = `${phone}@phone.xingbu.app`;

        // 查找用户并更新密码
        const { data: users, error: listError } = await anonClient.auth.admin.listUsers();
        
        if (listError) {
            console.error('[Reset Password] Failed to list users:', listError.message);
            return NextResponse.json(
                { success: false, message: '系统错误，请稍后重试' },
                { status: 500 }
            );
        }

        const user = users.users.find(u => u.phone === phone || u.email === email);

        if (!user) {
            return NextResponse.json(
                { success: false, message: '该手机号未注册' },
                { status: 400 }
            );
        }

        // 更新用户密码
        const { error: updateError } = await anonClient.auth.admin.updateUserById(user.id, {
            password,
        });

        if (updateError) {
            console.error('[Reset Password] Failed to update password:', updateError.message);
            return NextResponse.json(
                { success: false, message: '密码重置失败，请重试' },
                { status: 500 }
            );
        }

        console.info(`[Reset Password] Password reset successful for phone: ${phone}`);

        return NextResponse.json({
            success: true,
            message: '密码重置成功',
        });
    } catch (error) {
        console.error('[Reset Password] Unexpected error:', error);
        return NextResponse.json(
            { success: false, message: '密码重置失败，请稍后重试' },
            { status: 500 }
        );
    }
}
