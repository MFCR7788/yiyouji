import type { MembershipType, PlanId, PlanAvailability } from '../types/user.js'
import { MEMBERSHIP_TIERS } from '../constants/membership.js'
import { planIdToMembership, getPlanConfig } from './membership.js'

export function checkPlanAvailability(
    targetPlanId: PlanId,
    currentMembershipType?: MembershipType | null,
): PlanAvailability {
    if (!currentMembershipType || currentMembershipType === 'free') {
        return { available: true, canUpgrade: true }
    }

    const currentTier = MEMBERSHIP_TIERS[currentMembershipType] || 0
    const targetMembership = planIdToMembership(targetPlanId)
    const targetMembershipTier = MEMBERSHIP_TIERS[targetMembership] || 0

    if (targetMembershipTier >= currentTier) {
        return { available: true, canUpgrade: targetMembershipTier > currentTier }
    }

    const currentPlanName = currentMembershipType === 'pro' ? 'Pro 会员' : 'Plus 会员'
    const targetPlan = getPlanConfig(targetPlanId)
    const targetPlanName = `${targetPlan.name}(${targetPlan.period})`

    return {
        available: false,
        reason: `您当前已是${currentPlanName}，无法购买${targetPlanName}`,
        canUpgrade: false,
    }
}

export function getAllPlansAvailability(currentMembershipType?: MembershipType | null): Record<PlanId, PlanAvailability> {
    const planIds: PlanId[] = ['free', 'plus', 'plus_6m', 'pro']
    const result = {} as Record<PlanId, PlanAvailability>
    for (const planId of planIds) {
        result[planId] = checkPlanAvailability(planId, currentMembershipType)
    }
    return result
}
