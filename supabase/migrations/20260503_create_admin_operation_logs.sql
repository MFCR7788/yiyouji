-- 管理员操作日志表
-- 用于记录所有管理员在后台的操作，支持审计追踪

CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    admin_nickname text,
    operation_type text NOT NULL CHECK (operation_type IN ANY (ARRAY[
        'view_user',           -- 查看用户信息
        'update_membership',   -- 修改会员等级
        'adjust_credits',      -- 调整积分
        'edit_user_info',      -- 编辑用户信息
        'disable_user',        -- 禁用用户
        'enable_user',         -- 启用用户
        'delete_user',         -- 删除用户
        'batch_operation'      -- 批量操作
    ])),
    target_user_id uuid,
    target_user_email text,
    description text NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    status text NOT NULL DEFAULT 'success' CHECK (status IN ANY (ARRAY['success', 'failed', 'pending'])),
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT admin_operation_logs_pkey PRIMARY KEY (id),
    CONSTRAINT admin_operation_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
    CONSTRAINT admin_operation_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_admin_id ON public.admin_operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_target_user_id ON public.admin_operation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_operation_type ON public.admin_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_created_at ON public.admin_operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_status ON public.admin_operation_logs(status);

-- 启用 RLS（行级安全）
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：只有管理员可以查看和插入操作日志
CREATE POLICY "Admins can read all operation logs" ON public.admin_operation_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

CREATE POLICY "Admins can insert operation logs" ON public.admin_operation_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- 添加注释
COMMENT ON TABLE public.admin_operation_logs IS '管理员操作审计日志表';
COMMENT ON COLUMN public.admin_operation_logs.operation_type IS '操作类型：查看/修改会员/调整积分/编辑信息/禁用/启用/删除';
COMMENT ON COLUMN public.admin_operation_logs.details IS '操作详情JSON，包含修改前后的值';
COMMENT ON COLUMN public.admin_operation_logs.status IS '操作状态：成功/失败/待处理';
