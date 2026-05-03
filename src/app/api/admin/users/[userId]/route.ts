import { NextRequest } from 'next/server';
import {
    getSystemAdminClient,
    getAuthAdminClient,
    jsonError,
    jsonOk,
    requireAdminContext,
} from '@/lib/api-utils';
import { logAdminOperation } from '@/lib/admin/admin-operation-logs';

interface RouteContext {
    params: Promise<{ userId: string }>;
}

/**
 * 获取单个用户详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { userId } = await context.params;

    try {
        const supabase = getSystemAdminClient();

        // 获取用户基本信息
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return jsonError('用户不存在', 404);
        }

        // 获取邮箱和手机号信息（使用 Auth Admin 客户端）
        let userEmail = '';
        let userPhone: string | null = null;
        let lastSignInAt: string | null = null;

        const authAdminClient = getAuthAdminClient();
        if (authAdminClient) {
            try {
                const { data: authUser } = await authAdminClient.auth.admin.getUserById(userId);
                userEmail = authUser?.user?.email || '';
                // 获取手机号：先从 auth 表的 phone 字段获取，如果没有则从 user_metadata 中获取
                if (authUser?.user?.phone) {
                    userPhone = authUser.user.phone;
                } else if (authUser?.user?.user_metadata?.phone) {
                    userPhone = authUser.user.user_metadata.phone as string;
                }
                lastSignInAt = authUser?.user?.last_sign_in_at || null;
            } catch (authErr) {
                console.error('[admin-users][GET by id] Auth admin getUserById failed:', authErr);
            }
        }

        // 获取积分余额和交易记录
        const { data: creditTx } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        // 获取操作历史
        const { data: operationLogs } = await supabase
            .from('admin_operation_logs')
            .select('*')
            .eq('target_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        // 记录查看操作（非阻塞）
        try {
            await logAdminOperation({
                adminId: auth.user.id,
                adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                operationType: 'view_user',
                targetUserId: userId,
                targetUserEmail: userEmail,
                description: `查看用户详情 (${userEmail || userId})`,
            });
        } catch (logErr) {
            console.error('[admin-users][GET by id] Failed to log operation:', logErr);
        }

        return jsonOk({
            user: {
                id: user.id,
                email: userEmail,
                phone: userPhone,
                nickname: user.nickname,
                avatar_url: user.avatar_url,
                membership: user.membership,
                membership_expires_at: user.membership_expires_at,
                is_admin: user.is_admin,
                created_at: user.created_at,
                updated_at: user.updated_at,
                last_sign_in_at: lastSignInAt,
                credits: user.ai_chat_count || 0,
            },
            recentTransactions: (creditTx || []).slice(0, 20),
            recentOperations: (operationLogs || []),
        });
    } catch (err) {
        console.error('[admin-users][GET by id] Error:', err);
        return jsonError('获取用户详情失败', 500);
    }
}

/**
 * 更新用户信息（会员等级、积分、基本资料等）
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { userId } = await context.params;
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const updates = body as Record<string, unknown>;
    const supabase = getSystemAdminClient();

    try {
        // 获取当前用户信息（用于日志记录）
        const { data: currentUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (!currentUser) {
            return jsonError('用户不存在', 404);
        }

        const updateData: Record<string, unknown> = {};
        let operationType: string | null = null;
        let description = '';

        // 处理会员等级修改
        if ('membership' in updates && ['free', 'plus', 'pro'].includes(updates.membership as string)) {
            updateData.membership = updates.membership;

            if (updates.membership === 'plus' || updates.membership === 'pro') {
                updateData.membership_expires_at = updates.membership_expires_at
                    ? new Date(updates.membership_expires_at as string).toISOString()
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 默认1年
            } else {
                updateData.membership_expires_at = null;
            }

            operationType = 'update_membership';
            description = `将用户会员等级从 ${currentUser.membership} 改为 ${updates.membership}`;
        }

        // 处理积分调整
        if ('credits_adjustment' in updates) {
            const adjustment = Number(updates.credits_adjustment);
            if (isNaN(adjustment)) {
                return jsonError('积分调整值必须是数字', 400);
            }

            const currentCredits = currentUser.credits || 0;
            const newCredits = Math.max(0, currentCredits + adjustment);

            // 创建积分变动记录
            const { error: txError } = await supabase.from('credit_transactions').insert({
                user_id: userId,
                amount: adjustment,
                type: adjustment > 0 ? 'earn' : 'spend',
                source: 'admin_adjustment',
                description: `管理员手动${adjustment > 0 ? '增加' : '减少'} ${Math.abs(adjustment)} 积分`,
                balance_after: newCredits,
                metadata: {
                    admin_id: auth.user.id,
                    admin_nickname: auth.user.user_metadata?.nickname,
                    reason: updates.credit_reason || '管理员手动调整',
                },
            });

            if (txError) {
                console.error('[admin-users][PATCH] Credit transaction failed:', txError);
                return jsonError('创建积分变动记录失败', 500);
            }

            operationType = 'adjust_credits';
            description = `${adjustment > 0 ? '增加' : '减少'}用户 ${Math.abs(adjustment)} 积分（${currentCredits} → ${newCredits}）`;
        }

        // 处理基本资料修改
        if ('nickname' in updates) {
            updateData.nickname = updates.nickname;
            if (!operationType) {
                operationType = 'edit_user_info';
                description = `修改用户昵称`;
            }
        }

        if ('is_admin' in updates) {
            updateData.is_admin = Boolean(updates.is_admin);
            if (!operationType) {
                operationType = 'edit_user_info';
                description = `${updates.is_admin ? '设为' : '取消'}管理员权限`;
            }
        }

        if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date().toISOString();

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                console.error('[admin-users][PATCH] Update failed:', updateError);

                // 记录失败的操作（非阻塞）
                try {
                    await logAdminOperation({
                        adminId: auth.user.id,
                        adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                        operationType: (operationType as 'edit_user_info') || 'edit_user_info',
                        targetUserId: userId,
                        description: `${description} - 失败`,
                        status: 'failed',
                        errorMessage: updateError.message,
                        details: { updates, error: updateError },
                    });
                } catch (logErr) {
                    console.error('[admin-users][PATCH] Failed to log failed operation:', logErr);
                }

                return jsonError('更新用户信息失败', 500);
            }

            // 记录成功的操作（非阻塞）
            try {
                await logAdminOperation({
                    adminId: auth.user.id,
                    adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                    operationType: (operationType as any) || 'edit_user_info',
                    targetUserId: userId,
                    description,
                    details: {
                        previousValue: currentUser,
                        newValue: updates,
                        updateData
                    },
                });
            } catch (logErr) {
                console.error('[admin-users][PATCH] Failed to log success operation:', logErr);
            }
        }

        // 返回更新后的用户信息
        const { data: updatedUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        return jsonOk({
            success: true,
            message: '用户信息已更新',
            user: updatedUser,
        });
    } catch (err) {
        console.error('[admin-users][PATCH] Error:', err);

        // 记录错误日志（非阻塞）
        try {
            await logAdminOperation({
                adminId: auth.user.id,
                operationType: 'edit_user_info',
                targetUserId: userId,
                description: '更新用户信息时发生错误',
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
        } catch (logErr) {
            console.error('[admin-users][PATCH] Failed to log error:', logErr);
        }

        return jsonError('服务器内部错误', 500);
    }
}

/**
 * 禁用/启用用户账号
 */
