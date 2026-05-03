/**
 * 火山引擎 Responses API Provider
 * 
 * 专门处理火山引擎的 /api/v3/responses 接口格式
 * 请求格式：
 * {
 *   "model": "xxx",
 *   "input": [
 *     {
 *       "role": "user",
 *       "content": [
 *         { "type": "input_image", "image_url": "..." },
 *         { "type": "input_text", "text": "..." }
 *       ]
 *     }
 *   ]
 * }
 * 
 * 响应格式：
 * {
 *   "output": [
 *     {
 *       "type": "reasoning",
 *       "summary": [
 *         { "type": "summary_text", "text": "..." }
 *       ]
 *     },
 *     {
 *       "type": "message",
 *       "content": [{ "type": "output_text", "text": "..." }]
 *     }
 *   ]
 * }
 */

import type { AIModelConfig } from '@/types';
import type { ChatMessage } from '@/types';

export type AIRequestMessage = Pick<ChatMessage, 'role' | 'content'>;

export interface VolcResponseOutputItem {
    type: string;
    summary?: Array<{
        type: string;
        text: string;
    }>;
    content?: Array<{
        type: string;
        text: string;
    }>;
    status?: string;
}

export interface VolcResponseResult {
    output: VolcResponseOutputItem[];
}

/**
 * 创建带代理的 fetch 函数
 */
function createProxyFetch() {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!httpsProxy) {
        console.log('[volc-responses] 未检测到代理环境变量，使用默认 fetch');
        return undefined;
    }
    
    try {
        const { ProxyAgent } = require('undici');
        const agent = new ProxyAgent(httpsProxy);
        
        const proxyFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const options = { ...init, dispatcher: agent } as any;
            return globalThis.fetch(input, options);
        };
        
        console.log(`[volc-responses] ✅ 已创建带代理的 fetch: ${httpsProxy}`);
        return proxyFetch as unknown as typeof fetch;
    } catch (err) {
        console.warn('[volc-responses] ⚠️ 无法创建代理 fetch:', err instanceof Error ? err.message : err);
        return undefined;
    }
}

export async function callVolcResponsesAPI(
    config: AIModelConfig,
    messages: AIRequestMessage[],
    imageBase64?: string,
    imageMimeType?: string
): Promise<string> {
    const apiKey = process.env[config.apiKeyEnvVar];
    if (!apiKey) {
        throw new Error(`${config.name || config.id} API key not configured`);
    }

    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) {
        throw new Error('No user message found');
    }

    const content: Array<{ type: string; [key: string]: unknown }> = [];

    if (imageBase64) {
        content.push({
            type: 'input_image',
            image_url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}`,
        });
    }

    content.push({
        type: 'input_text',
        text: userMessage.content,
    });

    const body = {
        model: config.modelId,
        input: [
            {
                role: 'user',
                content,
            },
        ],
    };

    // 使用带代理的 fetch（如果可用）
    const proxyFetch = createProxyFetch();
    
    console.log(`[volc-responses] 📡 调用 API: ${config.apiUrl}`);
    console.log(`[volc-respaces] 🧠 模型: ${config.modelId}`);
    console.log(`[volc-responses] 🖼️  图片: ${imageBase64 ? '有 (' + Math.round(imageBase64.length / 1024) + 'KB)' : '无'}`);
    
    const response = await (proxyFetch || fetch)(config.apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    console.log(`[volc-responses] 📊 响应状态: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[volc-responses] ❌ API 错误: ${errorText.substring(0, 300)}`);
        throw new Error(`Volc API error: ${response.status} - ${errorText}`);
    }

    const result: VolcResponseResult = await response.json();
    
    console.log(`[volc-responses] ✅ 收到响应，output 数量: ${(result.output || []).length}`);
    
    // 解析响应：优先从 message 类型中提取 output_text
    for (const item of result.output || []) {
        // 方式1：message.content[].text
        if (item.type === 'message' && item.content && Array.isArray(item.content)) {
            const textItem = item.content.find(c => c.type === 'output_text' || c.text);
            if (textItem?.text) {
                console.log(`[volc-responses] ✅ 从 message 提取文本 (${textItem.text.length} 字符)`);
                return textItem.text;
            }
        }
        
        // 方式2：reasoning.summary[].text (旧版兼容)
        if (item.summary && Array.isArray(item.summary)) {
            const textItem = item.summary.find(s => s.type === 'summary_text' || s.text);
            if (textItem?.text) {
                console.log(`[volc-responses] ✅ 从 reasoning 提取文本 (${textItem.text.length} 字符)`);
                return textItem.text;
            }
        }
    }
    
    // 如果都没找到，记录完整响应用于调试
    console.error('[volc-responses] ⚠️ 无法从响应中提取文本！');
    console.error('[volc-responses] 完整响应:', JSON.stringify(result).substring(0, 500));
    
    throw new Error('Empty or unparseable response from Volc API');
}