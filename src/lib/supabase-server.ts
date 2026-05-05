/**
 * Supabase 服务端特权客户端
 * 
 * 使用 service_role key 绕过 RLS。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env';
import { configureGlobalProxy } from '@/lib/proxy-config';

configureGlobalProxy();

let serviceClient: SupabaseClient | null = null;
let authAdminClient: SupabaseClient | null = null;

export function getSystemAdminClient(): SupabaseClient {
    if (serviceClient) return serviceClient;

    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    
    const apiKey = serviceRoleKey || getSupabaseAnonKey();

    let fetchOptions: Record<string, unknown> | undefined;
    try {
        const { createProxyFetchOptions } = require('@/lib/proxy-fetch');
        fetchOptions = createProxyFetchOptions();
        if (fetchOptions) {
            console.log('[supabase-server] ✅ 使用代理配置的 fetch');
        }
    } catch {
    }

    serviceClient = createClient(url, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        ...fetchOptions,
    });

    return serviceClient;
}

export function getAuthAdminClient(): SupabaseClient | null {
    if (authAdminClient) return authAdminClient;

    const serviceRoleKey = getSupabaseServiceRoleKey();
    console.log('[supabase-server] getAuthAdminClient - serviceRoleKey available:', !!serviceRoleKey);
    console.log('[supabase-server] getAuthAdminClient - serviceRoleKey length:', serviceRoleKey?.length);
    
    if (!serviceRoleKey) {
        console.warn('[supabase-server] getAuthAdminClient - no serviceRoleKey available!');
        return null;
    }

    console.log('[supabase-server] getAuthAdminClient - creating client with serviceRoleKey');
    authAdminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    return authAdminClient;
}