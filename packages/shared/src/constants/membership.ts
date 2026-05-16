import type { MembershipType, PlanId, PricingPlan } from '../types/user.js'

export const MEMBERSHIP_TIERS: Record<MembershipType, number> = {
    free: 0,
    plus: 1,
    pro: 2,
} as const

export const pricingPlans: PricingPlan[] = [
    {
        id: 'free',
        name: '免费版',
        price: 0,
        period: '永久',
        periodMonths: 0,
        features: ['基础占卜', '每日签到', '社区浏览'],
        creditLimit: 10,
        creditReward: 0,
    },
    {
        id: 'plus',
        name: 'Plus 会员',
        price: 98,
        originalPrice: 128,
        period: '3个月',
        periodMonths: 3,
        features: ['所有占卜', 'AI 深度解读', '优先体验新功能', '500 积分上限'],
        popular: true,
        badge: '热门',
        creditLimit: 500,
        creditReward: 200,
    },
    {
        id: 'plus_6m',
        name: 'Plus 会员',
        price: 168,
        originalPrice: 256,
        period: '6个月',
        periodMonths: 6,
        features: ['所有占卜', 'AI 深度解读', '优先体验新功能', '500 积分上限'],
        creditLimit: 500,
        creditReward: 500,
    },
    {
        id: 'pro',
        name: 'Pro 会员',
        price: 258,
        originalPrice: 388,
        period: '1年',
        periodMonths: 12,
        features: ['所有占卜', 'AI 深度解读', '专属模型', '1000 积分上限', '知识库'],
        badge: '最划算',
        creditLimit: 1000,
        creditReward: 1200,
    },
]

export const PLAN_ID_TO_MEMBERSHIP: Record<PlanId, MembershipType> = {
    free: 'free',
    plus: 'plus',
    plus_6m: 'plus',
    pro: 'pro',
}
