/**
 * 用户积分/次数管理模块
 * 
 * 使用服务端 Supabase 客户端绕过 RLS
 * 注意：积分存储在 users 表的 ai_chat_count 字段
 * 
 * 当前规则：
 * - 积分余额存储在 users.ai_chat_count
 * - 会员只决定上限（Free 10 / Plus 20 / Pro 50）
 * - 定时恢复已取消，积分主要来自签到、激活码与退款
 */

import { type MembershipType, getPlanConfig, isMembershipExpired } from './membership';
import { getSystemAdminClient } from '@/lib/api-utils';
import { ensureUserRecordRow } from '@/lib/user/profile-record';

/**
 * 验证 UUID 格式（PostgreSQL RPC 函数要求）
 */
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

type CreditReaderClient = Pick<ReturnType<typeof getSystemAdminClient>, 'from'>;
type CreditQueryOptions = {
    client?: CreditReaderClient;
    user?: Parameters<typeof ensureUserRecordRow>[1];
};

export type UserStateResolutionErrorCode =
    | 'USER_QUERY_FAILED'
    | 'USER_ROW_MISSING'
    | 'INVALID_CREDIT_BALANCE';

export class UserStateResolutionError extends Error {
    code: UserStateResolutionErrorCode;

    constructor(message: string, code: UserStateResolutionErrorCode, options?: { cause?: unknown }) {
        super(message);
        this.name = 'UserStateResolutionError';
        this.code = code;
        if (options && 'cause' in options) {
            Object.defineProperty(this, 'cause', {
                value: options.cause,
                enumerable: false,
                configurable: true,
                writable: true,
            });
        }
    }
}

function resolveMembershipType(rawMembership: MembershipType | null | undefined, expiresAt: Date | null): MembershipType {
    const membership = rawMembership === 'plus' || rawMembership === 'pro' ? rawMembership : 'free';
    if (isMembershipExpired({ membership, expiresAt })) {
        return 'free';
    }
    return membership;
}

/**
 * 一次查询获取用户积分 + 有效会员类型
 * 合并 hasCredits + getEffectiveMembershipType，减少重复 DB 查询
 */
export async function getUserAuthInfo(
    userId: string,
    options?: CreditQueryOptions,
): Promise<{
    credits: number;
    effectiveMembership: MembershipType;
    hasCredits: boolean;
}> {
    const info = await getUserCreditInfo(userId, options);
    return {
        credits: info.credits,
        effectiveMembership: info.membership, // getUserCreditInfo 已处理过期降级
        hasCredits: info.credits > 0,
    };
}

/**
 * 获取用户完整信息（积分 + 会员类型 + 恢复时间）
 */
export async function getUserCreditInfo(
    userId: string,
    options?: CreditQueryOptions,
): Promise<{
    credits: number;
    membership: MembershipType;
    expiresAt: Date | null;
}> {
    const supabase = options?.client ?? getSystemAdminClient();
    const loadUserRow = async () => await supabase
        .from('users')
        .select('ai_chat_count, membership, membership_expires_at')
        .eq('id', userId)
        .maybeSingle();

    let { data, error } = await loadUserRow();

    if (error) {
        console.error('[credits] Failed to get user info:', error.message);
        throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'USER_QUERY_FAILED', { cause: error });
    }

    if (!data && options?.user) {
        const recoveryProbe = supabase.from('users');
        if (typeof recoveryProbe.upsert !== 'function') {
            throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'USER_ROW_MISSING');
        }
        const ensured = await ensureUserRecordRow(supabase, options.user);
        if (ensured.ok) {
            const reloadResult = await loadUserRow();
            data = reloadResult.data;
            error = reloadResult.error;
        } else {
            throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'USER_ROW_MISSING', {
                cause: ensured.error,
            });
        }
    }

    if (error) {
        console.error('[credits] Failed to recover user row for auth info:', error);
        throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'USER_QUERY_FAILED', { cause: error });
    }

    if (!data) {
        console.error('[credits] Missing user row for auth info:', userId);
        throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'USER_ROW_MISSING');
    }

    if (typeof data.ai_chat_count !== 'number' || Number.isNaN(data.ai_chat_count)) {
        console.error('[credits] Invalid ai_chat_count for user:', userId, data.ai_chat_count);
        throw new UserStateResolutionError('加载账户状态失败，请稍后重试', 'INVALID_CREDIT_BALANCE');
    }

    // 检查会员是否过期
    const expiresAt = data.membership_expires_at ? new Date(data.membership_expires_at) : null;
    const membership = resolveMembershipType(data.membership as MembershipType | null | undefined, expiresAt);

    return {
        credits: data.ai_chat_count,
        membership,
        expiresAt,
    };
}

