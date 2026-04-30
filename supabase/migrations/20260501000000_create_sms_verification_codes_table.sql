-- 创建验证码存储表
-- 用于生产环境替代内存存储，解决无服务器架构下的验证码丢失问题

CREATE TABLE IF NOT EXISTS public.sms_verification_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    is_used boolean NOT NULL DEFAULT false,
    used_at timestamp with time zone,
    send_count integer NOT NULL DEFAULT 1,
    CONSTRAINT sms_verification_codes_pkey PRIMARY KEY (id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_phone ON public.sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_phone_code ON public.sms_verification_codes(phone, code);
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_expires_at ON public.sms_verification_codes(expires_at);

-- 启用行级安全策略
ALTER TABLE public.sms_verification_codes ENABLE ROW LEVEL SECURITY;

-- 注意：由于验证码表不需要用户级别的权限控制，
-- 我们通过服务端API来访问，因此不设置RLS策略

-- 添加注释
COMMENT ON TABLE public.sms_verification_codes IS '短信验证码存储表，用于存储和验证用户登录/注册时的短信验证码';
COMMENT ON COLUMN public.sms_verification_codes.phone IS '接收验证码的手机号';
COMMENT ON COLUMN public.sms_verification_codes.code IS '6位数字验证码';
COMMENT ON COLUMN public.sms_verification_codes.expires_at IS '验证码过期时间（发送后5分钟）';
COMMENT ON COLUMN public.sms_verification_codes.is_used IS '验证码是否已被使用';
COMMENT ON COLUMN public.sms_verification_codes.send_count IS '该手机号的发送次数';

-- 创建清理过期验证码的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_sms_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.sms_verification_codes
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- 注释函数
COMMENT ON FUNCTION public.cleanup_expired_sms_codes IS '清理过期1小时以上的验证码';

