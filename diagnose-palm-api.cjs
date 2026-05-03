/**
 * 诊断手相 API 500 错误
 * 
 * 直接测试 /api/palm 端点，捕获完整错误信息
 */

const fs = require('fs');
const https = require('https');

// 创建一个小的测试图片 (1x1 红色 PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testPalmAPI() {
    console.log('=== 手相 API 诊断测试 ===\n');
    
    const url = 'http://localhost:3000/api/palm';
    
    const requestBody = {
        action: 'analyze',
        imageBase64: testImageBase64,
        imageMimeType: 'image/png',
        analysisType: 'full',
        handType: 'left'
    };
    
    console.log('请求 URL:', url);
    console.log('请求体:', {
        ...requestBody,
        imageBase64: `[${requestBody.imageBase64.length} 字符]`
    });
    console.log('');
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'sb-dev-session=dev-test'  // 模拟开发模式 session
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`响应状态: ${response.status} ${response.statusText}`);
        console.log(`响应头 Content-Type: ${response.headers.get('content-type')}`);
        console.log('');
        
        const responseText = await response.text();
        console.log('响应体 (原始):');
        console.log('─'.repeat(60));
        console.log(responseText.substring(0, 2000));
        console.log('─'.repeat(60));
        console.log('');
        
        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('解析后的 JSON:');
            console.log(JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
            console.log('(响应不是有效的 JSON)');
        }
        
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.cause) {
            console.error('原因:', error.cause);
        }
    }
}

testPalmAPI();
