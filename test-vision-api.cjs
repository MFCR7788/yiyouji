#!/usr/bin/env node
/**
 * 测试豆包视觉模型的图像分析能力
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

const API_KEY = process.env.VOLC_API_KEY;
const MODEL_ID = 'doubao-seed-2-0-lite-260215';

console.log('='.repeat(80));
console.log('🖼️ 豆包视觉模型 - 图像分析测试');
console.log('='.repeat(80));

// 配置代理
try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici');
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (httpsProxy) {
        const agent = new ProxyAgent(httpsProxy);
        setGlobalDispatcher(agent);
        console.log(`✅ 已配置代理: ${httpsProxy}\n`);
    }
} catch (e) {}

async function testVisionWithImage() {
    console.log('📋 测试: 图像识别 + 手相分析');
    console.log('─'.repeat(70));
    
    // 使用一个小的测试图片 (1x1 像素红色 PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // 测试1: 使用 Responses API 格式（当前配置）
    console.log('🔍 测试 1: Responses API (/api/v3/responses)');
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_image',
                                image_url: `data:image/png;base64,${testImageBase64}`
                            },
                            {
                                type: 'input_text',
                                text: '请简要描述这张图片的内容，并分析如果这是一张手相图片，你会如何解读？'
                            }
                        ]
                    }
                ]
            })
        });
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ HTTP ${response.status} (${duration}ms):`);
            console.log(`   错误: ${errorText.substring(0, 300)}`);
            return false;
        }
        
        const data = await response.json();
        console.log(`✅ 成功！(${duration}ms)`);
        
        // 提取文本
        let text = '(无法解析)';
        if (data.output && Array.isArray(data.output)) {
            for (const item of data.output) {
                if (item.type === 'message') {
                    text = item.content?.[0]?.text || '(无内容)';
                    break;
                } else if (item.summary) {
                    for (const s of item.summary) {
                        if (s.text) { text = s.text; break; }
                    }
                }
            }
        }
        
        console.log(`\n📝 模型回复:`);
        console.log('   '.repeat(40));
        console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
        
        return true;
        
    } catch (err) {
        console.log(`❌ 异常: ${err.message}`);
        if (err.cause) console.log(`   原因: ${err.cause.message || err.cause}`);
        return false;
    }
}

// 测试2: 使用 Chat Completions API 格式
async function testChatCompletionsFormat() {
    console.log('\n' + '─'.repeat(70));
    console.log('🔍 测试 2: Chat Completions API (/api/v3/chat/completions)');
    console.log('─'.repeat(70));
    
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
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
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${testImageBase64}`
                                }
                            },
                            {
                                type: 'text',
                                text: '请简要描述这张图片'
                            }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ HTTP ${response.status} (${duration}ms):`);
            console.log(`   错误: ${errorText.substring(0, 300)}`);
            return false;
        }
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '(空)';
        
        console.log(`✅ 成功！(${duration}ms)`);
        console.log(`\n📝 模型回复:`);
        console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
        
        return true;
        
    } catch (err) {
        console.log(`❌ 异常: ${err.message}`);
        return false;
    }
}

// 主函数
async function main() {
    const result1 = await testVisionWithImage();
    const result2 = await testChatCompletionsFormat();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 结论:');
    console.log('─'.repeat(70));
    console.log(`   Responses API (当前配置): ${result1 ? '✅ 可用' : '❌ 失败'}`);
    console.log(`   Chat Completions API:       ${result2 ? '✅ 可用' : '❌ 失败'}`);
    
    if (!result1 && result2) {
        console.log('\n💡 建议: 切换到 /api/v3/chat/completions 格式');
    }
    
    console.log('='.repeat(80));
}

main();