/**
 * 获取用户积分（从 users 表读取 ai_chat_count）
 */
async function getCredits(userId: string): Promise<number> {
    const info = await getUserCreditInfo(userId);
    return info?.credits ?? 0;
}

/**
 * 消耗一次积分（简化逻辑，使用 RPC 或直接扣减）
 * @param userId 用户 ID
 * @param amount 扣减的积分数量，默认为 1
 * @returns 成功返回剩余积分，失败返回 null
 */
export async function useCredit(userId: string, amount = 1): Promise<number | null> {
    const result = await runCreditDecrement(userId, amount);
    return result.status === 'ok' ? result.remaining : null;
}

export type CreditUseAttemptResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: 'insufficient_credits' | 'deduction_failed' };

async function getCreditsModuleExports() {
    return await import('@/lib/user/credits');
}

async function runCreditDecrement(userId: string, amount = 1): Promise<
    | { status: 'ok'; remaining: number }
    | { status: 'no_change' }
    | { status: 'rpc_error'; errorDetail?: string }
> {
    const supabase = getSystemAdminClient();
    
    try {
        let { data, error } = await supabase
            .rpc('decrement_ai_chat_count', { user_id: userId, amount: amount });

        if (error) {
            console.warn('[credits] RPC decrement with amount failed, trying legacy version:', error.message);
            
            // 回退到旧版本（只接受 user_id 参数，固定扣减1积分）
            if (amount === 1) {
                const legacyResult = await supabase
                    .rpc('decrement_ai_chat_count', { user_id: userId });
                
                if (legacyResult.error) {
                    console.error('[credits] Legacy RPC decrement failed:', legacyResult.error.message);
                    return await runCreditDecrementDirect(userId, amount, `Legacy RPC: ${legacyResult.error.message}`);
                }
                
                if (typeof legacyResult.data === 'number') {
                    console.log(`[credits] Legacy RPC decrement successful: userId=${userId.substring(0, 8)}..., amount=1, remaining=${legacyResult.data}`);
                    return {
                        status: 'ok',
                        remaining: legacyResult.data,
                    };
                }
                
                return { status: 'no_change' };
            }
            
            // amount > 1 时，旧版本不支持，直接使用直接更新方式
            console.warn('[credits] amount > 1 but legacy RPC only supports 1, falling back to direct');
            return await runCreditDecrementDirect(userId, amount, `RPC version mismatch: amount=${amount}`);
        }

        if (typeof data === 'number') {
            console.log(`[credits] RPC decrement successful: userId=${userId.substring(0, 8)}..., amount=${amount}, remaining=${data}`);
            return {
                status: 'ok',
                remaining: data,
            };
        }

        return { status: 'no_change' };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[credits] RPC call exception:', errMsg);
        return await runCreditDecrementDirect(userId, amount, `Exception: ${errMsg}`);
    }
}

async function runCreditDecrementDirect(
    userId: string,
    amount = 1,
    fallbackReason?: string
): Promise<
    | { status: 'ok'; remaining: number }
    | { status: 'no_change' }
    | { status: 'rpc_error'; errorDetail?: string }
> {
    const supabase = getSystemAdminClient();
    
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ ai_chat_count: { '-': amount } })
            .eq('id', userId)
            .gte('ai_chat_count', amount)
            .select('ai_chat_count')
            .maybeSingle();

        if (error) {
            console.error('[credits] Direct decrement failed:', error.message, error.code);
            
            if (error.message?.includes('fetch failed') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
                return { 
                    status: 'rpc_error', 
                    errorDetail: `网络错误: ${error.message}。请检查 Supabase 连接或代理设置。`
                };
            }
            
            return { status: 'rpc_error', errorDetail: fallbackReason || error.message };
        }

        if (data && typeof data.ai_chat_count === 'number') {
            console.log(`[credits] Direct decrement successful: userId=${userId.substring(0, 8)}..., amount=${amount}, remaining=${data.ai_chat_count}`);
            return {
                status: 'ok',
                remaining: data.ai_chat_count,
            };
        }

        return { status: 'no_change' };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[credits] Direct decrement exception:', errMsg);
        
        if (errMsg.includes('fetch failed') || errMsg.includes('network') || errMsg.includes('ECONNREFUSED')) {
            return { 
                status: 'rpc_error', 
                errorDetail: `网络连接失败: ${errMsg}。请检查 Supabase 连接配置。`
            };
        }
        
        return { status: 'rpc_error', errorDetail: fallbackReason || errMsg };
    }
}

