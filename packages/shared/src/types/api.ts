export interface ApiResponse<T = unknown> {
    data: T | null
    error: ApiError | null
    count?: number | null
    status?: number
    statusText?: string
}

export interface ApiError {
    message: string
    code?: string
}

export interface ApiClientConfig {
    baseUrl: string
    getAccessToken: () => Promise<string | null>
    onUnauthorized?: () => void
}
