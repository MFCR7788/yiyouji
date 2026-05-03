/**
 * 全局代理配置
 * 
 * 为 Node.js 18+ 的原生 fetch 配置 HTTP/HTTPS 代理
 * 使用 undici ProxyAgent 实现
 */

let proxyConfigured = false;

export function configureGlobalProxy(): void {
    if (proxyConfigured) return;
    
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    
    if (!httpProxy && !httpsProxy) {
        console.log('[proxy] 未检测到代理环境变量，跳过代理配置');
        return;
    }
    
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        
        const proxyUrl = httpsProxy || httpProxy;
        
        const dispatcher = new ProxyAgent(proxyUrl);
        setGlobalDispatcher(dispatcher);
        
        proxyConfigured = true;
        console.log(`[proxy] ✅ 已配置全局代理: ${proxyUrl}`);
    } catch (err) {
        console.warn('[proxy] ⚠️ 无法加载 undici，代理可能不生效:', err instanceof Error ? err.message : err);
        console.warn('[proxy] 提示: 运行 npm install undici 以启用代理支持');
    }
}

export function isProxyConfigured(): boolean {
    return proxyConfigured;
}

// 自动执行（在模块加载时）
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    configureGlobalProxy();
}