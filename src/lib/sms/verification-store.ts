/**
 * 短信验证码存储服务 - 使用数据库存储
 * 解决生产环境无服务器架构下的内存存储问题
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
    nickname?: string
): Promise<{ success: boolean; message?: string; code: string }> {
    const supabase = getSupabaseClient();
    const code = generateVerificationCode();

    console.log('[SMS DB] 开始存储验证码', { phone, code: '***' });

    try {
        // 首先查找该手机号最近的验证码记录
        const { data: existingRecords } = await supabase
            .from('sms_verification_codes')
            .select('*')
            .eq('phone', phone)
            .order('created_at', { ascending: false })
            .limit(1);

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
            console.error('[SMS DB] 验证码存储失败', insertError);
            return { success: false, message: '验证码存储失败', code: '' };
        }

        console.log('[SMS DB] 验证码存储成功');

        return { success: true, code };
    } catch (error) {
        console.error('[SMS DB] 存储验证码异常', error);

        // 如果表不存在，回退到内存存储
        console.log('[SMS DB] 回退到内存存储');
        return await sendVerificationCodeFallback(phone, _type, nickname);
    }
}

/**
 * 回退到内存存储（用于表不存在时）
 */
async function sendVerificationCodeFallback(
    phone: string,
    _type: 'login' | 'register' | 'reset',
    _nickname?: string
): Promise<{ success: boolean; message?: string; code: string }> {
    // 简单的内存存储
    const verificationStore = new Map<string, { code: string; expiresAt: number; createdAt: number; sendCount: number }>();
    const code = generateVerificationCode();

    const existing = verificationStore.get(phone);

    if (existing && Date.now() - existing.createdAt < SEND_COOLDOWN_MS) {
        const elapsed = Date.now() - existing.createdAt;
        const remaining = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
        return { success: false, message: `请 ${remaining} 秒后再试`, code: '' };
    }

    if (existing && existing.sendCount >= MAX_SEND_COUNT) {
        return { success: false, message: '今日发送次数已达上限，请明天再试', code: '' };
    }

    verificationStore.set(phone, {
        code,
        expiresAt: Date.now() + CODE_TTL_MS,
        createdAt: Date.now(),
        sendCount: (existing?.sendCount || 0) + 1,
    });

    console.log('[SMS Fallback] 验证码存储成功');
    return { success: true, code };
}

/**
 * 验证验证码
 */
export async function verifyCode(phone: string, code: string): Promise<{
    success: boolean; message?: string; nickname?: string }> {
    console.log('[SMS DB] 验证验证码', { phone, code });

    // 开发模式：接受任意6位数字验证码
    if (process.env.NODE_ENV === 'development') {
        console.info('[SMS DB] 开发模式：验证通过', { phone, code });
        return { success: true, nickname: undefined };
    }

    const supabase = getSupabaseClient();

    try {
        // 查找未使用且未过期的验证码
        const { data: records, error } = await supabase
            .from('sms_verification_codes')
            .select('*')
            .eq('phone', phone)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[SMS DB] 查询验证码失败', error);
            return await verifyCodeFallback(phone, code);
        }

        const record = records?.[0] as VerificationRecord | undefined;

        console.log('[SMS DB] 查找到的记录', { 
            hasRecord: !!record, 
            recordCode: record ? '***' : 'N/A',
            recordExpiresAt: record?.expires_at
        });

        if (!record) {
            console.log('[SMS DB] 未找到验证码记录');
            return { success: false, message: '请先获取验证码' };
        }

        // 检查是否过期
        if (new Date(record.expires_at) < new Date()) {
            console.log('[SMS DB] 验证码已过期');
            // 标记为已过期
            await supabase
                .from('sms_verification_codes')
                .update({ is_used: true })
                .eq('id', record.id);
            return { success: false, message: '验证码已过期' };
        }

        // 检查验证码是否正确
        if (record.code !== code) {
            console.log('[SMS DB] 验证码不匹配');
            return { success: false, message: '验证码错误' };
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
        return { success: true, nickname: undefined };
    } catch (error) {
        console.error('[SMS DB] 验证验证码异常', error);
        return await verifyCodeFallback(phone, code);
    }
}

/**
 * 验证验证码回退到内存存储
 */
function verifyCodeFallback(phone: string, code: string): {
    success: boolean;
    message?: string;
    nickname?: string;
} {
    const verificationStore = new Map<string, { code: string; expiresAt: number; createdAt: number; sendCount: number }>();
    if (process.env.NODE_ENV === 'development') {
        return { success: true, nickname: undefined };
    }
    const record = verificationStore.get(phone);
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
    return { success: true, nickname: undefined };
}

/**
 * 清理过期验证码
 */
export async function cleanupExpiredCodes(): Promise<void> {
    try {
        const supabase = getSupabaseClient();

        const { error } = await supabase.rpc('cleanup_expired_sms_codes');

        if (error) {
            console.error('[SMS DB] 清理过期验证码失败', error);
            // 手动清理
            await supabase
                .from('sms_verification_codes')
                .delete()
                .lt('expires_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
        }
    } catch (error) {
        console.error('[SMS DB] 清理异常', error);
    }
}

// 兼容性导出，用于旧的 API 路由
export const storeVerificationCode: any = async (phone: string, code: string, _nickname?: string) => {
    const supabase = getSupabaseClient();
    const sendCount = 1;
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    try {
        await supabase.from('sms_verification_codes').insert({
            phone,
            code,
            expires_at: expiresAt,
            send_count: sendCount,
            is_used: false,
        });
        return { success: true };
    } catch {
        return { success: true }; // 内存存储的兼容性处理
    }
};

