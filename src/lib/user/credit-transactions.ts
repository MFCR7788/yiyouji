/**
 * 积分交易记录工具函数
 * 用于在积分变动时同步写入 credit_transactions 表
 */

import { getSystemAdminClient } from '@/lib/api-utils';

type CreditTransactionType = 'earn' | 'spend' | 'refund';

interface CreditTransactionInput {
    userId: string;
    amount: number;
    type: CreditTransactionType;
    source: string;
    description?: string;
    referenceType?: string;
    referenceId?: string;
}

/**
 * 获取用户当前积分余额
 */
async function getUserCredits(userId: string): Promise<number> {
    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('users')
        .select('ai_chat_count')
        .eq('id', userId)
        .maybeSingle();
    
    if (error) {
        console.error('[credit-log] 获取用户积分失败:', error.message);
        return 0;
    }
    
    return (data?.ai_chat_count as number) || 0;
}

/**
 * 记录一笔积分交易
 * @returns 成功返回 true，失败返回 false
 */
export async function logCreditTransaction(input: CreditTransactionInput): Promise<boolean> {
    try {
        const supabase = getSystemAdminClient();
        
        // 获取当前余额用于计算交易后的余额
        const currentBalance = await getUserCredits(input.userId);
        const balanceAfter = currentBalance + input.amount;

        const { error } = await supabase
            .from('credit_transactions')
            .insert({
                user_id: input.userId,
                amount: input.amount,
                type: input.type,
                source: input.source,
                description: input.description || null,
                reference_type: input.referenceType || null,
                reference_id: input.referenceId || null,
                balance_after: balanceAfter,
            });

        if (error) {
            console.error('[credit-log] 写入交易记录失败:', error.message);
            return false;
        }

        console.info(`[credit-log] 交易记录已写入: ${input.type} ${input.amount > 0 ? '+' : ''}${input.amount} (${input.source})`);
        return true;
    } catch (error) {
        console.error('[credit-log] 写入交易记录异常:', error);
        return false;
    }
}

/**
 * 记录新用户注册赠送积分
 */
export async function logRegistrationBonus(userId: string, amount: number = 100): Promise<void> {
    await logCreditTransaction({
        userId,
        amount,
        type: 'earn',
        source: 'registration',
        description: `新用户注册赠送 ${amount} 积分`,
    });
}

/**
 * 记录每日签到奖励
 */
export async function logCheckinReward(userId: string, amount: number, streakDays?: number): Promise<void> {
    const description = streakDays && streakDays > 1
        ? `连续签到 ${streakDays} 天，奖励 ${amount} 积分`
        : `每日签到奖励 ${amount} 秒分`;

    await logCreditTransaction({
        userId,
        amount,
        type: 'earn',
        source: 'checkin',
        description,
    });
}

/**
 * 记录 AI 使用消费
 */
export async function logAiUsage(userId: string, amount: number, modelId?: string, feature?: string): Promise<void> {
    const description = modelId
        ? `使用 ${modelId}${feature ? ` (${feature})` : ''}`
        : (feature || 'AI 消费');

    await logCreditTransaction({
        userId,
        amount: -Math.abs(amount),
        type: 'spend',
        source: 'ai_usage',
        description,
        referenceType: modelId ? 'ai_model' : undefined,
    });
}

/**
 * 记录 AI 分析退款
 */
export async function logAiRefund(userId: string, amount: number, reason?: string): Promise<void> {
    const description = reason
        ? `AI 分析退款: ${reason}`
        : `AI 分析退款 +${amount} 积分`;

    await logCreditTransaction({
        userId,
        amount: Math.abs(amount),
        type: 'refund',
        source: 'ai_refund',
        description,
    });
}

/**
 * 记录激活码兑换
 */
export async function logActivationKey(userId: string, amount: number, keyPrefix?: string): Promise<void> {
    const description = keyPrefix
        ? `使用激活码 ${keyPrefix} 兑换 ${amount} 积分`
        : `激活码兑换 ${amount} 积分`;

    await logCreditTransaction({
        userId,
        amount,
        type: 'earn',
        source: 'activation_key',
        description,
    });
}
