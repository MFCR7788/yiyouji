/**
 * 短信验证诊断端点
 * 用于排查登录/注册问题
 */
import { NextResponse } from 'next/server';

export async function GET() {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {},
        supabase: {},
        sms: {}
    };

    diagnostics.environment = {
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 已设置' : '❌ 未设置',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? `✅ 已设置 (长度: ${process.env.SUPABASE_ANON_KEY.length})` : '❌ 未设置',
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ? `✅ 已设置 (长度: ${process.env.SUPABASE_SECRET_KEY.length})` : '❌ 未设置',
        ALIYUN_SMS_ACCESS_KEY_ID: process.env.ALIYUN_SMS_ACCESS_KEY_ID ? '✅ 已设置' : '❌ 未设置',
        ALIYUN_SMS_ACCESS_KEY_SECRET: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET ? '✅ 已设置' : '❌ 未设置',
        SMS_VERIFICATION_SECRET: process.env.SMS_VERIFICATION_SECRET ? `✅ 已设置 (值: ${process.env.SMS_VERIFICATION_SECRET.slice(0, 10)}...)` : '❌ 未设置 (使用默认值)',
    };

    try {
        const { createClient } = await import('@supabase/supabase-js');
        
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            const testClient = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const startTime = Date.now();
            const { data, error } = await testClient.from('users').select('count', { count: 'exact', head: true });
            const elapsed = Date.now() - startTime;

            diagnostics.supabase = {
                connection: error ? '❌ 失败' : '✅ 成功',
                responseTime: `${elapsed}ms`,
                error: error?.message || null,
                errorCode: error?.code || null
            };
        } else {
            diagnostics.supabase = { connection: '⚠️ 跳过 (缺少配置)' };
        }
    } catch (e) {
        diagnostics.supabase = {
            connection: '❌ 异常',
            error: (e as Error).message
        };
    }

    try {
        const crypto = await import('crypto');
        const testKey = process.env.SMS_VERIFICATION_SECRET || 'fallback-secret-key-please-change-in-production';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(testKey.padEnd(32, '0').slice(0, 32)), iv);
        cipher.update('test');
        cipher.final();
        
        diagnostics.sms = {
            encryption: '✅ 正常',
            secretKeySource: process.env.SMS_VERIFICATION_SECRET ? '环境变量' : '默认值'
        };
    } catch (e) {
        diagnostics.sms = {
            encryption: '❌ 失败',
            error: (e as Error).message
        };
    }

    return NextResponse.json(diagnostics);
}
