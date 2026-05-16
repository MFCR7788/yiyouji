import type { MembershipType } from '../types/user.js'
import { getCreditLimit } from './membership.js'

export function hasCredits(currentCredits: number, requiredCredits: number): boolean {
    return currentCredits >= requiredCredits
}

export function getMembershipCreditLimit(membershipType: MembershipType): number {
    return getCreditLimit(membershipType)
}

export function calculateRemainingCredits(currentCredits: number, cost: number): number {
    return Math.max(0, currentCredits - cost)
}

export function isCreditBalanceValid(aiChatCount: number | null): boolean {
    return aiChatCount !== null && aiChatCount >= 0 && Number.isFinite(aiChatCount)
}
