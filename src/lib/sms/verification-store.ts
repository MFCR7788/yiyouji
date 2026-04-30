/**
 * 短信验证码存储服务
 * 优先使用数据库存储，回退到内存存储
 */

import { createClient } from '@supabase/supabase-js';

interface VerificationRecord {
    id: string;
    phone: string;
    code: string;
    expires_at: string;
    created_at: string;
    is_used: boolean;
    used_at?: string;
    send_count: number;
}

const CODE_TTL_MS = 5 * 60 * 1000; // 5分钟有效期
const MAX_SEND_COUNT = 3; // 最多发送3次
const SEND_COOLDOWN_MS = 60 * 1000; // 发送间隔60秒

// 内存存储（作为回退方案）
const verificationStore = new Map<string, { code: string; expiresAt: number; createdAt: number; sendCount: number }>();

// 获取 Supabase 客户端
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
        throw new Error('缺少 Supabase 配置缺失');
    }

    return createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/**
 * 生成随机验证码
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送并存储验证码
 */
export async function sendVerificationCode(
    phone: string,
    _type: 'login' | 'register' | 'reset',
    _nickname?: string
): Promise<{ success: boolean; message?: string; code: string }> {
    const code = generateVerificationCode();
    console.log('[SMS] 开始存储验证码', { phone, code: '***' });

    try {
        const supabase = getSupabaseClient();

        // 先尝试使用数据库存储
        try {
            return await storeInDatabase(supabase, phone, code);
        } catch (dbError) {
            console.warn('[SMS] 数据库存储失败，回退到内存存储', dbError);
            // 数据库失败，回退到内存存储
            return storeInMemory(phone, code);
        }
    } catch (error) {
        console.error('[SMS] 存储验证码异常', error);
        // 任何错误都回退到内存存储
        return storeInMemory(phone, code);
    }
}

/**
 * 在数据库中存储验证码
 */
async function storeInDatabase(
    supabase: any,
    phone: string,
    code: string
): Promise<{ success: boolean; message?: string; code: string }> {
    // 首先查找该手机号最近的验证码记录
    const { data: existingRecords, error: queryError } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1);

    if (queryError) {
        console.warn('[SMS DB] 查询失败，可能表不存在', queryError);
        throw queryError;
    }

    const lastRecord = existingRecords?.[0] as VerificationRecord | undefined;

    // 检查发送冷却
    if (lastRecord && Date.now() - new Date(lastRecord.created_at).getTime() < SEND_COOLDOWN_MS) {
        const elapsed = Date.now() - new Date(lastRecord.created_at).getTime();
        const remaining = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
        console.log('[SMS DB] 发送冷却中', { remaining });
        return { success: false, message: `请 ${remaining} 秒后再试`, code: '' };
    }

    // 检查发送次数
    if (lastRecord && lastRecord.send_count >= MAX_SEND_COUNT) {
        console.log('[SMS DB] 发送次数已达上限');
        return { success: false, message: '今日发送次数已达上限，请明天再试', code: '' };
    }

    // 计算发送次数
    const sendCount = lastRecord ? lastRecord.send_count + 1 : 1;
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    console.log('[SMS DB] 准备写入数据库', { phone, sendCount, expiresAt });

    // 插入新的验证码记录
    const { error: insertError } = await supabase
        .from('sms_verification_codes')
        .insert({
            phone,
            code,
            expires_at: expiresAt,
            send_count: sendCount,
            is_used: false,
        });

    if (insertError) {
        console.warn('[SMS DB] 验证码插入失败', insertError);
        throw insertError;
    }

    console.log('[SMS DB] 验证码存储成功');
    return { success: true, code };
}

/**
 * 在内存中存储验证码
 */
function storeInMemory(
    phone: string,
    code: string
): { success: boolean; message?: string; code: string } {
    const existing = verificationStore.get(phone);

    // 检查发送冷却
    if (existing && Date.now() - existing.createdAt < SEND_COOLDOWN_MS) {
        const elapsed = Date.now() - existing.createdAt;
        const remaining = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
        console.log('[SMS Memory] 发送冷却中', { remaining });
        return { success: false, message: `请 ${remaining} 秒后再试`, code: '' };
    }

    // 检查发送次数
    if (existing && existing.sendCount >= MAX_SEND_COUNT) {
        console.log('[SMS Memory] 发送次数已达上限');
        return { success: false, message: '今日发送次数已达上限，请明天再试', code: '' };
    }

    verificationStore.set(phone, {
        code,
        expiresAt: Date.now() + CODE_TTL_MS,
        createdAt: Date.now(),
        sendCount: (existing?.sendCount || 0) + 1,
    });

    console.log('[SMS Memory] 验证码存储成功');
    return { success: true, code };
}

