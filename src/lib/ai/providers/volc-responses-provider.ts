/**
 * 火山引擎 Vision API Provider
 * 
 * 使用 OpenAI 兼容的 /api/v3/chat/completions 接口格式
 * 支持图片输入（base64 格式）
 */

import type { AIModelConfig } from '@/types';
import type { ChatMessage } from '@/types';

export type AIRequestMessage = Pick<ChatMessage, 'role' | 'content'>;

export interface VolcChatResponse {
    id: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * 配置全局代理（如果需要）
 * 使用 setGlobalDispatcher 而非 dispatcher 选项
 */
function configureProxyIfNeeded(): void {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!httpsProxy) {
        console.log('[volc-vision] 未检测到代理环境变量');
        return;
    }
    
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        const agent = new ProxyAgent(httpsProxy);
        setGlobalDispatcher(agent);
        console.log(`[volc-vision] ✅ 已配置全局代理: ${httpsProxy}`);
    } catch (err) {
        console.warn('[volc-vision] ⚠️ 无法配置代理:', err instanceof Error ? err.message : err);
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
        throw new Error(`${config.name || config.id} API key not configured (env: ${config.apiKeyEnvVar})`);
    }

    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) {
        throw new Error('No user message found');
    }

    // 构建消息内容（支持图片 + 文本）
    let content: string | Array<{ type: string; [key: string]: unknown }>;
    
    if (imageBase64) {
        // 多模态内容：图片 + 文本
        content = [
            {
                type: 'image_url',
                image_url: {
                    url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}`,
                },
            },
            {
                type: 'text',
                text: userMessage.content,
            },
        ];
    } else {
        // 纯文本
        content = userMessage.content;
    }

    // 使用 chat/completions 端点（从 responses 转换）
    const apiUrl = config.apiUrl.includes('/responses')
        ? config.apiUrl.replace('/responses', '/chat/completions')
        : config.apiUrl.replace(/\/api\/v3\/.*$/, '/api/v3/chat/completions');

    const body = {
        model: config.modelId,
        messages: [
            {
                role: 'user',
                content,
            },
        ],
        max_tokens: 4096,
        temperature: 0.7,
    };

    // 配置全局代理（如果需要）
    configureProxyIfNeeded();
    
    console.log(`[volc-vision] 📡 调用 API: ${apiUrl}`);
    console.log(`[volc-vision] 🧠 模型: ${config.modelId}`);
    console.log(`[volc-vision] 🖼️  图片: ${imageBase64 ? '有 (' + Math.round(imageBase64.length / 1024) + 'KB)' : '无'}`);
    console.log(`[volc-vision] 📝 请求体大小: ${JSON.stringify(body).length} 字节`);
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    console.log(`[volc-vision] 📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[volc-vision] ❌ API 错误 (${response.status}):`, errorText.substring(0, 500));
        throw new Error(`Volc API error (${response.status}): ${errorText}`);
    }

    const result: VolcChatResponse = await response.json();
    
    console.log(`[volc-vision] ✅ 收到响应, choices: ${(result.choices || []).length}`);
    
    // 解析 chat/completions 响应格式
    if (result.choices && result.choices.length > 0) {
        const choice = result.choices[0];
        const text = choice.message?.content;
        
        if (text) {
            console.log(`[volc-vision] ✅ 提取文本成功 (${text.length} 字符)`);
            
            // 记录 token 用量（如果有）
            if (result.usage) {
                console.log(`[volc-vision] 📊 Token 用量:`, result.usage);
            }
            
            return text;
        }
    }
    
    // 如果都没找到，记录完整响应用于调试
    console.error('[volc-vision] ⚠️ 无法从响应中提取文本！');
    console.error('[volc-vision] 完整响应:', JSON.stringify(result).substring(0, 500));
    
    throw new Error('Empty or unparseable response from Volc API');
}
