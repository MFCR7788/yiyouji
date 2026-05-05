/**
 * 投票 API 路由 - 增强版（带详细错误诊断）
 *
 * GET: 获取用户投票状态
 * POST: 投票（切换）- 添加完整的错误处理和日志记录
 *
 * 增加了详细的错误日志、参数验证和调试信息
 */
import { NextRequest } from 'next/server';
import { TargetType, VoteType } from '@/lib/community';
import { getAuthContext, jsonError, jsonOk, requireUserContext, resolveRequestDbClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import { missingFields, missingSearchParams } from '@/lib/validation';

export async function GET(request: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`\n[${requestId}] 📊 开始获取投票状态...`);
        
        // 1. 认证检查
        console.log(`[${requestId}] [1/3] 验证用户身份...`);
        const auth = await getAuthContext(request);
        if (auth.authError) {
            console.error(`[${requestId}] ❌ 认证失败:`, auth.authError.message);
            return jsonError(auth.authError.message, auth.authError.status);
        }
        
        const db = resolveRequestDbClient(auth);
        if (!db) {
            console.error(`[${requestId}] ❌ 数据库客户端为空`);
            return jsonError('获取投票状态失败', 500);
        }
        
        const { user } = auth;
        console.log(`[${requestId}] ✅ 用户已认证: ${user?.id || '(匿名)'}`);

        // 2. 匿名用户直接返回空
        if (!user) {
            console.log(`[${requestId}] ℹ️ 匿名用户，返回空投票状态`);
            return jsonOk({ vote: null });
        }

        // 3. 解析查询参数
        console.log(`[${requestId}] [2/3] 解析查询参数...`);
        const { searchParams } = new URL(request.url);
        const targetType = searchParams.get('targetType') as TargetType;
        const targetId = searchParams.get('targetId');

        const missingParams = missingSearchParams(searchParams, ['targetType', 'targetId']);
        if (missingParams.length > 0) {
            console.error(`[${requestId}] ❌ 缺少参数:`, missingParams);
            return jsonError(`缺少必要参数: ${missingParams.join(', ')}`, 400);
        }
        
        console.log(`[${requestId}] 📋 参数: targetType=${targetType}, targetId=${targetId}`);

        // 4. 验证参数有效性
        if (!['post', 'comment'].includes(targetType)) {
            console.error(`[${requestId}] ❌ 无效的目标类型:`, targetType);
            return jsonError('无效的目标类型，必须是 post 或 comment', 400);
        }

        // 5. 查询投票状态
        console.log(`[${requestId}] [3/3] 查询投票状态...`);
        try {
            const voteResult = await withRetry(async () => {
                const response = await db
                    .from('community_votes')
                    .select('vote_type')
                    .eq('user_id', user.id)
                    .eq('target_type', targetType)
                    .eq('target_id', targetId)
                    .maybeSingle();
                if (response.error) {
                    throw response.error;
                }
                return response;
            });

            console.log(`[${requestId}] ✅ 投票状态获取成功: ${voteResult.data?.vote_type || '未投票'}`);
            
            return jsonOk({ vote: voteResult.data?.vote_type || null });
        } catch (dbError) {
            console.error(`[${requestId}] ❌ 数据库查询失败:`, dbError);
            return jsonError(
                `获取投票状态失败${process.env.NODE_ENV === 'development' ? ': ' + String(dbError) : ''}`,
                500,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: {
                        error: dbError instanceof Error ? dbError.message : String(dbError),
                        request_id: requestId
                    }
                } : undefined
            );
        }
    } catch (error) {
        console.error(`[${requestId}] 💥 获取投票状态时发生异常:`, error);
        return jsonError(
            '获取投票状态失败',
            500,
            process.env.NODE_ENV === 'development' ? {
                debug_info: {
                    error: error instanceof Error ? error.message : String(error),
                    request_id: requestId
                }
            } : undefined
        );
    }
}

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`\n[${requestId}] 🗳️ 开始处理投票请求...`);
        
        // 1. 用户认证（必须登录）
        console.log(`[${requestId}] [1/6] 验证用户身份...`);
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            console.error(`[${requestId}] ❌ 未登录或认证失败:`, auth.error.message);
            return jsonError(auth.error.message, auth.error.status);
        }
        
        const db = resolveRequestDbClient(auth);
        if (!db) {
            console.error(`[${requestId}] ❌ 数据库客户端为空`);
            return jsonError('投票失败：无法连接到数据库', 500);
        }
        
        const { user } = auth;
        console.log(`[${requestId}] ✅ 用户已认证: ${user.id}`);

        // 2. 解析请求体
        console.log(`[${requestId}] [2/6] 解析请求参数...`);
        let body: unknown;
        try {
            body = await request.json();
        } catch (parseError) {
            console.error(`[${requestId}] ❌ JSON解析失败:`, parseError);
            return jsonError('请求体不是合法的JSON格式', 400);
        }

        const { targetType, targetId, voteType } = body as {
            targetType: TargetType;
            targetId: string;
            voteType: VoteType;
        };

        console.log(`[${requestId}] 📋 收到参数:`);
        console.log(`   - targetType: ${targetType}`);
        console.log(`   - targetId: ${targetId}`);
        console.log(`   - voteType: ${voteType}`);

        // 3. 参数验证
        console.log(`[${requestId}] [3/6] 验证参数有效性...`);
        const missingParams = missingFields(body as Record<string, unknown>, ['targetType', 'targetId', 'voteType']);
        if (missingParams.length > 0) {
            console.error(`[${requestId}] ❌ 缺少必要参数:`, missingParams);
            return jsonError(`缺少必要参数: ${missingParams.join(', ')}`, 400);
        }

        // 验证 targetType 和 voteType 的有效性
        if (!['post', 'comment'].includes(targetType)) {
            console.error(`[${requestId}] ❌ 无效的目标类型:`, targetType);
            return jsonError(
                '无效的目标类型，必须是 "post" 或 "comment"',
                400,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: { received_value: targetType }
                } : undefined
            );
        }

        if (!['up', 'down'].includes(voteType)) {
            console.error(`[${requestId}] ❌ 无效的投票类型:`, voteType);
            return jsonError(
                '无效的投票类型，必须是 "up" 或 "down"',
                400,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: { received_value: voteType }
                } : undefined
            );
        }
        
        console.log(`[${requestId}] ✅ 参数验证通过`);

        // 4. 调用 RPC 函数执行投票
        console.log(`[${requestId}] [4/6] 执行投票操作...`);
        let data: unknown = null;
        let error: { code?: string; message?: string; details?: string } | null = null;
        
        try {
            const result = await withRetry(async () => {
                const response = await db.rpc('toggle_community_vote', {
                    p_user_id: user.id,
                    p_target_type: targetType,
                    p_target_id: targetId,
                    p_vote_type: voteType,
                });
                
                if (response.error) {
                    throw response.error;
                }
                
                return response;
            });
            
            data = result.data;
            error = result.error;
        } catch (rpcError) {
            console.error(`[${requestId}] ❌ RPC调用异常:`, rpcError);
            
            // 判断是否是函数不存在的错误
            const errorMsg = rpcError instanceof Error ? rpcError.message : String(rpcError);
            if (errorMsg.includes('function toggle_community_vote does not exist') || 
                errorMsg.includes('42883')) {
                return jsonError(
                    '投票功能暂不可用，请联系管理员配置数据库',
                    503,
                    {
                        debug_info: {
                            error_code: 'FUNCTION_NOT_FOUND',
                            hint: '需要在数据库中创建 toggle_community_vote 函数',
                            migration_file: '20260505_fix_community_vote_function.sql',
                            request_id: requestId
                        }
                    }
                );
            }
            
            // 其他RPC错误
            return jsonError(
                `投票失败${process.env.NODE_ENV === 'development' ? ': ' + errorMsg : ''}`,
                500,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: {
                        error: errorMsg,
                        request_id: requestId
                    }
                } : undefined
            );
        }

        const rpcError = error as { code?: string; message?: string; details?: string } | null;
        
        if (rpcError) {
            console.error(`[${requestId}] ❌ 投票RPC返回错误:`);
            console.error(`  - 错误代码:`, rpcError.code);
            console.error(`  - 错误消息:`, rpcError.message);
            console.error(`  - 错误详情:`, rpcError.details);
            
            // 根据错误类型返回不同提示
            if (rpcError.code === '23505') {
                // 唯一约束冲突（不应该发生，但作为保护）
                return jsonError('您已经投过票了', 409);
            }
            
            if (rpcError.code === '42501') {
                // 权限不足
                return jsonError('无权进行此操作', 403);
            }
            
            return jsonError(
                `投票失败${process.env.NODE_ENV === 'development' ? ': ' + rpcError.message : ''}`,
                500,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: {
                        error_code: rpcError.code,
                        error_message: rpcError.message,
                        error_details: rpcError.details,
                        request_id: requestId
                    }
                } : undefined
            );
        }

        // 5. 验证返回结果
        console.log(`[${requestId}] [5/6] 验证返回结果...`);
        const result = (Array.isArray(data) ? data[0] : data) as { 
            status?: string; 
            vote?: VoteType | null;
            message?: string;
        } | null;

        if (!result) {
            console.error(`[${requestId}] ❌ 返回数据为空`);
            return jsonError(
                '投票失败：服务器返回了空响应',
                500,
                process.env.NODE_ENV === 'development' ? { request_id: requestId } : undefined
            );
        }

        if (result.status !== 'ok') {
            console.error(`[${requestId}] ❌ RPC返回非OK状态:`, result);
            return jsonError(
                result.message || '投票失败',
                500,
                process.env.NODE_ENV === 'development' ? {
                    received_result: result,
                    request_id: requestId
                } : undefined
            );
        }

        // 6. 成功响应
        console.log(`[${requestId}] [6/6] ✅ 投票处理完成!`);
        console.log(`[${requestId}]   结果: ${result.vote || '取消投票'}`);
        console.log(`----------------------------------------\n`);

        return jsonOk({ 
            vote: result.vote ?? null,
            message: result.message 
        });
    } catch (error) {
        console.error(`[${requestId}] 💥 投票请求处理时发生未预期异常:`);
        console.error(`  - 类型:`, error?.constructor?.name);
        console.error(`  - 消息:`, error instanceof Error ? error.message : String(error));
        console.error(`  - 堆栈:`, error instanceof Error ? error.stack : 'N/A');
        
        return jsonError(
            `投票失败${process.env.NODE_ENV === 'development' ? ': ' + (error instanceof Error ? error.message : String(error)) : ''}`,
            500,
            process.env.NODE_ENV === 'development' ? {
                debug_info: {
                    error_type: error?.constructor?.name,
                    error_message: error instanceof Error ? error.message : String(error),
                    request_id: requestId
                }
            } : undefined
        );
    }
}
