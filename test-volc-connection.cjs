/**
 * 快速测试火山引擎 API 连接
 */

const VOLC_API_KEY = process.env.VOLC_API_KEY || 'ark-46558706-dab0-4a46-b686-a4c93b87610a-ba434';
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:6767';

async function testVolcAPI() {
    console.log('=== 火山引擎 API 连接测试 ===\n');
    console.log(`API Key: ${VOLC_API_KEY.substring(0, 20)}...`);
    console.log(`Proxy: ${PROXY_URL}\n`);

    let proxyFetch;
    
    try {
        const { ProxyAgent } = require('undici');
        const agent = new ProxyAgent(PROXY_URL);
        
        proxyFetch = async (input, init) => {
            const options = { ...init, dispatcher: agent };
            return globalThis.fetch(input, options);
        };
        
        console.log('✅ ProxyAgent 创建成功');
    } catch (err) {
        console.warn('⚠️ 无法创建 ProxyAgent，使用默认 fetch:', err.message);
        proxyFetch = fetch;
    }

    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    const body = {
        model: 'doubao-seed-2-0-lite-260215',
        messages: [
            {
                role: 'user',
                content: '你好，请用一句话介绍自己'
            }
        ],
        max_tokens: 100,
        temperature: 0.7,
    };

    console.log(`\n📡 调用 API: ${apiUrl}`);
    console.log(`📝 请求体大小: ${JSON.stringify(body).length} 字节\n`);

    try {
        const startTime = Date.now();
        const response = await proxyFetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VOLC_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const elapsed = Date.now() - startTime;
        console.log(`📊 响应状态: ${response.status} ${response.statusText} (${elapsed}ms)`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API 错误:`, errorText.substring(0, 500));
            return;
        }

        const result = await response.json();
        console.log(`✅ API 调用成功!`);
        console.log(`\n响应内容:`);
        console.log('─'.repeat(60));
        
        if (result.choices && result.choices.length > 0) {
            console.log('模型回复:', result.choices[0].message.content);
        } else {
            console.log(JSON.stringify(result, null, 2).substring(0, 500));
        }
        
        if (result.usage) {
            console.log(`\nToken 用量:`, result.usage);
        }
        
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.cause) {
            console.error('原因:', error.cause.code || error.cause.message || error.cause);
        }
    }
}

testVolcAPI();
