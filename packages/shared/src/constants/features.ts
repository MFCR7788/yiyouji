import type { FeatureModuleId } from '../types/divination.js'

export const FEATURE_MODULE_IDS: FeatureModuleId[] = [
    'bazi', 'hepan', 'ziwei', 'tarot', 'liuyao', 'qimen', 'daliuren',
    'face', 'palm', 'mbti', 'chat', 'daily', 'monthly', 'records',
    'community', 'knowledge-base', 'mcp-service', 'checkin', 'credits',
    'charts', 'ai-personalization', 'notifications', 'upgrade', 'help',
]

export const FEATURE_MODULE_LABELS: Record<FeatureModuleId, string> = {
    bazi: '八字排盘',
    hepan: '八字合盘',
    ziwei: '紫微斗数',
    tarot: '塔罗占卜',
    liuyao: '六爻占卜',
    qimen: '奇门遁甲',
    daliuren: '大六壬',
    face: '面相分析',
    palm: '手相分析',
    mbti: 'MBTI 测试',
    chat: 'AI 对话',
    daily: '日运',
    monthly: '月运',
    records: '命理记录',
    community: '社区',
    'knowledge-base': '知识库',
    'mcp-service': 'MCP 服务',
    checkin: '签到',
    credits: '积分',
    charts: '命盘管理',
    'ai-personalization': 'AI 个性化',
    notifications: '通知',
    upgrade: '会员升级',
    help: '帮助',
}
