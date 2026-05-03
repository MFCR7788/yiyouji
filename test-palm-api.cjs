#!/usr/bin/env node
/**
 * 快速测试手相分析 API（模拟前端请求）
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
console.log('🔍 手相分析 API 诊断');
console.log('='.repeat(80));

// 配置代理
let proxyAgent;
try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici');
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (httpsProxy) {
        proxyAgent = new ProxyAgent(httpsProxy);
        setGlobalDispatcher(proxyAgent);
        console.log(`✅ 已配置代理: ${httpsProxy}\n`);
    }
} catch (e) {}

async function testPalmAPI() {
    const baseUrl = 'http://localhost:3000';
    
    // 测试1: 检查 API 是否可访问
    console.log('📋 测试 1: 检查 API 端点是否可访问...');
    try {
        const healthRes = await fetch(`${baseUrl}/api/palm`, { method: 'GET' });
        console.log(`   ✅ GET /api/palm → ${healthRes.status}`);
        const healthData = await healthRes.json();
        console.log(`   📦 响应:`, JSON.stringify(healthData).substring(0, 200));
    } catch (err) {
        console.log(`   ❌ 失败: ${err.message}`);
    }

    // 测试2: 模拟手相分析请求（使用真实图片base64）
    console.log('\n📋 测试 2: 模拟手相分析请求...');
    
    // 创建一个小的测试图片 (1x1 像素红色 PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    try {
        const startTime = Date.now();
        
        const response = await fetch(`${baseUrl}/api/palm`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': 'sb-dev-user=' + encodeURIComponent(JSON.stringify({
                    id: 'dev-user-13586108333',
                    nickname: '清风',
                    phone: '13586108333'
                }))
            },
            body: JSON.stringify({
                action: 'analyze',
                imageBase64: testImageBase64,
                imageMimeType: 'image/png',
                analysisType: 'full',
                handType: 'left'
            })
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`   ⏱️  耗时: ${duration}ms`);
        console.log(`   📊 HTTP 状态: ${response.status}`);
        
        const data = await response.json();
        
        console.log('\n   📦 完整响应:');
        console.log('   '.repeat(40));
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
        
        if (data.success) {
            console.log('\n   ✅ 成功！返回分析结果');
        } else {
            console.log('\n   ❌ 失败:', data.error || '未知错误');
            if (data.code) console.log('   🔢 错误代码:', data.code);
            if (data.detail) console.log('   📝 详情:', data.detail);
        }
        
    } catch (err) {
        console.log(`   ❌ 异常: ${err.message}`);
        if (err.cause) console.log(`   原因: ${err.cause.message || err.cause}`);
    }
}

// 主函数
async function main() {
    await testPalmAPI();
    
    console.log('\n' + '='.repeat(80));
    console.log('💡 如果看到 "服务暂时不可用"，请检查:');
    console.log('   1. 终端中的 Next.js 日志输出');
    console.log('   2. 浏览器 Console 的错误信息');
    console.log('   3. 网络(Network)标签页的请求详情');
    console.log('='.repeat(80));
}

main();