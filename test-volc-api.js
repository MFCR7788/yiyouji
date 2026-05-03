#!/usr/bin/env node

/**
 * 豆包 API 测试 - 使用 Responses API 格式（来自官方文档示例）
 * API Key: ark-46558706-dab0-4a46-b686-a4c93b87610a-ba434
 * Model: doubao-seed-2-0-pro-260215
 * Endpoint: /api/v3/responses (NOT /api/v3/chat/completions)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ 错误：未找到 .env 文件');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        envVars[key.trim()] = value;
      }
    }
  });

  return envVars;
}

async function testVolcAPI() {
  console.log('🔧 正在加载环境变量...\n');

  const envVars = loadEnvFile();
  const apiKey = envVars.VOLC_API_KEY;

  if (!apiKey || apiKey === '') {
    console.error('❌ 错误：VOLC_API_KEY 未配置或为空');
    process.exit(1);
  }

  console.log('✅ 环境变量加载成功\n');

  // 使用 Responses API 格式（来自官方文档）
  const testConfig = {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    apiKey: apiKey,
    modelId: 'doubao-seed-2-0-pro-260215',  // 使用模型ID，不是Endpoint ID
    testMessage: '你好，请用一句话介绍你自己'
  };

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     🔄 使用 Responses API 格式（官方文档标准）        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('📋 测试配置（基于您提供的 curl 示例）：');
  console.log(`   - API URL: ${testConfig.apiUrl}`);
  console.log(`   - API Key: ${testConfig.apiKey.substring(0, 25)}...`);
  console.log(`   - Model ID: ${testConfig.modelId}`);
  console.log(`   - 测试消息: "${testConfig.testMessage}"`);
  console.log('');

  console.log('💡 关键变化：');
  console.log('   • 使用 /api/v3/responses (Responses API)');
  console.log('   • 使用模型ID: doubao-seed-2-0-pro-260215');
  console.log('   • 不再使用 Endpoint ID 作为 model\n');

  console.log('⏳ 正在调用豆包 Responses API...');
  console.log('   请稍候...\n');

  // 使用 Responses API 的请求格式
  const testData = JSON.stringify({
    model: testConfig.modelId,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: testConfig.testMessage
          }
        ]
      }
    ]
  });

  const url = new URL(testConfig.apiUrl);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testConfig.apiKey}`,
        'Content-Length': Buffer.byteLength(testData)
      },
      timeout: 30000
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let body = '';

      console.log('📡 收到 HTTP 响应：');
      console.log(`   - 状态码: ${res.statusCode}`);
      console.log(`   - 状态消息: ${res.statusMessage}\n`);

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const latency = Date.now() - startTime;

        console.log(`📦 响应信息：`);
        console.log(`   - 大小: ${(body.length / 1024).toFixed(2)} KB`);
        console.log(`   - 延迟: ${(latency / 1000).toFixed(2)} 秒\n`);

        if (!body || body.trim() === '') {
          console.error('❌ 响应为空！');
          resolve(false);
          return;
        }

        try {
          const response = JSON.parse(body);

          if (response.output || response.choices) {
            const content = response.output?.[0]?.content?.[0]?.text ||
                          response.choices?.[0]?.message?.content;
            const usage = response.usage;

            console.log('╔══════════════════════════════════════════════════════╗');
            console.log('║                                                        ║');
            console.log('║     🎉🎉🎉  成功了！Responses API 调用通过！🎉🎉🎉     ║');
            console.log('║                                                        ║');
            console.log('╚══════════════════════════════════════════════════════╝\n');

            console.log('✅ 验证结果：');
            console.log(`   ✓ API Key 有效`);
            console.log(`   ✓ Responses API 可访问`);
            console.log(`   ✓ 模型响应正常\n`);

            console.log('📊 详细信息：');
            console.log(`   ┌─ 状态码: ${res.statusCode} OK`);
            console.log(`   ├─ 响应时间: ${(latency / 1000).toFixed(2)} 秒`);
            console.log(`   └─ 模型回复:`);
            console.log(`      "${content}"\n`);

            if (usage) {
              console.log('💰 Token 统计：');
              console.log(`   · 输入: ${usage.prompt_tokens} tokens`);
              console.log(`   · 输出: ${usage.completion_tokens} tokens`);
              console.log(`   · 总计: ${usage.total_tokens} tokens\n`);
            }

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀  下一步操作指南：');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            console.log('1️⃣  启动开发服务器：');
            console.log('    $ pnpm dev\n');

            console.log('2️⃣  测试手相识别功能：');
            console.log('    • 打开浏览器访问: http://localhost:3000/palm');
            console.log('    • 上传手掌照片');
            console.log('    • 选择分析类型并提交\n');

            console.log('3️⃣  测试面相识别功能：');
            console.log('    • 打开浏览器访问: http://localhost:3000/face');
            console.log('    • 上传面部照片');
            console.log('    • 选择分析类型并提交\n');

            console.log('✨ 恭喜！豆包视觉模型已完全配置完成！✨\n');

            resolve(true);
          } else if (response.error) {
            console.error('❌ API 返回错误：\n');
            console.error(`   错误代码: ${response.error.code || 'N/A'}`);
            console.error(`   错误消息: ${response.error.message || 'N/A'}`);

            if (response.request_id) {
              console.error(`   请求ID: ${response.request_id}`);
            }

            console.error('\n💡 如果仍然是认证错误，可能需要检查：');
            console.error('   1. API Key 是否有权限调用该模型');
            console.error('   2. 是否需要先开通 doubao-seed-2-0-pro-260215 模型\n');

            resolve(false);
          } else {
            console.log('📋 收到响应（非标准结构）：');
            console.log(JSON.stringify(response, null, 2).substring(0, 500));
            resolve(false);
          }
        } catch (e) {
          console.error('❌ 解析失败：');
          console.error(`   ${e.message}`);
          console.error(`   响应内容: ${body.substring(0, 200)}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ 网络错误：');
      console.error(`   ${e.message}\n`);
      reject(e);
    });

    req.on('timeout', () => {
      console.error('❌ 请求超时（30秒）\n');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(testData);
    req.end();
  });
}

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║     🔬 豆包视觉模型 - Responses API 测试               ║');
console.log('║     基于官方文档 curl 示例                           ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

testVolcAPI()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
