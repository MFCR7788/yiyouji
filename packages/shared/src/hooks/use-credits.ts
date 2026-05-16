import { useState, useCallback } from 'react'
import type { ApiClient } from '../api/client.js'
import { hasCredits } from '../logic/credits.js'

export function useCredits(apiClient: ApiClient | null) {
    const [credits, setCredits] = useState<number>(0)
    const [loading, setLoading] = useState(false)

    const fetchCredits = useCallback(async () => {
        if (!apiClient) return
        setLoading(true)
        try {
            const response = await apiClient.get<{ ai_chat_count: number }>('/api/user/profile')
            if (response.data) {
                setCredits(response.data.ai_chat_count)
            }
        } catch { /* ignore */ }
        setLoading(false)
    }, [apiClient])

    const canAfford = useCallback((cost: number): boolean => {
        return hasCredits(credits, cost)
    }, [credits])

    return {
        credits,
        loading,
        refresh: fetchCredits,
        canAfford,
    }
}
