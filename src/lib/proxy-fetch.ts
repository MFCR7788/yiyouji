/**
 * 带代理的 Fetch 封装
 * 
 * 为 Supabase 和其他需要自定义 fetch 的库提供代理支持
 */

let proxyAgent: any = null;

export function getProxyAgent(): any {
    if (!proxyAgent) {
        try {
            const { ProxyAgent } = require('undici');
            const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
            
            if (proxyUrl) {
                proxyAgent = new ProxyAgent(proxyUrl);
                console.log(`[proxy-fetch] ✅ 已创建 ProxyAgent: ${proxyUrl}`);
            }
        } catch (err) {
            console.warn('[proxy-fetch] ⚠️ 无法创建 ProxyAgent:', err instanceof Error ? err.message : err);
        }
    }
    
    return proxyAgent;
}

export function createProxyFetch(originalFetch: typeof fetch): typeof fetch {
    const agent = getProxyAgent();
    
    if (!agent) {
        return originalFetch;
    }
    
    const proxyFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
            // 为外部请求添加 dispatcher
            const options = { ...init, dispatcher: agent } as any;
            return originalFetch(input, options);
        }
        
        return originalFetch(input, init);
    };
    
    return proxyFetch as unknown as typeof fetch;
}

export function createProxyFetchOptions(): Record<string, unknown> | undefined {
    const agent = getProxyAgent();
    
    if (!agent) {
        return undefined;
    }
    
    return {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
            const options = { ...init, dispatcher: agent } as any;
            return globalThis.fetch(input, options);
        },
        global: {
            headers: {
                'User-Agent': 'yiyouji/1.0'
            }
        }
    };
}