export type DataSourceType =
    | 'bazi_chart'
    | 'ziwei_chart'
    | 'tarot_reading'
    | 'liuyao_divination'
    | 'mbti_reading'
    | 'hepan_chart'
    | 'face_reading'
    | 'palm_reading'
    | 'ming_record'
    | 'daily_fortune'
    | 'monthly_fortune'
    | 'qimen_chart'
    | 'daliuren_divination'

export type ConversationSourceType =
    | 'chat'
    | 'bazi_wuxing'
    | 'bazi_personality'
    | 'tarot'
    | 'liuyao'
    | 'mbti'
    | 'hepan'
    | 'palm'
    | 'face'
    | 'dream'
    | 'qimen'
    | 'daliuren'
    | 'ziwei'

export type FeatureUsageBucket =
    | 'chat'
    | 'bazi'
    | 'ziwei'
    | 'liuyao'
    | 'tarot'
    | 'palm'
    | 'face'
    | 'mbti'
    | 'hepan'
    | 'fortune'
    | 'dream'
    | 'qimen'
    | 'daliuren'

export type AnalysisSourceType = Exclude<ConversationSourceType, 'dream'>

export type FeatureModuleId =
    | 'bazi' | 'hepan' | 'ziwei' | 'tarot' | 'liuyao' | 'qimen' | 'daliuren'
    | 'face' | 'palm' | 'mbti' | 'chat' | 'daily' | 'monthly' | 'records'
    | 'community' | 'knowledge-base' | 'mcp-service' | 'checkin' | 'credits'
    | 'charts' | 'ai-personalization' | 'notifications' | 'upgrade' | 'help'

export interface DataSourceSummary {
    id: string
    type: DataSourceType
    name: string
    preview: string
    createdAt: string
    hepanType?: 'love' | 'business' | 'family'
}

export interface CommonAnalysisSourceData {
    schema_version?: 1
    question?: string | null
    model_id?: string | null
    reasoning?: boolean | null
    reasoning_text?: string | null
    [key: string]: unknown
}
