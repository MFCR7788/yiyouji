/**
 * AI 模型配置
 *
 * 共享层不直接定义模型目录；模型本身应由数据库/后台维护。
 * 这里仅提供默认模型 ID、统一网关回退来源拼装，以及可选的环境变量回退模型。
 */

import type { AIModelConfig, AIModelSourceConfig, AIVendor } from '@/types';
import { buildManagedApiUrl, DEFAULT_AI_TRANSPORT, getModelUsageType } from './source-runtime';

type GatewaySourceEnv = {
  sourceKey: 'newapi' | 'octopus';
  sourceName: string;
  baseUrlEnvVar: 'NEWAPI_BASE_URL' | 'OCTOPUS_BASE_URL';
  apiKeyEnvVar: 'NEWAPI_API_KEY' | 'OCTOPUS_API_KEY';
  priority: number;
  isActive: boolean;
};

const GATEWAY_SOURCES: GatewaySourceEnv[] = [
  {
    sourceKey: 'newapi',
    sourceName: 'NewAPI',
    baseUrlEnvVar: 'NEWAPI_BASE_URL',
    apiKeyEnvVar: 'NEWAPI_API_KEY',
    priority: 1,
    isActive: true,
  },
  {
    sourceKey: 'octopus',
    sourceName: 'Octopus',
    baseUrlEnvVar: 'OCTOPUS_BASE_URL',
    apiKeyEnvVar: 'OCTOPUS_API_KEY',
    priority: 2,
    isActive: false,
  },
];

export function buildGatewaySourcesForModel(model: AIModelConfig): AIModelSourceConfig[] {
  const usageType = getModelUsageType(model);
  return GATEWAY_SOURCES.flatMap((gateway) => {
    const baseUrl = process.env[gateway.baseUrlEnvVar]?.trim();
    if (!baseUrl) {
      return [];
    }

    return [{
      sourceKey: gateway.sourceKey,
      sourceName: gateway.sourceName,
      apiUrl: buildManagedApiUrl(baseUrl, usageType),
      apiKeyEnvVar: gateway.apiKeyEnvVar,
      modelIdOverride: model.modelId || model.id,
      reasoningModelId: model.reasoningModelId || (model.supportsReasoning ? model.modelId || model.id : undefined),
      transport: DEFAULT_AI_TRANSPORT,
      priority: gateway.priority,
      isActive: gateway.isActive,
      isEnabled: true,
    }];
  });
}

export function attachGatewaySources(model: AIModelConfig): AIModelConfig {
  const sources = buildGatewaySourcesForModel(model);
  const primary = sources[0];
  if (!primary) {
    return {
      ...model,
      sources: [],
      transport: model.transport || DEFAULT_AI_TRANSPORT,
      apiUrl: model.apiUrl,
      apiKeyEnvVar: model.apiKeyEnvVar,
    };
  }

  return {
    ...model,
    modelId: primary.modelIdOverride || model.modelId,
    apiUrl: primary.apiUrl,
    apiKeyEnvVar: primary.apiKeyEnvVar,
    reasoningModelId: primary.reasoningModelId || model.reasoningModelId,
    sourceKey: primary.sourceKey,
    transport: primary.transport || DEFAULT_AI_TRANSPORT,
    sources,
  };
}

type EnvFallbackModel = Partial<AIModelConfig> & Pick<AIModelConfig, 'id' | 'vendor'>;

function normalizeEnvFallbackModel(input: EnvFallbackModel): AIModelConfig | null {
  if (!input.id || !input.vendor) {
    return null;
  }

  const usageType = input.usageType ?? (input.supportsVision ? 'vision' : 'chat');
  const normalized: AIModelConfig = {
    id: input.id,
    name: input.name || input.id,
    vendor: input.vendor as AIVendor,
    usageType,
    modelId: input.modelId || input.id,
    apiUrl: input.apiUrl || '',
    apiKeyEnvVar: input.apiKeyEnvVar || '',
    supportsReasoning: input.supportsReasoning ?? false,
    reasoningModelId: input.reasoningModelId,
    isReasoningDefault: input.isReasoningDefault ?? false,
    supportsVision: input.supportsVision ?? usageType === 'vision',
    defaultTemperature: input.defaultTemperature,
    defaultTopP: input.defaultTopP,
    defaultPresencePenalty: input.defaultPresencePenalty,
    defaultFrequencyPenalty: input.defaultFrequencyPenalty,
    defaultMaxTokens: input.defaultMaxTokens,
    defaultReasoningEffort: input.defaultReasoningEffort,
    reasoningEffortFormat: input.reasoningEffortFormat,
    customParameters: input.customParameters,
    requiredTier: input.requiredTier,
    reasoningRequiredTier: input.reasoningRequiredTier,
    sourceKey: input.sourceKey,
    transport: input.transport || DEFAULT_AI_TRANSPORT,
    sources: input.sources || [],
  };

  return attachGatewaySources(normalized);
}

