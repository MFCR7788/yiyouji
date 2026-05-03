/**
 * 测试 undici ProxyAgent 的不同用法
 */

const PROXY_URL = 'http://127.0.0.1:6767';

async function testProxyAgentVariants() {
    console.log('=== ProxyAgent 用法测试 ===\n');
    
    const testUrl = 'https://ark.cn-beijing.volces.com';
    
    // 方法 1：基本字符串
    console.log('方法1: new ProxyAgent(uriString)');
    try {
        const { ProxyAgent } = require('undici');
        const agent = new ProxyAgent(PROXY_URL);
        const res = await fetch(testUrl, { dispatcher: agent, method: 'HEAD' });
        console.log('✅ 成功! status:', res.status);
    } catch (e) {
        console.log('❌ 失败:', e.message, '| code:', e.cause?.code);
    }
    
    // 方法2：使用 uri 对象
    console.log('\n方法2: new ProxyAgent({ uri })');
    try {
        const { ProxyAgent } = require('undici');
        const agent = new ProxyAgent({ uri: PROXY_URL });
        const res = await fetch(testUrl, { dispatcher: agent, method: 'HEAD' });
        console.log('✅ 成功! status:', res.status);
    } catch (e) {
        console.log('❌ 失败:', e.message, '| code:', e.cause?.code);
    }
    
    // 方法3：使用 url 对象
    console.log('\n方法3: new ProxyAgent({ url })');
    try {
        const { ProxyAgent } = require('undici');
        const agent = new ProxyAgent({ url: PROXY_URL });
        const res = await fetch(testUrl, { dispatcher: agent, method: 'HEAD' });
        console.log('✅ 成功! status:', res.status);
    } catch (e) {
        console.log('❌ 失败:', e.message, '| code:', e.cause?.code);
    }
    
    // 方法4：使用 factory
    console.log('\n方法4: ProxyAgent 使用 factory token');
    try {
        const { ProxyAgent, getGlobalDispatcher, setGlobalDispatcher } = require('undici');
        const agent = new ProxyAgent(PROXY_URL);
        setGlobalDispatcher(agent);
        const res = await fetch(testUrl, { method: 'HEAD' });
        console.log('✅ 成功! status:', res.status);
    } catch (e) {
        console.log('❌ 失败:', e.message, '| code:', e.cause?.code);
    }
    
    // 方法5：直接用环境变量（不使用代理）
    console.log('\n方法5: 直接 fetch (无代理)');
    try {
        const res = await fetch(testUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        console.log('✅ 成功! status:', res.status);
    } catch (e) {
        console.log('❌ 失败:', e.message, '| code:', e.cause?.code);
    }
}

testProxyAgentVariants();
