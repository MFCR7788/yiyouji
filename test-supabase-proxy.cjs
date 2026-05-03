#!/usr/bin/env node
/**
 * 测试 Supabase 代理连接
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

async function testSupabaseWithProxyFetch() {
    console.log('='.repeat(80));
    console.log('🔌 测试 Supabase 带代理的 fetch');
    console.log('='.repeat(80));
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!SUPABASE_URL) {
        console.log('❌ SUPABASE_URL 未配置');
        return false;
    }
    
    // 配置 undici 全局代理
    let proxyAgent;
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        proxyAgent = new ProxyAgent(httpsProxy);
        setGlobalDispatcher(proxyAgent);
        console.log(`✅ 已配置全局代理: ${httpsProxy}`);
    } catch (err) {
        console.log(`❌ 无法配置代理: ${err.message}`);
        return false;
    }
    
    // 创建带代理 fetch 的 Supabase 客户端
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        fetch: (input, init) => {
            const options = { ...init, dispatcher: proxyAgent };
            return globalThis.fetch(input, options);
        },
    });
    
    console.log('\n📋 测试 Supabase 查询...');
    
    try {
        const startTime = Date.now();
        
        const { data, error } = await supabase
            .from('users')
            .select('id, ai_chat_count')
            .limit(3);
        
        const duration = Date.now() - startTime;
        
        if (error) {
            console.log(`❌ 查询失败 (${duration}ms):`);
            console.log(`   错误代码: ${error.code}`);
            console.log(`   错误信息: ${error.message}`);
            console.log(`   错误详情: ${error.hint || '无'}`);
            return false;
        }
        
        console.log(`✅ 查询成功！(${duration}ms)`);
        console.log(`   返回记录数: ${data?.length || 0}`);
        
        if (data && data.length > 0) {
            console.log('\n   示例数据:');
            data.forEach((row, i) => {
                console.log(`   ${i + 1}. ID: ${row.id.substring(0, 8)}... | 积分: ${row.ai_chat_count}`);
            });
        }
        
        return true;
        
    } catch (err) {
        console.log(`❌ 异常 (${Date.now() - startTime}ms):`);
        console.log(`   类型: ${err.constructor.name}`);
        console.log(`   信息: ${err.message}`);
        
        if (err.cause) {
            console.log(`   原因: ${err.cause.message || err.cause}`);
        }
        
        return false;
    }
}

// 测试积分扣减
async function testCreditDecrement() {
    console.log('\n' + '='.repeat(80));
    console.log('💰 测试积分扣减 RPC 函数');
    console.log('='.repeat(80));
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!SUPABASE_SECRET_KEY) {
        console.log('⚠️ SUPABASE_SECRET_KEY 未配置，跳过测试');
        return null;
    }
    
    // 配置代理
    let proxyAgent;
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        proxyAgent = new ProxyAgent(httpsProxy);
        setGlobalDispatcher(proxyAgent);
    } catch (err) {
        console.log(`❌ 无法配置代理: ${err.message}`);
        return false;
    }
    
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        fetch: (input, init) => {
            const options = { ...init, dispatcher: proxyAgent };
            return globalThis.fetch(input, options);
        },
    });
    
    // 使用无效 UUID 测试函数是否存在
    console.log('\n📋 测试 decrement_ai_chat_count 函数...');
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabase.rpc('decrement_ai_chat_count', {
            user_id: '00000000-0000-0000-0000-000000000000'
        });
        const duration = Date.now() - startTime;
        
        if (error) {
            if (error.message.includes('does not exist')) {
                console.log(`❌ 函数不存在！需要创建 (${duration}ms)`);
                console.log(`   错误: ${error.message}`);
                return false;
            }
            
            console.log(`⚠️ 调用返回错误 (${duration}ms):`);
            console.log(`   这可能是正常的（用户不存在）`);
            console.log(`   错误: ${error.message}`);
            console.log(`   返回值: ${data}`);
            
            if (data !== null && data !== undefined) {
                console.log(`\n✅ 函数存在且可调用！返回值: ${data} (0=用户不存在或积分为0)`);
                return true;
            }
            
            return null; // 不确定
        }
        
        console.log(`✅ 函数调用成功！(${duration}ms)`);
        console.log(`   返回值: ${data}`);
        return true;
        
    } catch (err) {
        console.log(`❌ 异常: ${err.message}`);
        return false;
    }
}

// 主函数
async function main() {
    const result1 = await testSupabaseWithProxyFetch();
    const result2 = await testCreditDecrement();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 最终结论:');
    console.log('─'.repeat(70));
    console.log(`   Supabase 连接: ${result1 ? '✅ 正常' : '❌ 失败'}`);
    console.log(`   积分函数: ${result2 === true ? '✅ 正常' : result2 === false ? '❌ 失败' : '⚠️ 不确定'}`);
    
    if (result1) {
        console.log('\n   🎉 代理配置成功！');
        console.log('   ✅ 可以重启开发服务器测试手相分析功能');
    } else {
        console.log('\n   ⚠️ 请检查:');
        console.log('      1. 代理服务器是否运行在 127.0.0.1:6767');
        console.log('      2. 代理是否支持 HTTPS CONNECT 隧道');
        console.log('      3. Supabase URL 是否正确');
    }
    
    console.log('='.repeat(80));
}

main();