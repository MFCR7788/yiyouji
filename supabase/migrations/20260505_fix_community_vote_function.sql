-- =============================================
-- 社区投票功能修复脚本
-- 创建缺失的 toggle_community_vote RPC 函数
--
-- 修复说明：
-- - 添加切换投票（点赞/踩）的RPC函数
-- - 支持首次投票、取消投票、切换投票类型
-- - 自动更新帖子/评论的计数器
-- =============================================

-- 1. 创建切换投票的 RPC 函数
CREATE OR REPLACE FUNCTION public.toggle_community_vote(
    p_user_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_vote_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_vote RECORD;
    v_new_vote VoteType;
    v_result JSONB;
BEGIN
    -- 验证参数
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', '用户ID不能为空');
    END IF;

    IF p_target_type IS NULL OR p_target_type NOT IN ('post', 'comment') THEN
        RETURN jsonb_build_object('status', 'error', 'message', '无效的目标类型');
    END IF;

    IF p_target_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', '目标ID不能为空');
    END IF;

    IF p_vote_type IS NULL OR p_vote_type NOT IN ('up', 'down') THEN
        RETURN jsonb_build_object('status', 'error', 'message', '无效的投票类型');
    END IF;

    -- 查询是否已存在投票
    SELECT * INTO v_existing_vote
    FROM community_votes
    WHERE user_id = p_user_id
      AND target_type = p_target_type
      AND target_id = p_target_id;

    IF FOUND THEN
        -- 已存在投票
        IF v_existing_vote.vote_type = p_vote_type::vote_type THEN
            -- 相同投票类型 → 取消投票（删除）
            DELETE FROM community_votes
            WHERE id = v_existing_vote.id;
            
            v_new_vote := NULL;
            
            -- 更新计数器（减1）
            IF p_target_type = 'post' THEN
                IF p_vote_type = 'up' THEN
                    UPDATE community_posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = p_target_id;
                ELSE
                    UPDATE community_posts SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = p_target_id;
                END IF;
            ELSE -- comment
                IF p_vote_type = 'up' THEN
                    UPDATE community_comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = p_target_id;
                ELSE
                    UPDATE community_comments SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = p_target_id;
                END IF;
            END IF;
        ELSE
            -- 不同投票类型 → 切换投票（更新）
            UPDATE community_votes
            SET vote_type = p_vote_type::vote_type,
                created_at = NOW()
            WHERE id = v_existing_vote.id;
            
            v_new_vote := p_vote_type::vote_type;
            
            -- 更新计数器（原类型-1，新类型+1）
            IF p_target_type = 'post' THEN
                IF v_existing_vote.vote_type = 'up' THEN
                    UPDATE community_posts SET 
                        upvote_count = GREATEST(0, upvote_count - 1),
                        downvote_count = downvote_count + 1
                    WHERE id = p_target_id;
                ELSE
                    UPDATE community_posts SET 
                        upvote_count = upvote_count + 1,
                        downvote_count = GREATEST(0, downvote_count - 1)
                    WHERE id = p_target_id;
                END IF;
            ELSE -- comment
                IF v_existing_vote.vote_type = 'up' THEN
                    UPDATE community_comments SET 
                        upvote_count = GREATEST(0, upvote_count - 1),
                        downvote_count = downvote_count + 1
                    WHERE id = p_target_id;
                ELSE
                    UPDATE community_comments SET 
                        upvote_count = upvote_count + 1,
                        downvote_count = GREATEST(0, downvote_count - 1)
                    WHERE id = p_target_id;
                END IF;
            END IF;
        END IF;
    ELSE
        -- 不存在投票 → 新建投票（插入）
        INSERT INTO community_votes (user_id, target_type, target_id, vote_type)
        VALUES (p_user_id, p_target_type, p_target_id, p_vote_type::vote_type);
        
        v_new_vote := p_vote_type::vote_type;
        
        -- 更新计数器（+1）
        IF p_target_type = 'post' THEN
            IF p_vote_type = 'up' THEN
                UPDATE community_posts SET upvote_count = upvote_count + 1 WHERE id = p_target_id;
            ELSE
                UPDATE community_posts SET downvote_count = downvote_count + 1 WHERE id = p_target_id;
            END IF;
        ELSE -- comment
            IF p_vote_type = 'up' THEN
                UPDATE community_comments SET upvote_count = upvote_count + 1 WHERE id = p_target_id;
            ELSE
                UPDATE community_comments SET downvote_count = downvote_count + 1 WHERE id = p_target_id;
            END IF;
        END IF;
    END IF;

    -- 返回结果
    RETURN jsonb_build_object(
        'status', 'ok',
        'vote', CASE WHEN v_new_vote IS NOT NULL THEN v_new_vote::text ELSE NULL END,
        'message', '投票成功'
    );
END;
$$;

-- 授予权限
REVOKE ALL ON FUNCTION public.toggle_community_vote(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_community_vote(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_community_vote(UUID, TEXT, UUID, TEXT) TO service_role;

-- 添加注释
COMMENT ON FUNCTION public.toggle_community_vote IS '切换社区投票状态：新建/取消/切换投票类型，并自动更新计数器';

-- 2. 验证函数是否创建成功
SELECT 
    routine_name as "函数名",
    routine_type as "类型",
    data_type as "返回类型"
FROM information_schema.routines
WHERE routine_name = 'toggle_community_vote'
  AND routine_schema = 'public';
