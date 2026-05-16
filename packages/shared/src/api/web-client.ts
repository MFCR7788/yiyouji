import { ApiClient } from './client.js'
import type { ApiResponse, ApiClientConfig, RequestOptions } from './types.js'

export class WebApiClient extends ApiClient {
    constructor(config: ApiClientConfig) {
        super(config)
    }

    async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const { method = 'GET', body, signal } = options
        const url = `${this.config.baseUrl}${path}`
        const headers = await this.getAuthHeaders()

        try {
            const response = await fetch(url, {
                method,
                headers: { ...headers, ...options.headers },
                body: body ? JSON.stringify(body) : undefined,
                signal,
            })

            if (response.status === 401 && this.config.onUnauthorized) {
                this.config.onUnauthorized()
            }

            const json = (await response.json()) as Record<string, unknown>

            return {
                data: (json.data ?? json) as T | null,
                error: (json.error ?? null) as ApiResponse<T>['error'],
                count: (json.count ?? null) as number | null,
                status: response.status,
                statusText: response.statusText,
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
