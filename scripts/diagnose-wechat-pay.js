#!/usr/bin/env node

/**
 * 微信支付配置诊断工具
 * 用法: node scripts/diagnose-wechat-pay.js
 *
 * 检查项:
 * 1. 环境变量是否存在
 * 2. 私钥格式是否正确（PEM格式）
 * 3. 私钥是否可以加载
 * 4. 网络连通性测试
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  let loaded = false;
  
  for (const envFile of envFiles) {
    const filePath = path.join(__dirname, '..', envFile);
    if (fs.existsSync(filePath)) {
      console.log(`📁 加载环境变量文件: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalsIndex = trimmed.indexOf('=');
          if (equalsIndex > 0) {
            const key = trimmed.substring(0, equalsIndex).trim();
            let value = trimmed.substring(equalsIndex + 1).trim();
            
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/\\n/g, '\n');
            } else {
              value = value.replace(/\\n/g, '\n');
            }
            
            process.env[key] = value;
          }
        }
      }
      loaded = true;
      break;
    }
  }
  
  if (!loaded) {
    console.log('⚠️  未找到 .env.local 或 .env 文件');
  }
}

const REQUIRED_VARS = [
  'WECHAT_PAY_MCHID',
  'WECHAT_PAY_APPID',
  'WECHAT_PAY_API_V3_KEY',
  'WECHAT_PAY_MCH_SERIAL_NO',
  'WECHAT_PAY_PRIVATE_KEY',
  'WECHAT_PAY_NOTIFY_URL',
];

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logResult(label, success, detail = '') {
  const icon = success ? '✅' : '❌';
  const color = success ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${icon} ${color}${label}${reset}${detail ? ` - ${detail}` : ''}`);
}

function logInfo(label, detail) {
  console.log(`ℹ️  ${label}: ${detail}`);
}

function logWarning(label, detail) {
  console.log(`⚠️  \x1b[33m${label}\x1b[0m: ${detail}`);
}

function checkEnvVars() {
  logSection('1️⃣ 环境变量检查');

  const missing = [];
  const present = [];

  REQUIRED_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
      logResult(`环境变量 ${varName}`, false, '缺失或为空');
    } else {
      present.push(varName);
      const maskedValue = varName.includes('KEY')
        ? `${value.slice(0, 8)}...${value.slice(-4)} (${value.length}字符)`
        : varName === 'WECHAT_PAY_PRIVATE_KEY'
          ? `*** (${value.length}字符)`
          : value;

      logResult(`环境变量 ${varName}`, true, maskedValue);
    }
  });

  return { missing, present };
}

function validatePrivateKey() {
  logSection('2️⃣ 私钥格式验证');

  const privateKey = process.env.WECHAT_PAY_PRIVATE_KEY;

  if (!privateKey) {
    logResult('私钥验证', false, '私钥未设置');
    return false;
  }

  // 检查长度（RSA-2048 私钥通常在 1600-2000 字符左右，PEM 格式会更长）
  if (privateKey.length < 500) {
    logResult('私钥长度', false, `太短: ${privateKey.length} 字符 (预期 > 500)`);
    return false;
  }

  logInfo('私钥总长度', `${privateKey.length} 字符`);

  // 检查是否包含 PEM 头尾标记
  const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----');
  const hasBeginRsaMarker = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  const hasEndRsaMarker = privateKey.includes('-----END RSA PRIVATE KEY-----');

  if ((hasBeginMarker && hasEndMarker) || (hasBeginRsaMarker && hasEndRsaMarker)) {
    logResult('PEM 格式标记', true, '包含正确的 PEM 头尾标记');
  } else if (privateKey.includes('-----BEGIN') && privateKey.includes('-----END')) {
    logWarning('PEM 格式', '包含 BEGIN/END 标记但格式可能不标准');
  } else {
    logResult('PEM 格式标记', false, '缺少 PEM 头尾标记');
    logWarning('提示', '私钥应包含 -----BEGIN PRIVATE KEY----- 和 -----END PRIVATE KEY-----');
    return false;
  }

  // 尝试加载私钥（验证格式是否有效）
  try {
    let keyToTest = privateKey;

    // 如果没有换行符，尝试将 \n 替换为实际换行
    if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
      logInfo('处理', '检测到转义的换行符，正在转换...');
      keyToTest = privateKey.replace(/\\n/g, '\n');
    }

    // 创建签名对象来验证私钥是否可用
    const sign = crypto.createSign('SHA256');
    sign.update('test message for key validation');

    try {
      sign.sign(keyToTest);
      logResult('私钥可加载', true, '私钥格式正确，可用于签名');
      return true;
    } catch (signError) {
      logResult('私钥签名测试', false, `无法使用私钥签名: ${signError.message}`);

      // 尝试其他可能的修复方式
      if (keyToTest.includes('\r\n')) {
        logInfo('尝试修复', '将 \\r\\n 替换为 \\n...');
        keyToTest = keyToTest.replace(/\r\n/g, '\n');
        try {
          sign.sign(keyToTest);
          logResult('修复后私钥可用', true, '已修复换行符问题');
          return true;
        } catch (e2) {
          logResult('修复失败', false, e2.message);
        }
      }

      return false;
    }
  } catch (error) {
    logResult('私钥验证异常', false, error.message);
    return false;
  }
}

function testNetworkConnectivity() {
  logSection('3️⃣ 网络连通性测试');

  return new Promise((resolve) => {
    const testUrl = 'api.mch.weixin.qq.com';
    const testPath = '/';

    logInfo('测试目标', `${testUrl}${testPath}`);

    const req = https.request(
      {
        hostname: testUrl,
        port: 443,
        path: testPath,
        method: 'GET',
        timeout: 10000,
      },
      (res) => {
        logResult('HTTPS 连接', true, `状态码: ${res.statusCode}`);
        resolve(true);
      },
    );

    req.on('error', (error) => {
      logResult('HTTPS 连接', false, error.message);

      if (error.code === 'ENOTFOUND') {
        logWarning('DNS 解析失败', '请检查网络连接或 DNS 设置');
      } else if (error.code === 'ECONNREFUSED') {
        logWarning('连接被拒绝', '目标服务器拒绝连接，可能有防火墙限制');
      } else if (error.code === 'ETIMEDOUT') {
        logWarning('连接超时', '网络延迟过高或被防火墙阻止');
      } else if (error.code === 'ECONNRESET') {
        logWarning('连接重置', '连接被中间设备重置（可能是 GFW 或防火墙）');
      }

      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      logResult('HTTPS 连接', false, '请求超时 (>10s)');
      logWarning('超时提示', '服务器可能无法访问微信支付 API，请检查防火墙规则');
      resolve(false);
    });

    req.end();
  });
}

function generateDiagnosticReport() {
  logSection('📋 诊断总结');

  const config = {
    mchid: process.env.WECHAT_PAY_MCHID,
    appid: process.env.WECHAT_PAY_APPID,
    mchSerialNo: process.env.WECHAT_PAY_MCH_SERIAL_NO,
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL,
    h5Domain: process.env.WECHAT_PAY_H5_DOMAIN,
  };

  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      logInfo(key, value);
    } else {
      logWarning(key, '未设置');
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log('💡 常见问题解决方案:');
  console.log('-'.repeat(60));
  console.log('');
  console.log('1. 认证失败 (SIGN_ERROR/NO_AUTH):');
  console.log('   - 检查 WECHAT_PAY_PRIVATE_KEY 是否为完整的 PEM 格式');
  console.log('   - 检查 WECHAT_PAY_MCH_SERIAL_NO 是否与证书一致');
  console.log('   - 确认私钥对应的是正确的商户号');
  console.log('');
  console.log('2. 私钥格式错误:');
  console.log('   - 私钥必须包含完整的 PEM 头尾标记');
  console.log('   - 确保换行符是实际换行符 (\\n)，不是字面量 "\\n"');
  console.log('   - 可在微信商户平台下载新的 APIv3 证书和私钥');
  console.log('');
  console.log('3. 网络连接失败:');
  console.log('   - 服务器需要能访问 api.mch.weixin.qq.com');
  console.log('   - 检查防火墙/安全组是否放行 443 端口出站');
  console.log('   - 如果是海外服务器，可能需要配置代理');
  console.log('');
  console.log('4. 参数错误:');
  console.log('   - 检查 appid 和 mchid 是否匹配');
  console.log('   - 检查 notify_url 是否可访问');
  console.log('');
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       微信支付配置诊断工具 v1.0                      ║');
  console.log('║       WeChat Pay Configuration Diagnostics            ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // 加载环境变量
  loadEnv();

  // 1. 检查环境变量
  const { missing, present } = checkEnvVars();

  if (missing.length > 0) {
    console.log('\n❌ 缺少必要的环境变量，无法继续诊断！');
    console.log('请在 .env.local 中配置以下变量:');
    missing.forEach(v => console.log(`  - ${v}`));
    process.exit(1);
  }

  // 2. 验证私钥
  const keyValid = validatePrivateKey();

  if (!keyValid) {
    console.log('\n❌ 私钥验证失败！这是导致"二维码生成失败"的最常见原因。');
    console.log('请检查 WECHAT_PAY_PRIVATE_KEY 的格式是否正确。\n');
  }

  // 3. 测试网络连通性
  await testNetworkConnectivity();

  // 4. 生成诊断报告
  generateDiagnosticReport();

  // 最终结果
  console.log('\n' + '='.repeat(60));
  const allPassed = missing.length === 0 && keyValid;
  if (allPassed) {
    console.log('✅ 基础配置检查通过！');
    console.log('如果仍然失败，请查看应用日志中的详细错误信息。');
  } else {
    console.log('❌ 发现配置问题，请根据上述提示进行修复。');
    console.log('修复后重启服务即可生效。');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
