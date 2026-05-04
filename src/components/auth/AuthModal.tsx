/**
 * 认证弹窗组件
 * 
 * 支持手机号密码登录、验证码登录、注册、忘记密码
 */
'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Lock, ArrowLeft, RefreshCw, Eye, EyeOff, Phone } from 'lucide-react';
import { openSettingsCenter } from '@/lib/settings-center';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { signInWithEmailProtected } from '@/lib/auth';
import { supabase } from '@/lib/auth';
import { sendSmsCode, verifySmsCode } from '@/lib/sms/client';
import { PasswordStrengthIndicator, validatePasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';

type AuthMode = 'login' | 'verify-login' | 'register' | 'verify-register' | 'forgot' | 'verify-forgot' | 'reset-password';
type LoginMethod = 'password' | 'otp';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface AuthState {
    mode: AuthMode;
    loginMethod: LoginMethod;
    phone: string;
    password: string;
    confirmPassword: string;
    showPassword: boolean;
    showConfirmPassword: boolean;
    nickname: string;
    verificationCode: string;
    loading: boolean;
    sendingCode: boolean;
    error: string;
    success: string;
    countdown: number;
}

type AuthAction =
    | { type: 'SET_FIELD'; field: keyof AuthState; value: AuthState[keyof AuthState] }
    | { type: 'RESET_FORM' }
    | { type: 'SWITCH_MODE'; mode: AuthMode }
    | { type: 'TICK_COUNTDOWN' };

const initialAuthState: AuthState = {
    mode: 'login',
    loginMethod: 'otp',
    phone: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    nickname: '',
    verificationCode: '',
    loading: false,
    sendingCode: false,
    error: '',
    success: '',
    countdown: 0,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET_FORM':
            return {
                ...initialAuthState,
            };
        case 'SWITCH_MODE': {
            const reset: Partial<AuthState> = {
                phone: '',
                password: '',
                confirmPassword: '',
                showPassword: false,
                showConfirmPassword: false,
                nickname: '',
                verificationCode: '',
                error: '',
                success: '',
                countdown: 0,
                mode: action.mode,
            };
            return { ...state, ...reset };
        }
        case 'TICK_COUNTDOWN':
            return { ...state, countdown: Math.max(0, state.countdown - 1) };
        default:
            return state;
    }
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const router = useRouter();
    const [state, dispatch] = useReducer(authReducer, initialAuthState);
    const verifyingRef = useRef(false);

    const {
        mode, loginMethod, phone, password, confirmPassword, showPassword, showConfirmPassword,
        nickname, verificationCode, loading, sendingCode,
        error, success, countdown,
    } = state;

    const setField = useCallback(<K extends keyof AuthState>(field: K, value: AuthState[K]) => {
        dispatch({ type: 'SET_FIELD', field, value });
    }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const switchMode = useCallback((newMode: AuthMode) => {
        dispatch({ type: 'SWITCH_MODE', mode: newMode });
    }, []);

    if (!isOpen) return null;

    const completeAuth = async (userData?: { id: string; email?: string; user_metadata?: { nickname?: string; phone?: string } } | null) => {
        try {
            if (process.env.NODE_ENV === 'development' && userData) {
                console.info('[AuthModal] 开发模式：使用登录返回的用户信息', userData);
                
                // 直接检查用户信息，不依赖 getUser()
                if (!userData.user_metadata?.nickname) {
                    onClose();
                    // 直接跳转到账户设置页面，不使用hash
                    router.push('/settings/profile');
                    return;
                }
                
                // 先关闭弹窗，再跳转到我的页面
                onClose();
                router.push('/settings/profile');
                return;
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const response = await fetch('/api/user/profile');
                const profileData = await response.json();

                if (profileData && !profileData.nickname) {
                    onClose();
                    // 直接跳转到账户设置页面，不使用hash
                    router.push('/settings/profile');
                    return;
                }
            }
            
            // 关闭弹窗并跳转到我的页面
            onClose();
            router.push('/settings/profile');
        } catch (error) {
            console.error('Failed to check user profile:', error);
            onClose();
            // 出错时也尝试跳转到我的页面
            router.push('/settings/profile');
        }
    };

    const handleSendOTP = async () => {
        if (!phone || phone.length !== 11) {
            setField('error', '请输入正确的11位手机号');
            return;
        }

        setField('error', '');
        setField('sendingCode', true);

        try {
            const result = await sendSmsCode(phone, nickname);
            if (result.success) {
                setField('countdown', 60);
                if (mode === 'register') {
                    setField('mode', 'verify-register');
                } else {
                    setField('mode', 'verify-login');
                }
                setField('success', '验证码已发送到您的手机');
            } else {
                setField('error', result.message || '发送失败');
            }
        } catch {
            setField('error', '发送失败，请重试');
        } finally {
            setField('sendingCode', false);
        }
    };

    const handleResendOTP = async () => {
        if (countdown > 0) return;
        await handleSendOTP();
    };

    const handleVerifyOTP = async (code?: string) => {
        if (verifyingRef.current) return;
        const codeToVerify = code || verificationCode;
        if (!codeToVerify || codeToVerify.length !== 6) {
            setField('error', '请输入6位验证码');
            return;
        }

        setField('error', '');
        setField('loading', true);
        verifyingRef.current = true;

        try {
            const result = await verifySmsCode(phone, codeToVerify);
            if (result.success) {
                // 验证成功后，重新从服务器加载 session
                await supabase.auth.revalidateSession();
                completeAuth(result.user);
            } else {
                setField('error', result.message || '验证失败');
            }
        } catch {
            setField('error', '验证失败，请重试');
        } finally {
            setField('loading', false);
            verifyingRef.current = false;
        }
    };

    const handleLogin = async () => {
        if (!phone || !password) {
            setField('error', '请填写完整信息');
            return;
        }

        const result = await signInWithEmailProtected(
            `${phone}@phone.xingbu.app`,
            password
        );
        if (result.success) {
            completeAuth();
        } else {
            setField('error', result.error?.message || '登录失败');
        }
    };

    const handleRegister = async () => {
        if (!phone || phone.length !== 11) {
            setField('error', '请输入正确的11位手机号');
            return;
        }

        if (!verificationCode || verificationCode.length !== 6) {
            setField('error', '请输入6位验证码');
            return;
        }

        const { isValid } = validatePasswordStrength(password);
        if (!isValid) {
            setField('error', '密码不符合强度要求');
            return;
        }

        if (password !== confirmPassword) {
            setField('error', '两次输入的密码不一致');
            return;
        }

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                code: verificationCode,
                password,
                nickname: nickname || '命理爱好者',
            }),
        });

        const result = await response.json();

        if (result.success) {
            setField('success', '注册成功！');
            completeAuth();
        } else {
            setField('error', result.message || '注册失败');
        }
    };

    const handleForgotPassword = async () => {
        if (!phone || phone.length !== 11) {
            setField('error', '请输入正确的11位手机号');
            return;
        }

        await handleSendOTP();
        setField('mode', 'verify-forgot');
    };

    const handleResetPassword = async () => {
        const { isValid } = validatePasswordStrength(password);
        if (!isValid) {
            setField('error', '密码不符合强度要求');
            return;
        }

        if (password !== confirmPassword) {
            setField('error', '两次输入的密码不一致');
            return;
        }

        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                password,
            }),
        });

        const result = await response.json();

        if (result.success) {
            setField('success', '密码重置成功！请使用新密码登录');
            dispatch({ type: 'SWITCH_MODE', mode: 'login' });
        } else {
            setField('error', result.message || '密码重置失败');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setField('error', '');
        setField('success', '');
        setField('loading', true);

        try {
            switch (mode) {
                case 'login':
                    if (loginMethod === 'password') {
                        await handleLogin();
                    } else {
                        await handleSendOTP();
                    }
                    break;
                case 'verify-login':
                case 'verify-register':
                    await handleVerifyOTP();
                    break;
                case 'register':
                    await handleRegister();
                    break;
                case 'forgot':
                    await handleForgotPassword();
                    break;
                case 'verify-forgot':
                    await handleVerifyOTP();
                    break;
                case 'reset-password':
                    await handleResetPassword();
                    break;
            }
        } catch {
            setField('error', '操作失败，请重试');
        } finally {
            setField('loading', false);
        }
    };

    const showBackButton = mode === 'forgot' || mode === 'verify-forgot' || mode === 'reset-password' || mode === 'verify-login' || mode === 'verify-register';

    const handleBack = () => {
        if (mode === 'verify-login' || mode === 'verify-register') {
            switchMode('login');
        } else if (mode === 'verify-forgot' || mode === 'reset-password') {
            switchMode('forgot');
        } else {
            switchMode('login');
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'login': return '登录';
            case 'verify-login': return '验证登录';
            case 'verify-register': return '验证注册';
            case 'register': return '注册';
            case 'forgot': return '忘记密码';
            case 'verify-forgot': return '验证手机';
            case 'reset-password': return '设置新密码';
        }
    };

    const getSubmitText = () => {
        switch (mode) {
            case 'login': return loginMethod === 'password' ? '登录' : '发送验证码';
            case 'verify-login':
            case 'verify-register': return '验证';
            case 'register': return '发送验证码';
            case 'forgot': return '发送验证码';
            case 'verify-forgot': return '验证';
            case 'reset-password': return '重置密码';
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center" role="dialog" aria-modal="true">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        {showBackButton && (
                            <button
                                onClick={handleBack}
                                className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold">{getTitle()}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                            {success}
                        </div>
                    )}

                    {/* 登录模式 */}
                    {mode === 'login' && (
                        <>
                            {/* 登录方式切换 */}
                            <div className="flex gap-2 p-1 bg-background-secondary rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setField('loginMethod', 'otp')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${loginMethod === 'otp'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-foreground-secondary hover:text-foreground'
                                    }`}
                                >
                                    验证码登录
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setField('loginMethod', 'password')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${loginMethod === 'password'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-foreground-secondary hover:text-foreground'
                                    }`}
                                >
                                    密码登录
                                </button>
                            </div>

                            {/* 手机号 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">手机号</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 11) {
                                                setField('phone', value);
                                            }
                                        }}
                                        placeholder="请输入手机号"
                                        required
                                        maxLength={11}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* 密码（仅密码登录） */}
                            {loginMethod === 'password' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground-secondary">密码</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setField('password', e.target.value)}
                                                placeholder="输入密码"
                                                required
                                                minLength={6}
                                                className="w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setField('showPassword', !showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => switchMode('forgot')}
                                            className="text-sm text-accent hover:underline"
                                        >
                                            忘记密码？
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* 验证码输入 */}
                    {(mode === 'verify-login' || mode === 'verify-forgot') && (
                        <div className="space-y-4">
                            <p className="text-sm text-foreground-secondary text-center">
                                验证码已发送至 {phone}
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary text-center block">
                                    验证码
                                </label>
                                <VerificationCodeInput
                                    value={verificationCode}
                                    onChange={(v) => setField('verificationCode', v)}
                                    onComplete={handleVerifyOTP}
                                    length={6}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={countdown > 0}
                                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-foreground-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                            </button>
                        </div>
                    )}

                    {/* 注册模式 - 简化为仅手机号+验证码 */}
                    {mode === 'register' && (
                        <>
                            {/* 提示文字 */}
                            <p className="text-sm text-foreground-secondary text-center">
                                注册即表示同意我们的服务条款和隐私政策
                            </p>

                            {/* 手机号 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">手机号</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 11) {
                                                setField('phone', value);
                                            }
                                        }}
                                        placeholder="请输入手机号"
                                        required
                                        maxLength={11}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* 验证码 */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground-secondary">手机验证码</label>
                                    <button
                                        type="button"
                                        onClick={handleSendOTP}
                                        disabled={sendingCode || countdown > 0}
                                        className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                    >
                                        {sendingCode ? (
                                            <SoundWaveLoader variant="inline" />
                                        ) : countdown > 0 ? (
                                            `${countdown}s 后重发`
                                        ) : (
                                            '发送验证码'
                                        )}
                                    </button>
                                </div>
                                <VerificationCodeInput
                                    value={verificationCode}
                                    onChange={(v) => setField('verificationCode', v)}
                                    length={6}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {/* 验证注册模式 */}
                    {mode === 'verify-register' && (
                        <div className="space-y-4">
                            <p className="text-sm text-foreground-secondary text-center">
                                验证码已发送至 {phone}
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary text-center block">
                                    输入验证码完成注册
                                </label>
                                <VerificationCodeInput
                                    value={verificationCode}
                                    onChange={(v) => setField('verificationCode', v)}
                                    onComplete={handleVerifyOTP}
                                    length={6}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={countdown > 0}
                                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-foreground-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                            </button>
                        </div>
                    )}

                    {/* 忘记密码模式 */}
                    {mode === 'forgot' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground-secondary">手机号</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 11) {
                                            setField('phone', value);
                                        }
                                    }}
                                    placeholder="请输入手机号"
                                    required
                                    maxLength={11}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* 重置密码模式 */}
                    {mode === 'reset-password' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    新密码
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setField('password', e.target.value)}
                                        placeholder="设置新密码"
                                        required
                                        minLength={8}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setField('showPassword', !showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <PasswordStrengthIndicator password={password} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    确认新密码
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setField('confirmPassword', e.target.value)}
                                        placeholder="再次输入新密码"
                                        required
                                        minLength={8}
                                        className={`w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border focus:outline-none transition-colors ${confirmPassword && password !== confirmPassword
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-border focus:border-accent'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setField('showConfirmPassword', !showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500">两次输入的密码不一致</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <SoundWaveLoader variant="inline" />}
                        {getSubmitText()}
                    </button>

                    {/* 切换登录/注册 */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="text-center text-sm text-foreground-secondary">
                            {mode === 'login' ? (
                                <>
                                    还没有账号？
                                    <button
                                        type="button"
                                        onClick={() => switchMode('register')}
                                        className="text-accent hover:underline ml-1"
                                    >
                                        立即注册
                                    </button>
                                </>
                            ) : (
                                <>
                                    已有账号？
                                    <button
                                        type="button"
                                        onClick={() => switchMode('login')}
                                        className="text-accent hover:underline ml-1"
                                    >
                                        立即登录
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 法律声明 */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-foreground-secondary pt-2">
                        <span>登录即表示同意</span>
                        <Link
                            href="/terms"
                            target="_blank"
                            className="text-accent hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            《服务条款》
                        </Link>
                        <span>和</span>
                        <Link
                            href="/privacy"
                            target="_blank"
                            className="text-accent hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            《隐私政策》
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