export async function POST(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { userId } = await context.params;
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const { action } = body as { action?: 'disable' | 'enable' };

    if (!['disable', 'enable'].includes(action || '')) {
        return jsonError('action 必须是 disable 或 enable', 400);
    }

    const authAdminClient = getAuthAdminClient();
    if (!authAdminClient) {
        return jsonError('SUPABASE_SECRET_KEY 未配置，无法执行此操作', 503);
    }

    try {
        if (action === 'disable') {
            // 禁用用户：在 Supabase Auth 中 ban 用户
            const { error: banError } = await authAdminClient.auth.admin.updateUserById(userId, {
                ban_duration: '9999y', // 实际上永久禁用
            });

            if (banError) {
                console.error('[admin-users][POST] Ban failed:', banError);
                return jsonError('禁用用户失败: ' + banError.message, 500);
            }

            // 记录操作（非阻塞）
            try {
                await logAdminOperation({
                    adminId: auth.user.id,
                    adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                    operationType: 'disable_user',
                    targetUserId: userId,
                    description: `禁用用户账号`,
                    details: { reason: (body as Record<string, unknown>).reason },
                });
            } catch (logErr) {
                console.error('[admin-users][POST] Failed to log ban operation:', logErr);
            }

            return jsonOk({ success: true, message: '用户已被禁用' });
        } else {
            // 启用用户：解除 ban
            const { error: unbanError } = await authAdminClient.auth.admin.updateUserById(userId, {
                ban_duration: undefined,
            });

            if (unbanError) {
                console.error('[admin-users][POST] Unban failed:', unbanError);
                return jsonError('启用用户失败: ' + unbanError.message, 500);
            }

            // 记录操作（非阻塞）
            try {
                await logAdminOperation({
                    adminId: auth.user.id,
                    adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                    operationType: 'enable_user',
                    targetUserId: userId,
                    description: `启用用户账号`,
                });
            } catch (logErr) {
                console.error('[admin-users][POST] Failed to log unban operation:', logErr);
            }

            return jsonOk({ success: true, message: '用户已启用' });
        }
    } catch (err) {
        console.error('[admin-users][POST] Error:', err);
        return jsonError('服务器内部错误', 500);
    }
}

