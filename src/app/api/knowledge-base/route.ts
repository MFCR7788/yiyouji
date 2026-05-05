/**
 * 知识库 API 路由 - 增强版（带详细错误诊断）
 *
 * 增加了详细的错误日志记录和调试信息
 */
import { NextRequest } from 'next/server';
import { getEffectiveMembershipType, MembershipResolutionError } from '@/lib/user/membership-server';
import { requireUserContext, jsonError, jsonOk, resolveRequestDbClient } from '@/lib/api-utils';
import { ensureFeatureRouteEnabled } from '@/lib/feature-gate-utils';
import { normalizeKnowledgeBaseInput } from '@/lib/knowledge-base/ingest';

export async function GET(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;
    const db = resolveRequestDbClient(auth);
    if (!db) return jsonError('获取知识库失败', 500);

    const { data, error } = await db
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return jsonError('获取知识库失败', 500);
    return jsonOk({ knowledgeBases: data || [] });
}

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    console.log(`\n[${requestId}] 📝 开始创建知识库...`);
    
    // 1. 检查功能开关
    console.log(`[${requestId}] [1/7] 检查知识库功能开关...`);
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) {
        console.error(`[${requestId}] ❌ 功能开关未启用`);
        return featureError;
    }
    console.log(`[${requestId}] ✅ 功能开关已启用`);

    // 2. 用户认证
    console.log(`[${requestId}] [2/7] 验证用户身份...`);
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        console.error(`[${requestId}] ❌ 认证失败:`, auth.error.message);
        return jsonError(auth.error.message, auth.error.status);
    }
    const { user } = auth;
    console.log(`[${requestId}] ✅ 用户已认证: ${user.id}`);

    // 3. 获取数据库客户端
    console.log(`[${requestId}] [3/7] 获取数据库连接...`);
    const db = resolveRequestDbClient(auth);
    if (!db) {
        console.error(`[${requestId}] ❌ 数据库客户端为空`);
        return jsonError('创建知识库失败：无法连接到数据库', 500);
    }
    console.log(`[${requestId}] ✅ 数据库连接成功`);

    // 4. 解析请求体
    console.log(`[${requestId}] [4/7] 解析请求参数...`);
    let body: unknown;
    try {
        body = await request.json();
        console.log(`[${requestId}] 📋 请求参数:`, JSON.stringify(body));
    } catch (parseError) {
        console.error(`[${requestId}] ❌ JSON解析失败:`, parseError);
        return jsonError('请求体不是合法的JSON格式', 400);
    }

    const normalized = normalizeKnowledgeBaseInput(body, 'create');
    if ('error' in normalized) {
        console.error(`[${requestId}] ❌ 参数验证失败:`, normalized.error);
        return jsonError(normalized.error, 400);
    }
    console.log(`[${requestId}] ✅ 参数验证通过: name="${normalized.data.name}"`);

    // 5. 检查会员等级
    console.log(`[${requestId}] [5/7] 检查会员等级...`);
    let membership;
    try {
        membership = await getEffectiveMembershipType(user.id, { client: db });
        console.log(`[${requestId}] 👤 当前会员等级: ${membership}`);
    } catch (error) {
        console.error(`[${requestId}] ❌ 会员等级查询失败:`, error);
        if (error instanceof MembershipResolutionError) {
            return jsonError(`会员验证失败: ${error.message}`, 500);
        }
        throw error;
    }

    if (membership === 'free') {
        console.error(`[${requestId}] ❌ Free 用户无权创建知识库`);
        return jsonError(
            '当前会员等级（Free）无法创建知识库。请升级到 Plus 或 Pro 会员。',
            403
        );
    }
    console.log(`[${requestId}] ✅ 会员权限检查通过`);

    // 6. 检查当前知识库数量
    console.log(`[${requestId}] [6/7] 检查知识库数量限制...`);
    const limit = membership === 'plus' ? 3 : 10;
    console.log(`[${requestId}] 📊 数量限制: ${membership} 用户最多 ${limit} 个`);

    // 先查询当前数量
    const { count, error: countError } = await db
        .from('knowledge_bases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (countError) {
        console.error(`[${requestId}] ❌ 查询知识库数量失败:`, countError);
    } else {
        console.log(`[${requestId}] 📈 当前已有: ${count} 个知识库`);
        
        if (count !== null && count >= limit) {
            console.error(`[${requestId}] ❌ 已达到数量上限 (${count}/${limit})`);
            return jsonError(
                `知识库数量已达上限（${count}/${limit}）。请删除不需要的知识库或升级会员等级。`,
                403
            );
        }
    }

    // 7. 执行 RPC 创建
    console.log(`[${requestId}] [7/7] 调用数据库函数创建...`);
    try {
        const { data, error } = await db.rpc('create_knowledge_base_with_limit', {
            p_user_id: user.id,
            p_name: normalized.data.name,
            p_description: normalized.data.description ?? null,
            p_weight: normalized.data.weight ?? 'normal',
            p_limit: limit,
        });

        if (error) {
            console.error(`[${requestId}] ❌ RPC 函数调用失败:`);
            console.error(`  - 错误代码:`, error.code);
            console.error(`  - 错误消息:`, error.message);
            console.error(`  - 错误详情:`, error.details);
            console.error(`  - 完整错误对象:`, JSON.stringify(error, null, 2));
            
            // 根据错误类型返回不同的提示
            if (error.code === '42883') {
                // 函数不存在
                return jsonError(
                    '数据库函数未找到。请在 Supabase SQL Editor 中执行迁移文件:\n\nsupabase/migrations/20260505_fix_knowledge_base_rpc_functions.sql',
                    500,
                    { 
                        debug_info: {
                            error_code: error.code,
                            error_hint: '需要执行数据库迁移',
                            migration_file: '20260505_fix_knowledge_base_rpc_functions.sql'
                        }
                    }
                );
            } else if (error.code === '42501') {
                // 权限不足
                return jsonError(
                    '数据库权限不足。请检查 RLS 策略配置或联系管理员。',
                    403,
                    { debug_info: { error_code: error.code } }
                );
            } else {
                return jsonError(
                    `创建知识库失败: ${error.message || '未知数据库错误'}`,
                    500,
                    { 
                        debug_info: process.env.NODE_ENV === 'development' ? {
                            error_code: error.code,
                            error_message: error.message,
                            error_details: error.details,
                            request_id: requestId
                        } : undefined
                    }
                );
            }
        }

        console.log(`[${requestId}] ✅ RPC 调用成功`);
        console.log(`[${requestId}] 📦 返回数据:`, JSON.stringify(data));

        // 验证返回结果
        const result = (Array.isArray(data) ? data[0] : data) as {
            status?: string;
            knowledge_base?: Record<string, unknown> | null;
            message?: string;
        } | null;

        if (!result) {
            console.error(`[${requestId}] ❌ 返回数据为空`);
            return jsonError(
                '创建知识库失败：服务器返回了空响应',
                500,
                { debug_info: { request_id: requestId } }
            );
        }

        if (result.status === 'limit_reached') {
            console.error(`[${requestId}] ❌ 达到数量限制 (RPC 返回):`, result);
            return jsonError(
                `知识库数量已达上限。`,
                403,
                result
            );
        }

        if (result.status === 'error') {
            console.error(`[${requestId}] ❌ RPC 返回错误状态:`, result);
            return jsonError(
                `创建知识库失败: ${result.message || '未知错误'}`,
                500,
                result
            );
        }

        if (result.status !== 'ok' || !result.knowledge_base) {
            console.error(`[${requestId}] ❌ 无效的 RPC 结果:`, result);
            return jsonError(
                '创建知识库失败：返回结果格式不正确',
                500,
                { 
                    debug_info: process.env.NODE_ENV === 'development' ? {
                        received_result: result,
                        request_id: requestId
                    } : undefined
                }
            );
        }

        console.log(`[${requestId}] 🎉 知识库创建成功!`);
        console.log(`[${requestId}]   ID: ${(result.knowledge_base as Record<string, unknown>).id}`);
        console.log(`[${requestId}]   名称: ${(result.knowledge_base as Record<string, unknown>).name}`);
        console.log(`----------------------------------------\n`);

        return jsonOk(result.knowledge_base);
    } catch (rpcError) {
        console.error(`[${requestId}] 💥 RPC 调用异常:`, rpcError);
        console.error(`  - 类型:`, rpcError?.constructor?.name);
        console.error(`  - 消息:`, rpcError instanceof Error ? rpcError.message : String(rpcError));
        console.error(`  - 堆栈:`, rpcError instanceof Error ? rpcError.stack : 'N/A');
        
        return jsonError(
            `创建知识库时发生异常: ${rpcError instanceof Error ? rpcError.message : '未知错误'}`,
            500,
            { 
                debug_info: process.env.NODE_ENV === 'development' ? {
                    error_type: rpcError?.constructor?.name,
                    error_message: rpcError instanceof Error ? rpcError.message : String(rpcError),
                    request_id: requestId
                } : undefined
            }
        );
    }
}
