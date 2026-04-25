/**
 * 手机号验证码注册路由
 *
 * 验证短信验证码后，使用 Supabase Admin API 创建用户（跳过邮箱确认）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCode } from '@/lib/sms/verification-store';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, code, password, nickname } = body as {
            phone?: string;
            code?: string;
            password?: string;
            nickname?: string;
        };

        if (!phone || !code || !password) {
            return NextResponse.json(
                { success: false, message: '缺少必要参数' },
                { status: 400 }
            );
        }

        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return NextResponse.json(
                { success: false, message: '手机号格式不正确' },
                { status: 400 }
            );
        }

        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, message: '验证码格式不正确' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: '密码至少6个字符' },
                { status: 400 }
            );
        }

        const verifyResult = verifyCode(phone, code);
        if (!verifyResult.success) {
            return NextResponse.json(
                { success: false, message: verifyResult.message },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { success: false, message: '服务器配置不完整' },
                { status: 500 }
            );
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const email = `${phone}@phone.xingbu.app`;

        const { data, error } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                phone: phone,
                nickname: nickname || '命理爱好者',
            },
        });

        if (error) {
            if (error.message.includes('already')) {
                return NextResponse.json(
                    { success: false, message: '该手机号已注册' },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { success: false, message: '注册失败：' + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '注册成功',
            user: {
                id: data.user?.id,
                email: data.user?.email,
                nickname: data.user?.user_metadata?.nickname,
            },
        });
    } catch (error) {
        console.error('[Auth API] 注册异常:', error);
        return NextResponse.json(
            { success: false, message: '注册失败，请稍后重试' },
            { status: 500 }
        );
    }
}