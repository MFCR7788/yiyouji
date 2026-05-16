import type { ConversationSourceType, FeatureUsageBucket, AnalysisSourceType } from '../types/divination.js'

export const CONVERSATION_SOURCE_TYPES: ConversationSourceType[] = [
    'chat', 'bazi_wuxing', 'bazi_personality', 'tarot', 'liuyao',
    'mbti', 'hepan', 'palm', 'face', 'dream', 'qimen', 'daliuren', 'ziwei',
]

export const ARCHIVED_SOURCE_TYPES: ConversationSourceType[] = [
    'bazi_wuxing', 'bazi_personality', 'tarot', 'liuyao',
    'mbti', 'hepan', 'palm', 'face', 'qimen', 'daliuren', 'ziwei',
]

export const ANALYSIS_SOURCE_TYPES: AnalysisSourceType[] = [
    'chat', 'bazi_wuxing', 'bazi_personality', 'tarot', 'liuyao',
    'mbti', 'hepan', 'palm', 'face', 'qimen', 'daliuren', 'ziwei',
]

export const SOURCE_TYPE_TO_BUCKET: Record<ConversationSourceType, FeatureUsageBucket> = {
    chat: 'chat',
    bazi_wuxing: 'bazi',
    bazi_personality: 'bazi',
    ziwei: 'ziwei',
    liuyao: 'liuyao',
    tarot: 'tarot',
    palm: 'palm',
    face: 'face',
    mbti: 'mbti',
    hepan: 'hepan',
    dream: 'dream',
    qimen: 'qimen',
    daliuren: 'daliuren',
}
