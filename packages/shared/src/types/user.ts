export type MembershipType = 'free' | 'plus' | 'pro'

export type PlanId = 'free' | 'plus' | 'plus_6m' | 'pro'

export interface MembershipInfo {
    type: MembershipType
    expiresAt: Date | null
    isActive: boolean
    aiChatCount: number
}

export interface PricingPlan {
    id: PlanId
    name: string
    price: number
    originalPrice?: number
    period: string
    periodMonths: number
    features: string[]
    popular?: boolean
    badge?: string
    creditLimit: number
    creditReward: number
}

export interface PlanAvailability {
    available: boolean
    reason?: string
    canUpgrade?: boolean
}

export type MembershipInfoSource = {
    membership: string | null
    membership_expires_at: string | null
    ai_chat_count: number | null
}

export type UserStateResolutionErrorCode =
    | 'USER_QUERY_FAILED'
    | 'USER_ROW_MISSING'
    | 'INVALID_CREDIT_BALANCE'

export type CreditUseAttemptResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: 'insufficient_credits' | 'deduction_failed' }
