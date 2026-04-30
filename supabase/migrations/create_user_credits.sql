-- 用户积分/次数表
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits INTEGER DEFAULT 10,  -- 初始赠送10次
    total_used INTEGER DEFAULT 0, -- 累计使用次数
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;

-- 用户只能查看自己的积分
CREATE POLICY "Users can view own credits"
    ON user_credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能更新自己的积分（通过 API）
CREATE POLICY "Users can update own credits"
    ON user_credits
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 允许注册时创建记录
CREATE POLICY "Users can insert own credits"
    ON user_credits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧 trigger（如果存在）
DROP TRIGGER IF EXISTS user_credits_updated_at ON user_credits;

CREATE TRIGGER user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits_updated_at();

-- 新用户注册时自动创建积分记录
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 10)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧 trigger（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 监听新用户注册
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_credits();
