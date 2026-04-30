-- 登录失败记录表
-- 用于追踪登录尝试，实现登录失败次数限制

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_at TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT false
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempt_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_at);

-- RLS 策略：只允许服务端访问
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- 定期清理旧记录的函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts WHERE attempt_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE login_attempts IS '登录尝试记录表，用于防止暴力破解';
COMMENT ON COLUMN login_attempts.email IS '尝试登录的邮箱';
COMMENT ON COLUMN login_attempts.ip_address IS '客户端IP地址';
COMMENT ON COLUMN login_attempts.attempt_at IS '尝试时间';
COMMENT ON COLUMN login_attempts.success IS '是否成功';
