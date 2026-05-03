#!/usr/bin/env node
/**
 * 积分系统诊断脚本
 * 检查 RPC 函数、数据库连接、用户积分状态
 */

const fs = require('fs');

function loadEnv() {
    try {
        const envPath = '.env';
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                process.env[match[1]] = (match[2] || '').replace(/^['"]|['"]$/g, '');
            }
        });
    } catch (e) {}
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

console.log('='.repeat(80));
console.log('🔍 积分系统诊断工具');
console.log('='.repeat(80));
console.log('');

// 检查环境变量
console.log('📋 1. 环境变量检查');
console.log('─'.repeat(70));
if (!SUPABASE_URL) console.log('❌ SUPABASE_URL 未配置');
else console.log(`✅ SUPABASE_URL: ${SUPABASE_URL.substring(0, 40)}...`);

if (!SUPABASE_ANON_KEY) console.log('❌ SUPABASE_ANON_KEY 未配置');
else console.log(`✅ SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);

if (!SUPABASE_SECRET_KEY) {
    console.log('⚠️  SUPABASE_SECRET_KEY 未配置 (可能导致权限问题)');
} else {
    console.log(`✅ SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY.substring(0, 20)}...`);
}
console.log('');

// 测试 RPC 函数
async function testRPCFunctions() {
    console.log('📋 2. 测试 RPC 函数');
    console.log('─'.repeat(70));
    
    const { createClient } = require('@supabase/supabase-js');
    
    // 使用 service role key 测试（如果有）
    const testKey = SUPABASE_SECRET_KEY || SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, testKey);
    
    // 测试 decrement 函数
    try {
        console.log('🔍 测试 decrement_ai_chat_count 函数...');
        const { data, error } = await supabase.rpc('decrement_ai_chat_count', { 
            user_id: '00000000-0000-0000-0000-000000000000' // 使用无效 UUID 测试函数是否存在
        });
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
            console.log('❌ decrement_ai_chat_count 函数不存在！');
            console.log('   错误:', error.message);
        } else {
            console.log('✅ decrement_ai_chat_count 函数存在');
            console.log(`   返回值: ${data} (0 表示用户不存在或积分为0，这是正常的)`);
        }
    } catch (err) {
        console.log('❌ 调用失败:', err.message);
    }
    
    // 测试 increment 函数
    try {
        console.log('');
        console.log('🔍 测试 increment_ai_chat_count 函数...');
        const { data, error } = await supabase.rpc('increment_ai_chat_count', { 
            user_id: '00000000-0000-0000-0000-000000000000',
            amount: 0
        });
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
            console.log('❌ increment_ai_chat_count 函数不存在！');
            console.log('   错误:', error.message);
        } else {
            console.log('✅ increment_ai_chat_count 函数存在');
        }
    } catch (err) {
        console.log('❌ 调用失败:', err.message);
    }
    
    console.log('');
}

// 检查 users 表结构
async function checkTableStructure() {
    console.log('📋 3. 检查 users 表结构');
    console.log('─'.repeat(70));
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY || SUPABASE_ANON_KEY);
    
    try {
        // 尝试查询表结构
        const { data, error } = await supabase
            .from('users')
            .select('id, ai_chat_count, membership')
            .limit(1);
        
        if (error) {
            console.log('❌ 无法访问 users 表:');
            console.log('   错误:', error.message);
            console.log('   代码:', error.code);
            
            if (error.code === '42501' || error.message.includes('permission')) {
                console.log('');
                console.log('💡 提示: 这是权限问题，可能需要使用 SERVICE_ROLE_KEY');
            }
        } else {
            console.log('✅ 可以正常访问 users 表');
            if (data && data.length > 0) {
                console.log(`   示例数据: id=${data[0].id?.substring(0, 8)}..., ai_chat_count=${data[0].ai_chat_count}`);
            } else {
                console.log('   表为空（这可能是正常的）');
            }
        }
    } catch (err) {
        console.log('❌ 异常:', err.message);
    }
    
    console.log('');
}

// 主函数
async function main() {
    await testRPCFunctions();
    await checkTableStructure();
    
    console.log('='.repeat(80));
    console.log('🎯 诊断结论与建议');
    console.log('─'.repeat(70));
    console.log('');
    console.log('如果显示 "函数不存在"，请在 Supabase SQL Editor 执行:');
    console.log('');
    console.log('-- 1. 先删除旧函数（如果存在参数冲突）');
    console.log('DROP FUNCTION IF EXISTS public.decrement_ai_chat_count(uuid);');
    console.log('DROP FUNCTION IF EXISTS public.increment_ai_chat_count(uuid, integer);');
    console.log('');
    console.log('-- 2. 创建新函数');
    console.log('CREATE OR REPLACE FUNCTION public.decrement_ai_chat_count(user_id uuid)');
    console.log('RETURNS integer AS $$');
    console.log('BEGIN');
    console.log('  UPDATE public.users SET ai_chat_count = ai_chat_count - 1');
    console.log('  WHERE id = user_id AND ai_chat_count > 0');
    console.log('  RETURNING ai_chat_count INTO remaining;');
    console.log('  RETURN COALESCE(remaining, 0);');
    console.log('END;');  
    console.log('$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;');
    console.log('');
    console.log('-- 3. 授权');
    console.log('GRANT EXECUTE ON FUNCTION public.decrement_ai_chat_count(uuid) TO anon, authenticated;');
    console.log('GRANT EXECUTE ON FUNCTION public.increment_ai_chat_count(uuid, integer) TO anon, authenticated;');
    console.log('');
    console.log('='.repeat(80));
}

main().catch(console.error);