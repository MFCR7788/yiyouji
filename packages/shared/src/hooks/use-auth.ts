import { useState, useCallback } from 'react'

interface AuthUser {
    id: string
    email?: string
    phone?: string
    nickname?: string
    avatar_url?: string
}

interface AuthState {
    user: AuthUser | null
    accessToken: string | null
    isAuthenticated: boolean
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        accessToken: null,
        isAuthenticated: false,
    })

    const setAuth = useCallback((user: AuthUser | null, accessToken: string | null) => {
        setAuthState({
            user,
            accessToken,
            isAuthenticated: !!user && !!accessToken,
        })
    }, [])

    const logout = useCallback(() => {
        setAuthState({
            user: null,
            accessToken: null,
            isAuthenticated: false,
        })
    }, [])

    return {
        ...authState,
        setAuth,
        logout,
    }
}