function parseEnvFallbackModels(): AIModelConfig[] {
  const raw = process.env.MINGAI_FALLBACK_MODELS_JSON?.trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeEnvFallbackModel(entry as EnvFallbackModel))
      .filter((entry): entry is AIModelConfig => entry !== null);
  } catch (error) {
    console.warn('[ai-config] Failed to parse MINGAI_FALLBACK_MODELS_JSON:', error);
    return [];
  }
}

function createDefaultModels(): AIModelConfig[] {
  const models: AIModelConfig[] = [];

  // DeepSeek 聊天模型
  const deepseekChat = normalizeEnvFallbackModel({
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    vendor: 'deepseek',
    usageType: 'chat',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    supportsReasoning: false,
  });
  if (deepseekChat) models.push(deepseekChat);

  // DeepSeek V4 Flash 聊天模型
  const deepseekV4Flash = normalizeEnvFallbackModel({
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    vendor: 'deepseek',
    usageType: 'chat',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    supportsReasoning: true,
    isReasoningDefault: false,
  });
  if (deepseekV4Flash) models.push(deepseekV4Flash);

  // DeepSeek V4 Pro 聊天模型
  const deepseekV4Pro = normalizeEnvFallbackModel({
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    vendor: 'deepseek',
    usageType: 'chat',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    supportsReasoning: false,
  });
  if (deepseekV4Pro) models.push(deepseekV4Pro);

  // 豆包（火山引擎）视觉模型 - 用于面相、手相分析
  // 使用 Doubao Seed 2.0 Lite，专注于视觉分析任务
  // 使用 Responses API (/api/v3/responses)，支持图像输入
  const doubaoVision = normalizeEnvFallbackModel({
    id: 'doubao-vision',
    name: '豆包 Vision Lite (Seed 2.0)',
    vendor: 'volc',
    usageType: 'chat',
    supportsVision: true,
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    apiKeyEnvVar: 'VOLC_API_KEY',
    modelId: 'doubao-seed-2-0-lite-260215',
    apiFormat: 'volc-responses',
    supportsReasoning: false,
    isReasoningDefault: false,
  });
  if (doubaoVision) models.push(doubaoVision);

  return models;
}

// ===== 动态生成模型配置 =====

export function buildModels(): AIModelConfig[] {
  const envModels = parseEnvFallbackModels();
  
  // 检查环境变量配置是否有效（必须包含至少一个有效模型）
  const hasValidModels = envModels.length > 0;
  
  if (hasValidModels) {
    return envModels;
  }

  const isDevMode = process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true';
  
  if (isDevMode) {
    console.warn('[ai-config] No valid MINGAI_FALLBACK_MODELS_JSON env var found, using default dev models');
  } else {
    console.warn('[ai-config] No valid MINGAI_FALLBACK_MODELS_JSON env var found in production, using default models');
  }

  return createDefaultModels();
}

// 懒加载模型配置（环境变量）
let _models: AIModelConfig[] | null = null;

/**
 * 同步获取环境变量回退模型配置
 */
export function getModels(): AIModelConfig[] {
  if (_models === null) {
    _models = buildModels();
  }
  return _models;
}

export function clearModelCache(): void {
  _models = null;
  console.info('[ai-config] Model cache cleared');
}

export function getModelConfig(modelId: string): AIModelConfig | undefined {
  const models = getModels();
  return models.find((model) => model.id === modelId);
}

export const DEFAULT_MODEL_ID = 'deepseek-chat';
export const DEFAULT_VISION_MODEL_ID = 'doubao-vision';
export const DEFAULT_EMBEDDING_MODEL_ID = process.env.KNOWLEDGE_BASE_EMBEDDING_MODEL_ID || 'text-embedding-v4';
export const DEFAULT_RERANK_MODEL_ID = process.env.KNOWLEDGE_BASE_RERANK_MODEL_ID || 'qwen3-rerank';

export function getModelName(modelId: string): string {
  const model = getModelConfig(modelId);
  return model?.name || modelId;
}

export const VENDOR_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  glm: 'GLM',
  gemini: 'Gemini',
  'gemini-vl': 'Gemini',
  qwen: 'Qwen',
  'qwen-vl': 'Qwen',
  moonshot: 'Moonshot',
  xai: 'xAI',
  minimax: 'MiniMax',
  volc: '火山引擎（豆包）',
};

export function getVendorName(vendor: string): string {
  return VENDOR_NAMES[vendor] ?? vendor;
}

/** 管理后台 vendor 下拉预设（从 VENDOR_NAMES 派生） */
export const VENDOR_PRESETS = Object.keys(VENDOR_NAMES) as readonly string[];
