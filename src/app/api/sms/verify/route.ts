/**
 * 短信验证码验证路由
 *
 * 验证用户输入的验证码是否正确，并完成登录
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/sms/verification-store';
import { getAuthAdminClient } from '@/lib/api-utils';
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

        const authAdminClient = getAuthAdminClient();

        if (!authAdminClient) {
            console.error('[SMS API] 缺少管理员客户端配置');
            return NextResponse.json(
                { success: false, message: '系统配置错误，请稍后重试' },
                { status: 500 }
            );
        }

        let user = null;
        const randomPassword = Math.random().toString(36).slice(-16);
        const email = `${phone}@phone.xingbu.app`;

        const { data: newUser, error: createError } = await authAdminClient.auth.admin.createUser({
            phone,
            email,
            password: randomPassword,
            email_confirm: true,
        });

        if (createError) {
            if (createError.message.includes('already exists')) {
                console.info('[SMS API] 用户已存在，尝试重置密码');
                const { data: existingUsers, error: listError } = await authAdminClient.auth.admin.listUsers();
                if (!listError && existingUsers.users) {
                    user = existingUsers.users.find(u => u.phone === phone);
                }
                if (user) {
                    await authAdminClient.auth.admin.updateUserById(user.id, {
                        email,
                        password: randomPassword,
                    });
                }
            } else {
                console.error('[SMS API] 创建用户失败:', createError);
                return NextResponse.json(
                    { success: false, message: '登录失败，请重试' },
                    { status: 500 }
                );
            }
        } else {
            user = newUser.user;
        }

        if (!user) {
            console.error('[SMS API] 用户创建/获取失败');
            return NextResponse.json(
                { success: false, message: '登录失败，请重试' },
                { status: 500 }
            );
        }

        const { data: signInData, error: signInError } = await authAdminClient.auth.signInWithPassword({
            email,
            password: randomPassword,
        });

        if (signInError) {
            console.error('[SMS API] 登录失败:', signInError);
            return NextResponse.json(
                { success: false, message: '登录失败，请重试' },
                { status: 500 }
            );
        }

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