import { NextRequest } from 'next/server';
import {
    getSystemAdminClient,
    getAuthAdminClient,
    jsonError,
    jsonOk,
    requireAdminContext,
} from '@/lib/api-utils';
import { logAdminOperation } from '@/lib/admin/admin-operation-logs';

/**
 * 获取用户列表（支持分页和搜索）
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = searchParams.get('search')?.trim() || '';
    const membership = searchParams.get('membership') as 'free' | 'plus' | 'pro' | null;
    const isAdmin = searchParams.get('is_admin');

    const offset = (page - 1) * limit;

    try {
        const supabase = getSystemAdminClient();

        let query = supabase
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`nickname.ilike.%${search}%`);
        }

        if (membership && ['free', 'plus', 'pro'].includes(membership)) {
            query = query.eq('membership', membership);
        }

        if (isAdmin === 'true') {
            query = query.eq('is_admin', true);
        } else if (isAdmin === 'false') {
            query = query.eq('is_admin', false);
        }

        const { data: users, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('[admin-users][GET] Query failed:', error);
            return jsonError('获取用户列表失败', 500);
        }

        // 批量获取用户邮箱和手机号（使用 Auth Admin 客户端）
        const userIds = (users || []).map((u: Record<string, unknown>) => u.id as string);

        const emailMap: Record<string, string> = {};
        const phoneMap: Record<string, string | null> = {};
        const lastSignInMap: Record<string, string | null> = {};

        const authAdminClient = getAuthAdminClient();
        if (authAdminClient) {
            try {
                const { data: authUsers } = await authAdminClient.auth.admin.listUsers({
                    perPage: 1000
                });

                (authUsers?.users || []).forEach((au: { id: string; email?: string; phone?: string; user_metadata?: Record<string, unknown>; last_sign_in_at?: string | null }) => {
                    if (au.email) {
                        emailMap[au.id] = au.email;
                    }
                    // 获取手机号：先从 auth 表的 phone 字段获取，如果没有则从 user_metadata 中获取
                    if (au.phone) {
                        phoneMap[au.id] = au.phone;
                    } else if (au.user_metadata?.phone) {
                        phoneMap[au.id] = au.user_metadata.phone as string;
                    }
                    lastSignInMap[au.id] = au.last_sign_in_at ?? null;
                });
            } catch (authErr) {
                console.error('[admin-users][GET] Auth admin listUsers failed:', authErr);
            }
        } else {
            console.warn('[admin-users][GET] SUPABASE_SECRET_KEY not configured, skipping fetch');
        }

        // 获取每个用户的积分余额
        const creditPromises = userIds.map(async (userId: string) => {
            const { data: transactions } = await supabase
                .from('credit_transactions')
                .select('balance_after')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            return {
                userId,
                balance: transactions?.[0]?.balance_after || 0,
            };
        });

        const creditResults = await Promise.all(creditPromises);
        const creditMap: Record<string, number> = Object.fromEntries(
            creditResults.map((r) => [r.userId, r.balance])
        );

        // 记录查看操作（非阻塞，失败不影响主流程）
        try {
            await logAdminOperation({
                adminId: auth.user.id,
                adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                operationType: 'view_user',
                description: `查看用户列表 (第${page}页, 搜索: ${search || '无'})`,
                details: { page, limit, search, filters: { membership, isAdmin } },
            });
        } catch (logErr) {
            console.error('[admin-users][GET] Failed to log operation:', logErr);
        }

        const userList = (users || []).map((user: Record<string, unknown>) => ({
            id: user.id as string,
            email: emailMap[user.id as string] || '',
            phone: phoneMap[user.id as string] || null,
            nickname: user.nickname as string | null,
            avatar_url: user.avatar_url as string | null,
            membership: user.membership as 'free' | 'plus' | 'pro',
            membership_expires_at: user.membership_expires_at as string | null,
            credits: creditMap[user.id as string] || 0,
            is_admin: user.is_admin as boolean,
            created_at: user.created_at as string,
            last_sign_in_at: lastSignInMap[user.id as string] || null,
        }));

        return jsonOk({
            users: userList,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil(((count || 0) / limit)),
            },
        });
    } catch (err) {
        console.error('[admin-users][GET] Error:', err);
        return jsonError('服务器内部错误', 500);
    }
}
