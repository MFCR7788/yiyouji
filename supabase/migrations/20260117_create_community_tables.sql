-- Phase 6: 命理社区数据库表
-- 创建时间: 2026-01-17

-- =====================================================
-- 帖子表 (community_posts)
-- =====================================================
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anonymous_name text NOT NULL DEFAULT '匿名用户', -- 用户可自定义的匿名显示名
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general', -- general, bazi, ziwei, liuyao, tarot, other
  tags text[] DEFAULT '{}',
  view_count integer DEFAULT 0,
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =====================================================
-- 用户帖子匿名映射表 (用于同一帖子内保持匿名一致)
-- =====================================================
CREATE TABLE public.community_anonymous_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  anonymous_name text NOT NULL DEFAULT '匿名用户',
  display_order integer NOT NULL DEFAULT 1, -- 楼层顺序，用于显示如 "匿名用户A"
  created_at timestamptz DEFAULT now(),
  CONSTRAINT community_anonymous_mapping_pkey PRIMARY KEY (id),
  CONSTRAINT community_anonymous_mapping_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE,
  CONSTRAINT community_anonymous_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT community_anonymous_mapping_unique UNIQUE (post_id, user_id)
);

-- =====================================================
-- 评论表 (community_comments)
-- =====================================================
CREATE TABLE public.community_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid, -- 回复的评论ID，NULL表示顶级评论
  content text NOT NULL,
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT community_comments_pkey PRIMARY KEY (id),
  CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE,
  CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT community_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.community_comments(id) ON DELETE CASCADE
);

-- =====================================================
-- 投票表 (community_votes) - 点赞/踩
-- =====================================================
CREATE TABLE public.community_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT community_votes_pkey PRIMARY KEY (id),
  CONSTRAINT community_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT community_votes_unique UNIQUE (user_id, target_type, target_id)
);

-- =====================================================
-- 举报表 (community_reports)
-- =====================================================
CREATE TABLE public.community_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL, -- spam, abuse, inappropriate, other
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT community_reports_pkey PRIMARY KEY (id),
  CONSTRAINT community_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT community_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

-- =====================================================
-- 索引
-- =====================================================
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_category ON public.community_posts(category);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_is_pinned ON public.community_posts(is_pinned DESC, created_at DESC);
CREATE INDEX idx_community_posts_not_deleted ON public.community_posts(is_deleted) WHERE is_deleted = false;

CREATE INDEX idx_community_anonymous_mapping_post_id ON public.community_anonymous_mapping(post_id);
CREATE INDEX idx_community_anonymous_mapping_user_id ON public.community_anonymous_mapping(user_id);

CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX idx_community_comments_user_id ON public.community_comments(user_id);
CREATE INDEX idx_community_comments_parent_id ON public.community_comments(parent_id);
CREATE INDEX idx_community_comments_not_deleted ON public.community_comments(is_deleted) WHERE is_deleted = false;

CREATE INDEX idx_community_votes_target ON public.community_votes(target_type, target_id);
CREATE INDEX idx_community_votes_user_target ON public.community_votes(user_id, target_type, target_id);

CREATE INDEX idx_community_reports_status ON public.community_reports(status);
CREATE INDEX idx_community_reports_target ON public.community_reports(target_type, target_id);

-- =====================================================
-- RLS 策略
-- =====================================================
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_anonymous_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- 帖子 RLS
CREATE POLICY "Anyone can view non-deleted posts" ON public.community_posts
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create posts" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (is_deleted = true);

-- 匿名映射 RLS
CREATE POLICY "Anyone can view anonymous mappings" ON public.community_anonymous_mapping
  FOR SELECT USING (true);

CREATE POLICY "System can manage anonymous mappings" ON public.community_anonymous_mapping
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 评论 RLS
CREATE POLICY "Anyone can view non-deleted comments" ON public.community_comments
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments" ON public.community_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.community_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- 投票 RLS
CREATE POLICY "Users can view own votes" ON public.community_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create votes" ON public.community_votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON public.community_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.community_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 举报 RLS
CREATE POLICY "Users can create reports" ON public.community_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- =====================================================
-- 触发器：更新帖子评论计数
-- =====================================================
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE public.community_posts 
    SET comment_count = comment_count - 1 
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- =====================================================
-- 触发器：更新投票计数
-- =====================================================
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      IF NEW.vote_type = 'up' THEN
        UPDATE public.community_posts SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE public.community_posts SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'comment' THEN
      IF NEW.vote_type = 'up' THEN
        UPDATE public.community_comments SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE public.community_comments SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      IF OLD.vote_type = 'up' THEN
        UPDATE public.community_posts SET upvote_count = upvote_count - 1 WHERE id = OLD.target_id;
      ELSE
        UPDATE public.community_posts SET downvote_count = downvote_count - 1 WHERE id = OLD.target_id;
      END IF;
    ELSIF OLD.target_type = 'comment' THEN
      IF OLD.vote_type = 'up' THEN
        UPDATE public.community_comments SET upvote_count = upvote_count - 1 WHERE id = OLD.target_id;
      ELSE
        UPDATE public.community_comments SET downvote_count = downvote_count - 1 WHERE id = OLD.target_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    -- 切换投票类型
    IF NEW.target_type = 'post' THEN
      IF NEW.vote_type = 'up' THEN
        UPDATE public.community_posts SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE public.community_posts SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'comment' THEN
      IF NEW.vote_type = 'up' THEN
        UPDATE public.community_comments SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE public.community_comments SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR UPDATE OR DELETE ON public.community_votes
FOR EACH ROW EXECUTE FUNCTION update_vote_count();