export async function attemptCreditUse(
    userId: string,
    amountOrOptions: number | CreditQueryOptions = 1,
    options?: CreditQueryOptions,
): Promise<CreditUseAttemptResult & { detail?: string }> {
    
    // 处理向后兼容的参数
    let amount: number;
    let actualOptions: CreditQueryOptions | undefined;
    
    if (typeof amountOrOptions === 'number') {
        amount = amountOrOptions;
        actualOptions = options;
    } else {
        amount = 1;
        actualOptions = amountOrOptions;
    }
    
    // 开发模式：检测 dev-user ID，跳过真实积分扣减
    const isDevUser = userId.startsWith('dev-user-') || userId === 'dev-user-id';
    const isDevMode = process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true';
    
    if (isDevUser && isDevMode) {
        console.log(`[credits] 开发模式: 跳过 dev-user 积分扣减 [userId=${userId}]`);
        return { 
            ok: true, 
            remaining: 999, 
            detail: '开发模式: 模拟积分扣减成功'
        };
    }
    
    // 验证 UUID 格式（PostgreSQL RPC 函数要求）
    if (!isDevUser && !isValidUUID(userId)) {
        console.error(`[credits] 无效的 UUID 格式 [userId=${userId}]`);
        return { 
            ok: false, 
            reason: 'deduction_failed',
            detail: `无效的用户ID格式: ${userId.substring(0, 20)}...`
        };
    }
    
    // 验证积分数量
    if (!Number.isInteger(amount) || amount <= 0) {
        return { 
            ok: false, 
            reason: 'deduction_failed',
            detail: `无效的积分扣减数量: ${amount}`
        };
    }
    
    const decrementResult = await runCreditDecrement(userId, amount);
    
    if (decrementResult.status === 'ok') {
        return { ok: true, remaining: decrementResult.remaining };
    }
    
    if (decrementResult.status === 'rpc_error') {
        console.error(`[credits] 积分扣减失败 [userId=${userId.substring(0, 8)}...]:`, decrementResult.errorDetail);
        return { 
            ok: false, 
            reason: 'deduction_failed',
            detail: decrementResult.errorDetail || '未知错误'
        };
    }

    const info = await getUserCreditInfo(userId, actualOptions);
    if (info.credits < amount) {
        return { ok: false, reason: 'insufficient_credits' };
    }

    return { ok: false, reason: 'deduction_failed' };
}

/**
 * 添加积分
 */
export async function addCredits(userId: string, amount: number): Promise<number | null> {
    const supabase = getSystemAdminClient();

    try {
        const { data, error } = await supabase
            .rpc('increment_ai_chat_count', { user_id: userId, amount });

        if (error) {
            console.error('[credits] RPC increment failed, falling back to direct update:', error.message);
            return await addCreditsDirect(userId, amount);
        }

        return typeof data === 'number' ? data : null;
    } catch (error) {
        console.error('[credits] RPC call error, falling back to direct update:', error);
        return await addCreditsDirect(userId, amount);
    }
}

async function addCreditsDirect(userId: string, amount: number): Promise<number | null> {
    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('users')
        .update({ ai_chat_count: { '+': amount } })
        .eq('id', userId)
        .select('ai_chat_count')
        .maybeSingle();

    if (error) {
        console.error('[credits] Direct increment failed:', error.message);
        return null;
    }

    return data && typeof data.ai_chat_count === 'number' ? data.ai_chat_count : null;
}

export async function refundCreditsOrLog(userId: string, amount: number, context: string): Promise<boolean> {
    const { addCredits: currentAddCredits } = await getCreditsModuleExports();
    const remaining = await currentAddCredits(userId, amount);
    if (remaining === null) {
        console.error(`[credits] ${context} refund failed`, { userId, amount });
        return false;
    }
    return true;
}

/**
 * 检查是否有足够积分
 */
export async function hasCredits(userId: string): Promise<boolean> {
    const credits = await getCredits(userId);
    return credits > 0;
}

export function getMembershipCreditLimit(type: MembershipType): number {
    return getPlanConfig(type).creditLimit;
}
