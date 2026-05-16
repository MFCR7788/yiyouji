import { ApiClient } from './client.js'
import type { ApiResponse, ApiClientConfig, RequestOptions } from './types.js'

declare const wx: {
    request(params: {
        url: string
        method: string
        header?: Record<string, string>
        data?: unknown
    }): Promise<{ statusCode: number; data: unknown }>
}

export class MiniappApiClient extends ApiClient {
    constructor(config: ApiClientConfig) {
        super(config)
    }

    async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const { method = 'GET', body } = options
        const url = `${this.config.baseUrl}${path}`
        const headers = await this.getAuthHeaders()

        try {
            const response = await wx.request({
                url,
                method,
                header: { ...headers, ...options.headers },
                data: body,
            })

            if (response.statusCode === 401 && this.config.onUnauthorized) {
                this.config.onUnauthorized()
            }

            const json = response.data as Record<string, unknown>

            return {
                data: (json.data ?? json) as T | null,
                error: (json.error ?? null) as ApiResponse<T>['error'],
                count: (json.count ?? null) as number | null,
                status: response.statusCode,
                statusText: '',
            }
        } catch (error) {
            return {
                data: null,
                error: { message: error instanceof Error ? error.message : 'Network error' },
                status: 0,
            }
        }
    }
}
