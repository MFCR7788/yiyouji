/**
 * Supabase 服务端特权客户端
 *
 * 不再依赖 service role key：
 * 使用 anon key + 系统管理员会话 access token（RLS + admin policy）。
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseAuthAdminKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env';
import { configureGlobalProxy } from '@/lib/proxy-config';

// 在创建任何客户端之前配置代理
configureGlobalProxy();

let serviceClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;
let authAdminClient: SupabaseClient | null = null;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let tokenPromise: Promise<string | null> | null = null;
let hasWarnedMissingSystemSession = false;
const SYSTEM_ADMIN_SESSION_REQUIRED = process.env.NODE_ENV === 'production';
import { IS_NODE_TEST_RUNTIME } from '@/lib/runtime';
const MISSING_SYSTEM_ADMIN_CREDENTIALS_ERROR = 'Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD';

function getSystemAuthClient(): SupabaseClient {
    if (authClient) return authClient;

    authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return authClient;
}

async function signInSystemAdmin(): Promise<Session | null> {
    const email = process.env.SUPABASE_SYSTEM_ADMIN_EMAIL;
    const password = process.env.SUPABASE_SYSTEM_ADMIN_PASSWORD;

    if (!email || !password) {
        if (SYSTEM_ADMIN_SESSION_REQUIRED) {
            throw new Error(MISSING_SYSTEM_ADMIN_CREDENTIALS_ERROR);
        }
        return null;
    }

    const client = getSystemAuthClient();
    
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
        setTimeout(() => {
            reject(new Error('Sign in timeout'));
        }, 10000);
    });

    try {
        const { data, error } = await Promise.race([
            client.auth.signInWithPassword({ email, password }),
            timeoutPromise,
        ]);

        if (error || !data.session) {
            if (SYSTEM_ADMIN_SESSION_REQUIRED) {
                throw new Error('[supabase-server] Failed to sign in system admin session');
            }
            console.error('[supabase-server] Failed to sign in system admin:', error);
            return null;
        }

        return data.session;
    } catch (err) {
        if (SYSTEM_ADMIN_SESSION_REQUIRED) {
            throw new Error('[supabase-server] Failed to sign in system admin session: ' + (err as Error).message);
        }
        console.error('[supabase-server] Failed to sign in system admin (timeout):', err);
        return null;
    }
}

async function getSystemAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessTokenExpiresAt - now > 60_000) {
        return cachedAccessToken;
    }

    if (tokenPromise) return tokenPromise;

    tokenPromise = (async () => {
        try {
            const session = await signInSystemAdmin();
            if (!session) return null;

            cachedAccessToken = session.access_token;
            cachedAccessTokenExpiresAt = (session.expires_at ?? Math.floor(now / 1000) + 3000) * 1000;
            return cachedAccessToken;
        } catch (err) {
            console.error('[supabase-server] Failed to get system access token:', err);
            return null;
        }
    })();

    try {
        return await tokenPromise;
    } finally {
        tokenPromise = null;
    }
}

/**
 * 获取服务端 Supabase 客户端（系统管理员会话）
 * 使用单例避免重复构建；优先使用 service_role key 绕过 RLS。
 */
export function getSystemAdminClient(): SupabaseClient {
    if (serviceClient) return serviceClient;

    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    
    // 优先使用 service_role key（可以绕过 RLS）
    const apiKey = serviceRoleKey || getSupabaseAnonKey();

    // 尝试创建带代理的 fetch 选项
    let fetchOptions: Record<string, unknown> | undefined;
    try {
        const { createProxyFetchOptions } = require('@/lib/proxy-fetch');
        fetchOptions = createProxyFetchOptions();
        if (fetchOptions) {
            console.log('[supabase-server] ✅ 使用代理配置的 fetch');
        }
    } catch {
        // 代理模块不可用，使用默认配置
    }

    serviceClient = createClient(url, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        ...fetchOptions,
    });

    return serviceClient;
}

/**
 * 获取专用 Auth 管理客户端。
 * 仅用于 auth.admin.* 管理接口，避免与 accessToken 客户端职责混淆。
 */
export function getAuthAdminClient(): SupabaseClient | null {
    if (authAdminClient) return authAdminClient;

    const adminKey = getSupabaseAuthAdminKey();
    if (!adminKey) {
        return null;
    }

    authAdminClient = createClient(getSupabaseUrl(), adminKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    return authAdminClient;
}
