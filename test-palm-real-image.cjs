/**
 * 使用真实尺寸图片测试手相 API
 * 生成一个 100x100 的红色 PNG 图片
 */

function generateMinimalPNG(width = 100, height = 100) {
    const zlib = require('zlib');
    
    // 创建原始像素数据 (RGBA)
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter byte
        for (let x = 0; x < width; x++) {
            rawData.push(255, 0, 0, 255); // RGBA: red
        }
    }
    
    const rawBuffer = Buffer.from(rawData);
    const compressedData = zlib.deflateSync(rawBuffer);
    
    // 构建 PNG 文件
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type (RGBA)
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    
    const ihdrChunk = createChunk('IHDR', ihdr);
    
    // IDAT chunk
    const idatChunk = createChunk('IDAT', compressedData);
    
    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]).toString('base64');
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);
    
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    
    for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function testWithRealImage() {
    console.log('=== 手相 API 完整功能测试（真实图片）===\n');
    
    const imageBase64 = generateMinimalPNG(200, 200);
    console.log(`✅ 生成测试图片: 200x200 PNG (${Math.round(imageBase64.length / 1024)}KB)\n`);
    
    const requestBody = {
        action: 'analyze',
        imageBase64,
        imageMimeType: 'image/png',
        analysisType: 'full',
        handType: 'left'
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/palm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`响应状态: ${response.status} ${response.statusText}\n`);
        
        const result = await response.json();
        
        if (result.success) {
            console.log('🎉✅✅ 测试成功！手相分析 API 正常工作！\n');
            console.log('─'.repeat(60));
            console.log('返回数据结构:');
            console.log('- success:', result.success);
            console.log('- conversationId:', result.data?.conversationId);
            
            if (result.data?.analysis) {
                const analysis = result.data.analysis;
                console.log('- 分析结果长度:', typeof analysis === 'string' ? analysis.length : JSON.stringify(analysis).length, '字符');
                if (typeof analysis === 'string') {
                    console.log('\n分析结果预览:');
                    console.log(analysis.substring(0, 500) + (analysis.length > 500 ? '...' : ''));
                } else {
                    console.log('\n完整响应:', JSON.stringify(result.data, null, 2).substring(0, 800));
                }
            }
            console.log('─'.repeat(60));
        } else {
            console.log('❌ 测试失败:', result.error);
            if (result._debug_error) {
                console.log('调试信息:', JSON.stringify(result._debug_error, null, 2));
            }
        }
        
    } catch (error) {
        console.error('❌ 请求异常:', error.message);
    }
}

testWithRealImage();
