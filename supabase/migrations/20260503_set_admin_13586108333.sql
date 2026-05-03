-- 将手机号 13586108333 的用户设置为管理员
-- 执行时间: 2026-05-03

BEGIN;

UPDATE public.users
SET is_admin = true,
    updated_at = NOW()
WHERE id IN (
    SELECT u.id FROM public.users u
    JOIN auth.users au ON u.id = au.id
    WHERE au.email = '13586108333'
       OR au.phone = '13586108333'
);

COMMIT;
