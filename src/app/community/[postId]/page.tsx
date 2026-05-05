/**
 * 帖子详情页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter, useParams 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    adminDeletePost,
    adminFeaturePost,
    adminPinPost,
    CommunityPost,
    CommunityComment,
    createComment,
    deleteComment,
    deletePost,
    getPostDetail,
    vote,
    VoteType,
} from '@/lib/community';
import { supabase } from '@/lib/auth';
import { loadAdminClientAccessState } from '@/lib/admin/client';
import { useToast } from '@/components/ui/Toast';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PostNavBar, ReportModal, EditPostModal } from '@/components/community/PostActions';
import { PostDetail } from '@/components/community/PostDetail';
import { CommentSection } from '@/components/community/CommentSection';

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.postId as string;
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState<CommunityPost | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isAuthor, setIsAuthor] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authResolved, setAuthResolved] = useState(false);
    const [userVotes, setUserVotes] = useState<Map<string, VoteType>>(new Map());
    const [postVote, setPostVote] = useState<VoteType | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [confirmDeleteState, setConfirmDeleteState] = useState<{ type: 'comment' | 'post'; id?: string } | null>(null);

    // 加载用户信息
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
                if (user) {
                    try {
                        const access = await loadAdminClientAccessState();
                        setIsAdmin(access.isAdmin);
                    } catch (error) {
                        console.error('获取社区管理员状态失败:', error);
                        setIsAdmin(false);
                        showToast('error', error instanceof Error ? error.message : '管理员权限获取失败');
                    }
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('获取社区登录态失败:', error);
                setUser(null);
                setIsAdmin(false);
                showToast('error', error instanceof Error ? error.message : '认证状态获取失败');
            } finally {
                setAuthResolved(true);
            }
        };
        void checkAuth();
    }, [showToast]);

    // 加载帖子
    const loadPost = useCallback(async () => {
        setLoading(true);
        try {
            console.log('[PostDetailPage] 开始加载帖子:', postId);
            
            const detail = await getPostDetail(postId);
            
            if (!detail) {
                console.warn('[PostDetailPage] 帖子不存在或已被删除');
                setPost(null);
                setComments([]);
                setIsAuthor(false);
                setPostVote(null);
                setUserVotes(new Map());
                setLoadError('帖子不存在或已被删除');
                return;
            }
            
            console.log('[PostDetailPage] 帖子加载成功:', detail.post.title);
            setPost(detail.post);
            setComments(detail.comments);
            setIsAuthor(detail.viewer.isAuthor);
            setPostVote(detail.viewerVotes.post);
            setUserVotes(new Map(Object.entries(detail.viewerVotes.comments)));
            setLoadError(null);
        } catch (error: unknown) {
            console.error('[PostDetailPage] 加载帖子失败:', error);
            
            // 增强错误处理：提取详细信息
            let errorMessage = '获取帖子失败';
            
            if (error instanceof Error) {
                errorMessage = error.message;
                
                // 检查是否是 API 返回的带 debug_info 的错误
                const errorWithDebug = error as Error & { 
                    debug_info?: Record<string, unknown>;
                    code?: string;
                    status?: number;
                };
                
                if (errorWithDebug.debug_info && process.env.NODE_ENV === 'development') {
                    console.error('[PostDetailPage] 调试信息:', errorWithDebug.debug_info);
                    errorMessage += `\n\n[调试信息] ${JSON.stringify(errorWithDebug.debug_info, null, 2)}`;
                }
                
                // 根据不同的错误状态码提供更友好的提示
                if (errorWithDebug.status === 404) {
                    errorMessage = '帖子不存在或已被删除';
                } else if (errorWithDebug.status === 403) {
                    errorMessage = '无权访问该帖子';
                } else if (errorWithDebug.status === 500) {
                    errorMessage = '服务器内部错误，请稍后重试';
                }
            } else if (typeof error === 'object' && error !== null) {
                const errorObj = error as Record<string, unknown>;
                errorMessage = (errorObj.message as string) || 
                              (errorObj.error as string) || 
                              JSON.stringify(errorObj);
            }
            
            setPost(null);
            setComments([]);
            setIsAuthor(false);
            setPostVote(null);
            setUserVotes(new Map());
            setLoadError(errorMessage);
            
            // 显示 Toast 通知（简要版）
            showToast('error', '加载帖子失败');
        } finally {
            setLoading(false);
        }
    }, [postId, showToast]);

    useEffect(() => {
        void loadPost();
    }, [loadPost]);

    // 投票
    const handleVote = async (targetType: 'post' | 'comment', targetId: string, voteType: VoteType) => {
        if (!user) {
            showToast('warning', '请先登录');
            return;
        }

        const currentVote = targetType === 'post' ? postVote : userVotes.get(targetId) || null;

        const calculateVoteChange = (current: VoteType | null, newVote: VoteType) => {
            let upChange = 0;
            let downChange = 0;

            if (current === newVote) {
                if (newVote === 'up') upChange = -1;
                else downChange = -1;
                return { upChange, downChange, resultVote: null };
            } else if (current === null) {
                if (newVote === 'up') upChange = 1;
                else downChange = 1;
                return { upChange, downChange, resultVote: newVote };
            } else {
                if (newVote === 'up') {
                    upChange = 1;
                    downChange = -1;
                } else {
                    upChange = -1;
                    downChange = 1;
                }
                return { upChange, downChange, resultVote: newVote };
            }
        };

        const { upChange, downChange, resultVote } = calculateVoteChange(currentVote, voteType);

        // 乐观更新 UI
        if (targetType === 'post' && post) {
            setPostVote(resultVote);
            setPost(prev => prev ? {
                ...prev,
                upvote_count: prev.upvote_count + upChange,
                downvote_count: prev.downvote_count + downChange,
            } : null);
        } else {
            setUserVotes(prev => {
                const newMap = new Map(prev);
                if (resultVote) {
                    newMap.set(targetId, resultVote);
                } else {
                    newMap.delete(targetId);
                }
                return newMap;
            });
            setComments(prev => updateCommentVotes(prev, targetId, upChange, downChange));
        }

        try {
            await vote(targetType, targetId, voteType);
        } catch (error) {
            // 回滚
            if (targetType === 'post' && post) {
                setPostVote(currentVote);
                setPost(prev => prev ? {
                    ...prev,
                    upvote_count: prev.upvote_count - upChange,
                    downvote_count: prev.downvote_count - downChange,
                } : null);
            } else {
                setUserVotes(prev => {
                    const newMap = new Map(prev);
                    if (currentVote) {
                        newMap.set(targetId, currentVote);
                    } else {
                        newMap.delete(targetId);
                    }
                    return newMap;
                });
                setComments(prev => updateCommentVotes(prev, targetId, -upChange, -downChange));
            }
            showToast('error', error instanceof Error ? error.message : '投票失败');
        }
    };

    const updateCommentVotes = (
        commentList: CommunityComment[],
        targetId: string,
        upChange: number,
        downChange: number
    ): CommunityComment[] => {
        return commentList.map(comment => {
            if (comment.id === targetId) {
                return {
                    ...comment,
                    upvote_count: comment.upvote_count + upChange,
                    downvote_count: comment.downvote_count + downChange,
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateCommentVotes(comment.replies, targetId, upChange, downChange),
                };
            }
            return comment;
        });
    };

    // 发表评论
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim() || !user) return;

        setSubmitting(true);
        try {
            const newComment = await createComment({
                post_id: postId,
                content: commentContent.trim(),
                parent_id: replyTo || undefined,
            });
            setCommentContent('');

            if (replyTo) {
                setComments(prev => addReplyToComment(prev, replyTo, { ...newComment, replies: [] }));
            } else {
                setComments(prev => [...prev, { ...newComment, replies: [] }]);
            }
            setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
            setReplyTo(null);
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : '发表评论失败，请重试');
        } finally {
            setSubmitting(false);
        }
    };

    const addReplyToComment = (
        commentList: CommunityComment[],
        parentId: string,
        newReply: CommunityComment
    ): CommunityComment[] => {
        return commentList.map(comment => {
            if (comment.id === parentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), { ...newReply, replies: [] }],
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: addReplyToComment(comment.replies, parentId, newReply),
                };
            }
            return comment;
        });
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!user) {
            showToast('warning', '请先登录');
            return;
        }

        try {
            await deleteComment(commentId);
            setComments(prev => removeCommentFromList(prev, commentId));
            setPost(prev => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : null);
            setConfirmDeleteState(null);
        } catch (error) {
            showToast('error', error instanceof Error ? error.message : '删除评论失败');
        }
    };

    const removeCommentFromList = (commentList: CommunityComment[], commentId: string): CommunityComment[] => {
        return commentList.reduce<CommunityComment[]>((acc, comment) => {
            if (comment.id === commentId) {
                return acc;
            }
            const nextReplies = comment.replies?.length
                ? removeCommentFromList(comment.replies, commentId)
                : comment.replies;
            acc.push(nextReplies !== comment.replies ? { ...comment, replies: nextReplies } : comment);
            return acc;
        }, []);
    };

    const handleDeletePost = async () => {
        try {
            await deletePost(postId);
            setConfirmDeleteState(null);
            router.push('/community');
        } catch (error) {
            showToast('error', error instanceof Error ? error.message : '删除帖子失败');
        }
    };

    const handleAdminAction = async (action: 'pin' | 'feature' | 'delete', value?: boolean) => {
        try {
            if (action === 'pin') {
                await adminPinPost(postId, value === true);
            } else if (action === 'feature') {
                await adminFeaturePost(postId, value === true);
            } else {
                await adminDeletePost(postId);
                router.push('/community');
                return;
            }
            await loadPost();
        } catch (error) {
            showToast('error', error instanceof Error ? error.message : '管理员操作失败');
        }
    };

    if (loading || !authResolved) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <SoundWaveLoader variant="block" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    {/* 错误图标 */}
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <svg 
                                className="w-10 h-10 text-red-500 dark:text-red-400" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                                />
                            </svg>
                        </div>
                    </div>

                    {/* 错误标题和描述 */}
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        {loadError?.includes('不存在') || loadError?.includes('已删除') ? '帖子不存在' : '加载失败'}
                    </h2>
                    
                    {/* 详细错误信息（仅在开发环境或非通用错误时显示） */}
                    {loadError && (
                        <p className="text-sm text-foreground-secondary mb-2 leading-relaxed">
                            {loadError.includes('获取帖子失败') && !loadError.includes(':') 
                                ? '无法加载帖子详情，请检查网络连接后重试' 
                                : loadError.split('\n')[0] // 只显示第一行，避免显示调试信息
                            }
                        </p>
                    )}

                    {!loadError && (
                        <p className="text-foreground-secondary mb-6">
                            该帖子可能已被删除或不存在
                        </p>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-3 justify-center mt-6">
                        {loadError && !loadError.includes('不存在') && !loadError.includes('已删除') && (
                            <button
                                onClick={() => { void loadPost(); }}
                                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                重新加载
                            </button>
                        )}
                        
                        <button
                            onClick={() => router.push('/community')}
                            className="px-6 py-2.5 bg-background-secondary text-foreground rounded-lg hover:bg-background-tertiary transition-colors font-medium flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            返回社区
                        </button>
                    </div>

                    {/* 帮助提示（可选） */}
                    {loadError && (loadError.includes('500') || loadError.includes('服务器')) && (
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                                <span>💡</span>
                                <span>
                                    如果问题持续存在，请尝试：
                                    <br />• 刷新页面
                                    <br />• 清除浏览器缓存
                                    <br />• 稍后再试
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <PostNavBar
                isAuthor={isAuthor}
                isAdmin={isAdmin}
                post={post}
                onBack={() => router.push('/community')}
                onEdit={() => setShowEditModal(true)}
                onDelete={() => setConfirmDeleteState({ type: 'post' })}
                onAdminAction={handleAdminAction}
            />

            <main className="max-w-3xl mx-auto px-4 py-8">
                <PostDetail
                    post={post}
                    postVote={postVote}
                    onVote={(type) => handleVote('post', post.id, type)}
                    onReport={() => setReportTarget({ type: 'post', id: post.id })}
                />

                <CommentSection
                    comments={comments}
                    userId={user?.id || null}
                    isAdmin={isAdmin}
                    userVotes={userVotes}
                    replyTo={replyTo}
                    commentContent={commentContent}
                    submitting={submitting}
                    onCommentContentChange={setCommentContent}
                    onReplyToChange={setReplyTo}
                    onSubmitComment={handleComment}
                    onVote={(id, type) => handleVote('comment', id, type)}
                    onDeleteComment={(id) => setConfirmDeleteState({ type: 'comment', id })}
                    onReportComment={(id) => setReportTarget({ type: 'comment', id })}
                />
            </main>

            {reportTarget && (
                <ReportModal
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    onClose={() => setReportTarget(null)}
                />
            )}
            {showEditModal && post && (
                <EditPostModal
                    post={post}
                    onClose={() => setShowEditModal(false)}
                    onSave={(updatedPost) => setPost(updatedPost)}
                />
            )}
            <ConfirmDialog
                isOpen={!!confirmDeleteState}
                onClose={() => setConfirmDeleteState(null)}
                onConfirm={() => confirmDeleteState?.type === 'comment'
                    ? handleDeleteComment(confirmDeleteState.id!)
                    : handleDeletePost()}
                title="确认删除"
                description={confirmDeleteState?.type === 'comment'
                    ? '确定要删除这条评论吗？此操作无法撤销。'
                    : '确定要删除这个帖子吗？此操作无法撤销。'}
                confirmText="确认删除"
                variant="danger"
            />
        </div>
    );
}
