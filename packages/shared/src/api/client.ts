import type { ApiResponse, ApiClientConfig, RequestOptions } from './types.js'

export abstract class ApiClient {
    protected config: ApiClientConfig

    constructor(config: ApiClientConfig) {
        this.config = config
    }

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        const token = await this.config.getAccessToken()
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        return headers
    }

    abstract request<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>

    async get<T>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>(path, { method: 'GET' })
    }

    async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(path, { method: 'POST', body })
    }

    async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(path, { method: 'PUT', body })
    }

    async delete<T>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>(path, { method: 'DELETE' })
    }
}
