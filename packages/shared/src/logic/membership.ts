import type { MembershipType, MembershipInfo, MembershipInfoSource, PlanId } from '../types/user.js'
import { MEMBERSHIP_TIERS, PLAN_ID_TO_MEMBERSHIP, pricingPlans } from '../constants/membership.js'

export function normalizeMembershipInfo(raw: MembershipInfoSource): MembershipInfo {
    const type = (raw.membership as MembershipType) || 'free'
    const expiresAt = raw.membership_expires_at ? new Date(raw.membership_expires_at) : null
    const isActive = type === 'free' || (expiresAt !== null && expiresAt.getTime() > Date.now())
    return {
        type,
        expiresAt,
        isActive,
        aiChatCount: raw.ai_chat_count ?? 0,
    }
}

export function isMembershipExpired(membership: MembershipInfo): boolean {
    if (membership.type === 'free') return false
    if (!membership.expiresAt) return true
    return membership.expiresAt.getTime() <= Date.now()
}

export function planIdToMembership(planId: PlanId): MembershipType {
    return PLAN_ID_TO_MEMBERSHIP[planId] || 'free'
}

export function getPlanConfig(planId: PlanId) {
    return pricingPlans.find(p => p.id === planId) || pricingPlans[0]
}

export function getCreditLimit(membershipType: MembershipType): number {
    const tier = MEMBERSHIP_TIERS[membershipType] || 0
    if (tier >= 2) return 1000
    if (tier >= 1) return 500
    return 10
}

export function getCreditReward(planId: PlanId): number {
    return getPlanConfig(planId).creditReward
}

export function buildMembershipInfo(
    membership: string | null,
    membershipExpiresAt: string | null,
    aiChatCount: number | null,
): MembershipInfo {
    return normalizeMembershipInfo({
        membership,
        membership_expires_at: membershipExpiresAt,
        ai_chat_count: aiChatCount,
    })
}