/**
 * 删除用户（需要二次确认）
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const confirmed = searchParams.get('confirmed') === 'true';

    if (!confirmed) {
        return jsonError(
            '删除用户需要二次确认。请添加 confirmed=true 参数以确认此操作。',
            400
        );
    }

    const supabase = getSystemAdminClient();
    const authAdminClient = getAuthAdminClient();
    if (!authAdminClient) {
        return jsonError('SUPABASE_SECRET_KEY 未配置，无法执行此操作', 503);
    }

    try {
        // 检查是否尝试删除自己
        if (userId === auth.user.id) {
            return jsonError('不能删除自己的账号', 403);
        }

        // 检查是否为其他超级管理员
        const { data: targetUser } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (targetUser?.is_admin) {
            // 验证当前用户是否有权删除管理员
            const { data: currentUser } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', auth.user.id)
                .single();

            if (!currentUser?.is_admin) {
                return jsonError('只有超级管理员才能删除其他管理员账号', 403);
            }
        }

        // 先删除 public.users 表中的数据
        const { error: deleteUserError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteUserError) {
            console.error('[admin-users][DELETE] Delete from users failed:', deleteUserError);
            return jsonError('删除用户数据失败', 500);
        }

        // 删除 Supabase Auth 中的用户（使用 Auth Admin 客户端）
        const { error: deleteAuthError } = await authAdminClient.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
            console.error('[admin-users][DELETE] Delete from auth failed:', deleteAuthError);
            return jsonError('删除用户认证信息失败: ' + deleteAuthError.message, 500);
        }

        // 记录删除操作（非阻塞）
        try {
            await logAdminOperation({
                adminId: auth.user.id,
                adminNickname: auth.user.user_metadata?.nickname as string | undefined,
                operationType: 'delete_user',
                targetUserId: userId,
                description: `彻底删除用户账号及所有相关数据`,
                details: {
                    deletedAt: new Date().toISOString(),
                    requiresConfirmation: true
                },
            });
        } catch (logErr) {
            console.error('[admin-users][DELETE] Failed to log delete operation:', logErr);
        }

        return jsonOk({
            success: true,
            message: '用户已彻底删除，此操作不可逆'
        });
    } catch (err) {
        console.error('[admin-users][DELETE] Error:', err);

        // 记录错误日志（非阻塞）
        try {
            await logAdminOperation({
                adminId: auth.user.id,
                operationType: 'delete_user',
                targetUserId: userId,
                description: '删除用户时发生错误',
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
        } catch (logErr) {
            console.error('[admin-users][DELETE] Failed to log delete error:', logErr);
        }

        return jsonError('删除用户失败', 500);
    }
}
