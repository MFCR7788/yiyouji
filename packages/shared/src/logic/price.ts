import type { PlanId } from '../types/user.js'
import { pricingPlans } from '../constants/membership.js'

export function calculateMonthlyPrice(planId: PlanId): number {
    const plan = pricingPlans.find(p => p.id === planId)
    if (!plan || plan.periodMonths === 0) return 0
    return Math.round((plan.price / plan.periodMonths) * 10) / 10
}

export function calculateSavingsPercent(planId: PlanId): number {
    const plan = pricingPlans.find(p => p.id === planId)
    if (!plan || !plan.originalPrice) return 0
    return Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
}
