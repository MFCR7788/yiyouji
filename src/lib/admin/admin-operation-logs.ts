/**
 * 管理员操作日志工具函数
 * 用于记录所有管理员在后台的操作
 */

import { getSystemAdminClient } from '@/lib/api-utils';

export type AdminOperationType =
    | 'view_user'
    | 'update_membership'
    | 'adjust_credits'
    | 'edit_user_info'
    | 'disable_user'
    | 'enable_user'
    | 'delete_user'
    | 'batch_operation';

export interface AdminOperationLogInput {
    adminId: string;
    adminNickname?: string;
    operationType: AdminOperationType;
    targetUserId?: string;
    targetUserEmail?: string;
    description: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failed' | 'pending';
    errorMessage?: string;
}

export interface AdminOperationLog {
    id: string;
    admin_id: string;
    admin_nickname: string | null;
    operation_type: AdminOperationType;
    target_user_id: string | null;
    target_user_email: string | null;
    description: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    status: 'success' | 'failed' | 'pending';
    error_message: string | null;
    created_at: string;
}

/**
 * 记录管理员操作日志
 */
export async function logAdminOperation(input: AdminOperationLogInput): Promise<void> {
    const supabase = getSystemAdminClient();
    
    const { error } = await supabase.from('admin_operation_logs').insert({
        admin_id: input.adminId,
        admin_nickname: input.adminNickname || null,
        operation_type: input.operationType,
        target_user_id: input.targetUserId || null,
        target_user_email: input.targetUserEmail || null,
        description: input.description,
        details: input.details || {},
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        status: input.status || 'success',
        error_message: input.errorMessage || null,
    });

    if (error) {
        console.error('[admin-logs] Failed to log operation:', error);
    }
}

/**
 * 查询操作日志列表
 */
export async function queryAdminOperationLogs(options: {
    limit?: number;
    offset?: number;
    operationType?: AdminOperationType;
    adminId?: string;
    targetUserId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}): Promise<{ logs: AdminOperationLog[]; total: number }> {
    const supabase = getSystemAdminClient();
    
    let query = supabase
        .from('admin_operation_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
    
    if (options.operationType) {
        query = query.eq('operation_type', options.operationType);
    }
    
    if (options.adminId) {
        query = query.eq('admin_id', options.adminId);
    }
    
    if (options.targetUserId) {
        query = query.eq('target_user_id', options.targetUserId);
    }
    
    if (options.status) {
        query = query.eq('status', options.status);
    }
    
    if (options.startDate) {
        query = query.gte('created_at', options.startDate);
    }
    
    if (options.endDate) {
        query = query.lte('created_at', options.endDate);
    }
    
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) {
        console.error('[admin-logs] Query failed:', error);
        throw new Error('查询操作日志失败');
    }
    
    return {
        logs: (data || []) as AdminOperationLog[],
        total: count || 0,
    };
}

/**
 * 获取用户相关的操作历史
 */
export async function getUserOperationHistory(
    userId: string,
    limit: number = 20,
): Promise<AdminOperationLog[]> {
    const supabase = getSystemAdminClient();
    
    const { data, error } = await supabase
        .from('admin_operation_logs')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error('[admin-logs] Query user history failed:', error);
        throw new Error('查询用户操作历史失败');
    }
    
    return (data || []) as AdminOperationLog[];
}
