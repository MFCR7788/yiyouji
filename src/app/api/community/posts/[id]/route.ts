/**
 * 单个帖子 API 路由 - 增强版（带详细错误诊断）
 *
 * GET: 获取帖子详情
 * PUT: 更新帖子
 * DELETE: 删除帖子（软删除）
 *
 * 增加了详细的错误日志记录、调试信息和诊断功能
 */
import { NextRequest } from 'next/server';
import { CommunityComment, normalizePostInput } from '@/lib/community';
import { asCommunityLookupClient, loadCommunityAuthorProfileMap, toPublicPost, type CommunityPostRow } from '@/lib/community-server';
import { getAuthContext, jsonError, jsonOk, requireUserContext, getSystemAdminClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';

type CommunityCommentRow = Omit<CommunityComment, 'author_name' | 'author_avatar_url' | 'replies'> & {
    user_id: string;
    replies?: CommunityCommentRow[];
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`\n[${requestId}] 📝 开始获取帖子详情...`);
        
        // 1. 认证检查
        console.log(`[${requestId}] [1/6] 验证用户身份...`);
        const auth = await getAuthContext(_request);
        if (auth.authError) {
            console.error(`[${requestId}] ❌ 认证失败:`, auth.authError.message);
            return jsonError(auth.authError.message, auth.authError.status);
        }
        const { user } = auth;
        const db = auth.db;
        console.log(`[${requestId}] ✅ 用户已认证: ${user?.id || '(匿名)'}`);

        // 2. 获取帖子ID参数
        console.log(`[${requestId}] [2/6] 解析请求参数...`);
        const { id } = await params;
        
        if (!id || id === 'undefined' || id === 'null') {
            console.error(`[${requestId}] ❌ 无效的帖子ID:`, id);
            return jsonError('无效的帖子ID', 400);
        }
        console.log(`[${requestId}] 📋 帖子ID: ${id}`);

        // 3. 查询帖子数据
        console.log(`[${requestId}] [3/6] 查询帖子数据...`);
        let post: CommunityPostRow | null = null;
        let postError: { code?: string; message?: string; details?: string } | null = null;
        
        try {
            const result = await db
                .from('community_posts')
                .select('*')
                .eq('id', id)
                .eq('is_deleted', false)
                .single();
            post = result.data as CommunityPostRow | null;
            postError = result.error as { code?: string; message?: string; details?: string } | null;
        } catch (dbError) {
            console.error(`[${requestId}] ❌ 数据库查询异常:`, dbError);
            return jsonError('数据库连接失败，请稍后重试', 500);
        }

        if (postError) {
            console.error(`[${requestId}] ❌ 查询帖子失败:`);
            console.error(`  - 错误代码:`, postError.code);
            console.error(`  - 错误消息:`, postError.message);
            console.error(`  - 错误详情:`, postError.details);
            console.error(`  - 完整错误:`, JSON.stringify(postError));
            
            if (postError.code === 'PGRST116') {
                console.warn(`[${requestId}] ⚠️ 帖子不存在或已被删除`);
                return jsonError('帖子不存在或已被删除', 404);
            }
            
            if (postError.code === '42501') {
                console.error(`[${requestId}] ❌ 权限不足 (RLS策略限制)`);
                return jsonError(
                    '无权访问该帖子',
                    403,
                    process.env.NODE_ENV === 'development' ? {
                        debug_info: {
                            error_code: postError.code,
                            hint: '检查 RLS 策略配置'
                        }
                    } : undefined
                );
            }
            
            return jsonError(
                `获取帖子失败${process.env.NODE_ENV === 'development' ? ': ' + postError.message : ''}`,
                500,
                process.env.NODE_ENV === 'development' ? {
                    debug_info: {
                        error_code: postError.code,
                        error_message: postError.message,
                        request_id: requestId
                    }
                } : undefined
            );
        }

        if (!post) {
            console.warn(`[${requestId}] ⚠️ 帖子不存在`);
            return jsonError('帖子不存在或已被删除', 404);
        }
        
        console.log(`[${requestId}] ✅ 帖子查询成功: "${post.title}"`);

        // 4. 更新浏览量（使用 Service Role）
        console.log(`[${requestId}] [4/6] 更新浏览量...`);
        const serviceClient = getSystemAdminClient();
        try {
            await withRetry(async () => {
                const { error } = await serviceClient
                    .rpc('increment_community_post_view_count', { post_id: id });
                if (error) {
                    throw error;
                }
            });
            console.log(`[${requestId}] ✅ 浏览量更新成功`);
        } catch (viewError) {
            // 浏览量更新失败不应该阻止帖子显示
            console.warn(`[${requestId}] ⚠️ 浏览量更新失败（非致命）:`, viewError);
        }

        // 5. 获取评论
        console.log(`[${requestId}] [5/6] 获取评论列表...`);
        let commentsData = [];
        let commentsError = null;
        
        try {
            const commentsResult = await withRetry(async () => {
                const response = await serviceClient
                    .from('community_comments')
                    .select('*')
                    .eq('post_id', id)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: true });
                if (response.error) {
                    throw response.error;
                }
                return response;
            });
            
            commentsData = commentsResult.data || [];
            commentsError = commentsResult.error;
            
            if (commentsError) {
                console.error(`[${requestId}] ❌ 获取评论失败:`, commentsError);
            } else {
                console.log(`[${requestId}] ✅ 评论获取成功 (${commentsData.length} 条)`);
            }
        } catch (commentFetchError) {
            console.error(`[${requestId}] ❌ 评论获取异常:`, commentFetchError);
            commentsError = commentFetchError;
        }

        // 6. 处理作者信息、投票等附加数据
        console.log(`[${requestId}] [6/6] 处理附加数据...`);
        
        try {
            const authorMap = await loadCommunityAuthorProfileMap(asCommunityLookupClient(serviceClient), [
                post.user_id,
                ...((commentsData || []).map((comment: CommunityCommentRow) => comment.user_id)),
            ]);

            type CommentWithReplies = CommunityCommentRow & { replies: CommentWithReplies[] };
            const comments: CommentWithReplies[] = (commentsData || []).map((comment: CommunityCommentRow) => ({
                ...comment,
                replies: [],
            }));

            const commentMap = new Map<string, CommentWithReplies>();
            const rootComments: CommentWithReplies[] = [];

            comments.forEach(comment => {
                commentMap.set(comment.id, comment);
            });

            comments.forEach(comment => {
                if (comment.parent_id) {
                    const parent = commentMap.get(comment.parent_id);
                    if (parent) {
                        parent.replies.push(comment);
                    }
                } else {
                    rootComments.push(comment);
                }
            });

            // 获取当前用户信息
            const currentUserId = user?.id;
            const isPostAuthor = currentUserId ? post.user_id === currentUserId : false;
            const viewer = {
                isAuthenticated: !!currentUserId,
                isAuthor: isPostAuthor,
            };
            const commentIds = comments.map((comment) => comment.id);
            const viewerVotes = {
                post: null as 'up' | 'down' | null,
                comments: {} as Record<string, 'up' | 'down'>,
            };

            // 获取投票状态
            if (currentUserId) {
                const voteTargetIds = [post.id, ...commentIds];
                if (voteTargetIds.length > 0) {
                    try {
                        const voteResult = await withRetry(async () => {
                            const response = await serviceClient
                                .from('community_votes')
                                .select('target_type, target_id, vote_type')
                                .eq('user_id', currentUserId)
                                .in('target_id', voteTargetIds);
                            if (response.error) {
                                throw response.error;
                            }
                            return response;
                        });

                        if (voteResult.error) {
                            console.error(`[${requestId}] ⚠️ 获取投票状态失败:`, voteResult.error);
                        } else {
                            for (const row of voteResult.data || []) {
                                if (row.target_type === 'post' && row.target_id === post.id) {
                                    viewerVotes.post = row.vote_type as 'up' | 'down';
                                    continue;
                                }
                                if (row.target_type === 'comment' && typeof row.target_id === 'string') {
                                    viewerVotes.comments[row.target_id] = row.vote_type as 'up' | 'down';
                                }
                            }
                        }
                    } catch (voteError) {
                        console.error(`[${requestId}] ⚠️ 投票状态获取异常:`, voteError);
                    }
                }
            }

            // 为评论添加 author/isAuthor 标记
            type SafeComment = Omit<CommentWithReplies, 'user_id' | 'replies'> & {
                author_name: string;
                author_avatar_url: string | null;
                isAuthor: boolean;
                isPostAuthor: boolean;
                replies: SafeComment[];
            };
            
            function processComment(comment: CommentWithReplies): SafeComment {
                const isCommentAuthor = currentUserId ? comment.user_id === currentUserId : false;
                const isCommentPostAuthor = post ? comment.user_id === post.user_id : false;
                const { replies, ...safeComment } = comment;
                delete (safeComment as { user_id?: unknown }).user_id;
                const authorProfile = authorMap.get(comment.user_id) || { name: '命理爱好者', avatarUrl: null };
                return {
                    ...safeComment,
                    author_name: authorProfile.name,
                    author_avatar_url: authorProfile.avatarUrl,
                    isAuthor: isCommentAuthor,
                    isPostAuthor: isCommentPostAuthor,
                    replies: (replies || []).map(processComment),
                };
            }

            const safePost = toPublicPost(
                post as CommunityPostRow,
                authorMap.get(post.user_id) || { name: '命理爱好者', avatarUrl: null },
            );
            const safeComments = rootComments.map(c => processComment(c));

            console.log(`[${requestId}] 🎉 帖子详情获取成功!`);
            console.log(`[${requestId}]   标题: ${safePost.title}`);
            console.log(`[${requestId}]   评论数: ${safeComments.length}`);
            console.log(`----------------------------------------\n`);

            return jsonOk({
                post: safePost,
                comments: safeComments,
                viewer,
                viewerVotes,
            });
        } catch (processingError) {
            console.error(`[${requestId}] ❌ 数据处理异常:`, processingError);
            
            // 即使数据处理失败，也返回基本帖子信息
            const fallbackCurrentUserId = user?.id || null;
            const fallbackAuthorMap = new Map([[post!.user_id, { name: '命理爱好者', avatarUrl: null }]]);
            const safePost = toPublicPost(
                post as CommunityPostRow,
                fallbackAuthorMap.get(post!.user_id)!
            );
            
            return jsonOk({
                post: safePost,
                comments: [],
                viewer: {
                    isAuthenticated: !!fallbackCurrentUserId,
                    isAuthor: fallbackCurrentUserId ? post!.user_id === fallbackCurrentUserId : false,
                },
                viewerVotes: {
                    post: null,
                    comments: {},
                },
                warning: '部分附加数据加载失败',
            });
        }
    } catch (error) {
        console.error(`[${requestId}] 💥 获取帖子详情时发生未预期异常:`);
        console.error(`  - 类型:`, error?.constructor?.name);
        console.error(`  - 消息:`, error instanceof Error ? error.message : String(error));
        console.error(`  - 堆栈:`, error instanceof Error ? error.stack : 'N/A');
        
        return jsonError(
            `获取帖子失败${process.env.NODE_ENV === 'development' ? ': ' + (error instanceof Error ? error.message : String(error)) : ''}`,
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

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;
        const db = auth.db;

        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return jsonError('请求体不是合法 JSON', 400);
        }

        const normalized = normalizePostInput(body, 'update');
        if ('error' in normalized) {
            return jsonError(normalized.error, 400);
        }

        // 只允许用户更新特定字段，防止权限提升
        const updateData: Record<string, unknown> = {
            ...normalized.data,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await db
            .from('community_posts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('更新帖子失败:', error);
            return jsonError('更新帖子失败', 500);
        }

        const authorMap = await loadCommunityAuthorProfileMap(asCommunityLookupClient(db), [user.id]);
        return jsonOk(
            toPublicPost(data as CommunityPostRow, authorMap.get(user.id) || { name: '命理爱好者', avatarUrl: null }),
        );
    } catch (error) {
        console.error('更新帖子失败:', error);
        return jsonError('更新帖子失败', 500);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;
        const db = auth.db;

        const { id } = await params;

        const { error } = await db
            .from('community_posts')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('删除帖子失败:', error);
            return jsonError('删除帖子失败', 500);
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('删除帖子失败:', error);
        return jsonError('删除帖子失败', 500);
    }
}
