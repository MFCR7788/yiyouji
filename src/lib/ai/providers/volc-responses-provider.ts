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
    status?: string;
}

export interface VolcResponseResult {
    output: VolcResponseOutputItem[];
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

    const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Volc API error: ${response.status} - ${errorText}`);
    }

    const result: VolcResponseResult = await response.json();
    
    // 解析响应：从 output 中找到 reasoning 类型，然后提取 summary 中的文本
    for (const item of result.output || []) {
        if (item.summary && item.summary.length > 0) {
            const textItem = item.summary.find(s => s.type === 'summary_text' || s.text);
            if (textItem?.text) {
                return textItem.text;
            }
        }
    }

    throw new Error('Empty response from Volc API');
}