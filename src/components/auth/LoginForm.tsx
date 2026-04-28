/**
 * 登录表单字段组件
 *
 * 'use client' 标记说明：
 * - 使用交互状态控制密码可见性
 */
'use client';

import { Phone, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
    phone: string;
    onPhoneChange: (value: string) => void;
    password: string;
    onPasswordChange: (value: string) => void;
    showPassword: boolean;
    onToggleShowPassword: () => void;
    onForgotPassword: () => void;
}

export function LoginForm({
    phone,
    onPhoneChange,
    password,
    onPasswordChange,
    showPassword,
    onToggleShowPassword,
    onForgotPassword,
}: LoginFormProps) {
    return (
        <>
            {/* 手机号 */}
            <PhoneField
                phone={phone}
                onPhoneChange={onPhoneChange}
            />

            {/* 密码 */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground-secondary">密码</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        placeholder="输入密码"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                    />
                    <button
                        type="button"
                        onClick={onToggleShowPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* 忘记密码 */}
            <div className="text-right">
                <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-accent hover:underline"
                >
                    忘记密码？
                </button>
            </div>
        </>
    );
}

/** 共享手机号输入字段 */
export function PhoneField({
    phone,
    onPhoneChange,
}: {
    phone: string;
    onPhoneChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">手机号</label>
            <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                        // 只允许数字输入
                        const value = e.target.value.replace(/\D/g, '');
                        // 限制最多11位
                        if (value.length <= 11) {
                            onPhoneChange(value);
                        }
                    }}
                    placeholder="请输入手机号"
                    required
                    maxLength={11}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                />
            </div>
        </div>
    );
}
