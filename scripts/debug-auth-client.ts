#!/usr/bin/env node

/**
 * 诊断脚本：检查 Supabase Auth 客户端配置
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('=== 开始诊断 Supabase Auth 客户端 ===\n');

const requiredEnvs = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY'];
for (const env of requiredEnvs) {
    console.log(`✅ ${env} 已配置:`, !!process.env[env]);
    if (process.env[env]) {
        console.log(`   长度:`, process.env[env]?.length);
    }
}

console.log('\n✅ SUPABASE_SERVICE_ROLE_KEY 已配置:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`   长度:`, process.env.SUPABASE_SERVICE_ROLE_KEY.length);
}

console.log('\n=== 测试不同的密钥 ===\n');

// 测试 Secret Key
if (process.env.SUPABASE_SECRET_KEY) {
    console.log('🔑 使用 SUPABASE_SECRET_KEY 测试...');
    try {
        const client = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
        
        console.log('   ✅ 客户端创建成功');
        console.log('   🧪 尝试列出用户...');
        const { data, error } = await client.auth.admin.listUsers();
        if (error) {
            console.error('   ❌ 列出用户失败:', error.message);
        } else {
            console.log(`   ✅ 成功！找到 ${data?.users?.length || 0} 个用户`);
        }
    } catch (err) {
        console.error('   ❌ 使用 Secret Key 失败:', err);
    }
    console.log('');
}

// 测试 Service Role Key
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔑 使用 SUPABASE_SERVICE_ROLE_KEY 测试...');
    try {
        const client = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
        
        console.log('   ✅ 客户端创建成功');
        console.log('   🧪 尝试列出用户...');
        const { data, error } = await client.auth.admin.listUsers();
        if (error) {
            console.error('   ❌ 列出用户失败:', error.message);
        } else {
            console.log(`   ✅ 成功！找到 ${data?.users?.length || 0} 个用户`);
        }
    } catch (err) {
        console.error('   ❌ 使用 Service Role Key 失败:', err);
    }
    console.log('');
}

console.log('=== 诊断完成 ===');