/**
 * 验证验证码
 */
export async function verifyCode(phone: string, code: string): Promise<{
    success: boolean;
    message?: string;
    nickname?: string;
}> {
    console.log('[SMS] 验证验证码', { phone, code });

    // 开发模式：接受任意6位数字验证码
    if (process.env.NODE_ENV === 'development') {
        console.info('[SMS] 开发模式：验证通过', { phone, code });
        return { success: true, nickname: undefined };
    }

    try {
        const supabase = getSupabaseClient();
        // 先尝试使用数据库验证
        try {
            const result = await verifyFromDatabase(supabase, phone, code);
            if (result.verified) {
                return { success: true, nickname: undefined };
            }
            return { success: false, message: result.message };
        } catch (dbError) {
            console.warn('[SMS] 数据库验证失败，回退到内存验证', dbError);
            // 数据库失败，回退到内存验证
            return verifyFromMemory(phone, code);
        }
    } catch (error) {
        console.error('[SMS] 验证验证码异常', error);
        // 任何错误都回退到内存验证
        return verifyFromMemory(phone, code);
    }
}

/**
 * 从数据库验证验证码
 */
async function verifyFromDatabase(
    supabase: any,
    phone: string,
    code: string
): Promise<{ verified: boolean; message?: string }> {
    // 查找未使用且未过期的验证码
    const { data: records, error } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .eq('phone', phone)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.warn('[SMS DB] 查询验证码失败', error);
        throw error;
    }

    const record = records?.[0] as VerificationRecord | undefined;

    console.log('[SMS DB] 查找到的记录', {
        hasRecord: !!record,
        recordCode: record ? '***' : 'N/A',
        recordExpiresAt: record?.expires_at
    });

    if (!record) {
        console.log('[SMS DB] 未找到验证码记录');
        return { verified: false, message: '请先获取验证码' };
    }

    // 检查是否过期
    if (new Date(record.expires_at) < new Date()) {
        console.log('[SMS DB] 验证码已过期');
        // 标记为已过期
        await supabase
            .from('sms_verification_codes')
            .update({ is_used: true })
            .eq('id', record.id);
        return { verified: false, message: '验证码已过期' };
    }

    // 检查验证码是否正确
    if (record.code !== code) {
        console.log('[SMS DB] 验证码不匹配');
        return { verified: false, message: '验证码错误' };
    }

    // 验证成功，标记为已使用
    const { error: updateError } = await supabase
        .from('sms_verification_codes')
        .update({
            is_used: true,
            used_at: new Date().toISOString(),
        })
        .eq('id', record.id);

    if (updateError) {
        console.error('[SMS DB] 标记验证码失败，但验证仍成功', updateError);
    }

    console.log('[SMS DB] 验证成功');
    return { verified: true };
}

/**
 * 从内存验证验证码
 */
function verifyFromMemory(phone: string, code: string): {
    success: boolean;
    message?: string;
    nickname?: string;
} {
    const record = verificationStore.get(phone);

    console.log('[SMS Memory] 验证', { hasRecord: !!record });

    if (!record) {
        return { success: false, message: '请先获取验证码' };
    }

    if (Date.now() > record.expiresAt) {
        verificationStore.delete(phone);
        return { success: false, message: '验证码已过期' };
    }

    if (record.code !== code) {
        return { success: false, message: '验证码错误' };
    }

    verificationStore.delete(phone);
    console.log('[SMS Memory] 验证成功');
    return { success: true, nickname: undefined };
}

/**
 * 清理过期验证码
 */
export async function cleanupExpiredCodes(): Promise<void> {
    // 清理内存中的过期记录
    const now = Date.now();
    for (const [phone, record] of verificationStore.entries()) {
        if (now > record.expiresAt) {
            verificationStore.delete(phone);
        }
    }

    // 尝试清理数据库
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('sms_verification_codes')
            .delete()
            .lt('expires_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if (error) {
            console.warn('[SMS DB] 清理过期验证码失败', error);
        }
    } catch (error) {
        console.warn('[SMS DB] 数据库清理异常', error);
    }
}

// 兼容性导出，用于旧的 API 路由
export const storeVerificationCode: any = async (phone: string, _code: string, _nickname?: string) => {
    return await sendVerificationCode(phone, 'login');
};

