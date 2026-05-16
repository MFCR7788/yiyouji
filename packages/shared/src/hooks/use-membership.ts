import { useState, useEffect, useCallback } from 'react'
import type { MembershipInfo, PlanId, PlanAvailability } from '../types/user.js'
import type { ApiClient } from '../api/client.js'
import { checkPlanAvailability, getAllPlansAvailability } from '../logic/plan-availability.js'

export function useMembership(apiClient: ApiClient | null) {
    const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchMembership = useCallback(async () => {
        if (!apiClient) return
        try {
            const response = await apiClient.get<MembershipInfo>('/api/user/membership')
            if (response.data) {
                setMembershipInfo(response.data)
            }
        } catch { /* ignore */ }
        setLoading(false)
    }, [apiClient])

    useEffect(() => {
        void fetchMembership() // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch
    }, [fetchMembership])

    const checkAvailability = useCallback((planId: PlanId): PlanAvailability => {
        return checkPlanAvailability(planId, membershipInfo?.type)
    }, [membershipInfo])

    const allPlansAvailability = useCallback((): Record<PlanId, PlanAvailability> => {
        return getAllPlansAvailability(membershipInfo?.type)
    }, [membershipInfo])

    return {
        membershipInfo,
        loading,
        refresh: fetchMembership,
        checkAvailability,
        allPlansAvailability,
    }
}
