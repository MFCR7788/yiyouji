/**
 * 会员权限逻辑
 *
 * Free/Plus/Pro 三级会员体系
 * - Free: 基础功能，签到 10 积分/天
 * - Plus: 3个月 ¥98 或 6个月 ¥168
 * - Pro: 1年 ¥258
 */

import { requestBrowserJson, type BrowserApiError } from '@/lib/browser-api';

export type MembershipType = 'free' | 'plus' | 'pro';

export interface MembershipInfo {
    type: MembershipType;
    expiresAt: Date | null;
    isActive: boolean;
    aiChatCount: number;
}

type MembershipInfoPayload = {
    type?: MembershipType | null;
    expiresAt?: string | Date | null;
    isActive?: boolean | null;
    aiChatCount?: number | null;
};

export type MembershipLookupResult = {
    ok: true;
    info: MembershipInfo | null;
} | {
    ok: false;
    error: BrowserApiError;
};

export type MembershipInfoSource = {
    membership?: MembershipType | null;
    membership_expires_at?: string | null;
    ai_chat_count?: number | null;
};

export function normalizeMembershipInfo(input: MembershipInfoPayload | MembershipInfo | null): MembershipInfo | null {
    if (!input) {
        return null;
    }

    const membershipType = input.type === 'plus' || input.type === 'pro' ? input.type : 'free';
    const expiresAtRaw = input.expiresAt;
    const expiresAt = expiresAtRaw instanceof Date
        ? expiresAtRaw
        : typeof expiresAtRaw === 'string' && expiresAtRaw.length > 0
            ? new Date(expiresAtRaw)
            : null;
    const effectiveExpiresAt = membershipType === 'free' ? null : expiresAt;

    return {
        type: membershipType,
        expiresAt: effectiveExpiresAt && !Number.isNaN(effectiveExpiresAt.getTime()) ? effectiveExpiresAt : null,
        isActive: typeof input.isActive === 'boolean' ? input.isActive : membershipType === 'free' || effectiveExpiresAt === null || effectiveExpiresAt > new Date(),
        aiChatCount: typeof input.aiChatCount === 'number' ? input.aiChatCount : 0,
    };
}

/**
 * 判断付费会员是否已过期
 * free 用户永远返回 false（无过期概念）
 */
export function isMembershipExpired(source: {
    membership?: MembershipType | string | null;
    membership_expires_at?: string | null;
    expiresAt?: Date | null;
}): boolean {
    const type = (source.membership || 'free') as MembershipType;
    if (type === 'free') return false;
    const expiresAt = source.expiresAt
        ?? (source.membership_expires_at ? new Date(source.membership_expires_at) : null);
    return expiresAt !== null && expiresAt <= new Date();
}

export type PlanId = 'free' | 'plus' | 'plus_6m' | 'pro';

export interface PricingPlan {
    id: PlanId;
    name: string;
    price: number;
    originalPrice?: number;
    period: string;
    periodMonths: number;
    features: string[];
    popular?: boolean;
    badge?: string;
    creditLimit: number;
}

export const pricingPlans: PricingPlan[] = [
    {
        id: 'free',
        name: '免费版',
        price: 0,
        period: '永久',
        periodMonths: 0,
        features: [
            '基础命盘排盘',
            '每日/月运势预览',
            '塔罗牌、六爻、MBTI解读',
            '每日签到 +10 积分',
        ],
        creditLimit: 10,
    },
    {
        id: 'plus',
        name: 'Plus 会员',
        price: 98,
        originalPrice: 117,
        period: '3个月',
        periodMonths: 3,
        badge: '超值',
        features: [
            '全部免费版功能',
            '积分上限提升至 500',
            '更多 AI 模型支持',
            '全部 AI 分析功能',
            '知识库使用',
        ],
        popular: true,
        creditLimit: 500,
    },
    {
        id: 'plus_6m',
        name: 'Plus 会员',
        price: 168,
        originalPrice: 234,
        period: '6个月',
        periodMonths: 6,
        badge: '推荐',
        features: [
            '全部 Plus 功能',
            '每月均僅 ¥28',
            '更长时间享受会员权益',
        ],
        creditLimit: 500,
    },
    {
        id: 'pro',
        name: 'Pro 会员',
        price: 258,
        originalPrice: 468,
        period: '1年',
        periodMonths: 12,
        badge: '最划算',
        features: [
            '全部 Plus 功能',
            '积分上限提升至 1000',
            '获取更高级模型支持',
            '更精确的知识库',
            '每月均僅 ¥21.5',
        ],
        creditLimit: 1000,
    },
];

/**
 * 获取套餐配置
 */
export function getPlanConfig(type: PlanId): PricingPlan {
    return pricingPlans.find(p => p.id === type) || pricingPlans[0];
}

export function planIdToMembership(planId: PlanId): MembershipType {
    if (planId === 'plus' || planId === 'plus_6m') return 'plus';
    if (planId === 'pro') return 'pro';
    return 'free';
}

/**
 * 获取积分上限
 */
export function getCreditLimit(type: MembershipType): number {
    return getPlanConfig(type).creditLimit;
}

/**
 * 获取用户会员信息
 */
export async function getMembershipInfoResult(userId: string): Promise<MembershipLookupResult> {
    const result = await requestBrowserJson<{
        userId?: string | null;
        membership?: MembershipInfo | null;
    }>('/api/user/membership', {
        method: 'GET',
    });

    if (result.error) {
        return { ok: false, error: result.error };
    }

    const payloadUserId = result.data?.userId ?? null;
    if (!payloadUserId || payloadUserId !== userId) {
        return {
            ok: false,
            error: { message: '会员状态校验失败，请刷新后重试' },
        };
    }

    return {
        ok: true,
        info: normalizeMembershipInfo(result.data?.membership ?? null),
    };
}

/**
 * 获取用户会员信息
 */
export async function getMembershipInfo(userId: string): Promise<MembershipLookupResult> {
    return getMembershipInfoResult(userId);
}

export function buildMembershipInfo(source: MembershipInfoSource | null): MembershipInfo {
    if (!source) {
        return {
            type: 'free',
            expiresAt: null,
            isActive: true,
            aiChatCount: 0,
        };
    }

    const membershipType = source.membership ? (source.membership as MembershipType) : 'free';
    const aiChatCount = typeof source.ai_chat_count === 'number' ? source.ai_chat_count : 0;
    const expiresAt = source.membership_expires_at
        ? new Date(source.membership_expires_at)
        : null;

    let isActive = true;
    let effectiveType = membershipType;

    if (isMembershipExpired({ membership: membershipType, expiresAt })) {
        isActive = false;
        effectiveType = 'free';
    }

    return {
        type: effectiveType,
        expiresAt: effectiveType === 'free' ? null : expiresAt,
        isActive,
        aiChatCount,
    };
}
