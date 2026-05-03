#!/usr/bin/env node
/**
 * 代理连接测试脚本
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

console.log('='.repeat(80));
console.log('🔌 代理配置测试');
console.log('='.repeat(80));

const httpProxy = process.env.HTTP_PROXY;
const httpsProxy = process.env.HTTPS_PROXY;

console.log(`\n📋 环境变量:`);
console.log(`   HTTP_PROXY: ${httpProxy || '(未设置)'}`);
console.log(`   HTTPS_PROXY: ${httpsProxy || '(未设置)'}`);

async function testWithProxy() {
    console.log('\n📋 测试 1: 配置 undici 代理...');
    
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        
        const proxyUrl = httpsProxy || httpProxy;
        if (!proxyUrl) {
            console.log('❌ 未配置代理 URL');
            return false;
        }
        
        const dispatcher = new ProxyAgent(proxyUrl);
        setGlobalDispatcher(dispatcher);
        console.log(`✅ 代理已配置: ${proxyUrl}`);
    } catch (err) {
        console.log(`❌ 无法加载 undici: ${err.message}`);
        return false;
    }
    
    // 测试 Supabase 连接
    console.log('\n📋 测试 2: 连接 Supabase...');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL) {
        console.log('❌ SUPABASE_URL 未配置');
        return false;
    }
    
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const startTime = Date.now();
        const { data, error } = await supabase.from('users').select('id').limit(1);
        const duration = Date.now() - startTime;
        
        if (error) {
            console.log(`❌ 查询失败 (${duration}ms):`);
            console.log(`   错误: ${error.message}`);
            return false;
        }
        
        console.log(`✅ Supabase 连接成功！(${duration}ms)`);
        console.log(`   返回数据: ${data?.length || 0} 条记录`);
        return true;
        
    } catch (err) {
        console.log(`❌ 异常: ${err.message}`);
        return false;
    }
}

// 测试火山引擎 API
async function testVolcEngineAPI() {
    console.log('\n📋 测试 3: 连接火山引擎 API...');
    
    const API_KEY = process.env.VOLC_API_KEY;
    const MODEL_ID = 'doubao-seed-2-0-lite-260215';
    
    if (!API_KEY) {
        console.log('❌ VOLC_API_KEY 未配置');
        return false;
    }
    
    try {
        const startTime = Date.now();
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: [{ role: 'user', content: '你好' }],
                max_tokens: 50
            })
        });
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
            console.log(`❌ HTTP ${response.status} (${duration}ms)`);
            return false;
        }
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        console.log(`✅ 火山引擎 API 连接成功！(${duration}ms)`);
        console.log(`   回复: ${text.substring(0, 50)}...`);
        return true;
        
    } catch (err) {
        console.log(`❌ 异常: ${err.message}`);
        return false;
    }
}

// 主函数
async function main() {
    const result1 = await testWithProxy();
    const result2 = await testVolcEngineAPI();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 总结:');
    console.log('─'.repeat(70));
    console.log(`   Supabase: ${result1 ? '✅ 正常' : '❌ 失败'}`);
    console.log(`   火山引擎: ${result2 ? '✅ 正常' : '❌ 失败'}`);
    
    if (result1 && result2) {
        console.log('\n   🎉 所有服务通过代理正常连接！');
        console.log('   ✅ 可以重启开发服务器测试手相分析功能');
    } else {
        console.log('\n   ⚠️ 存在连接问题，请检查:');
        console.log('      1. 代理服务器是否运行在 127.0.0.1:6767');
        console.log('      2. 代理是否能访问外网');
        console.log('      3. 防火墙设置');
    }
    
    console.log('='.repeat(80));
}

main();