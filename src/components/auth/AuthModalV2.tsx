/**
 * 新版认证弹窗组件
 * 简化为手机号+验证码登录/注册一体化
 */
'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, ArrowLeft, RefreshCw, Phone } from 'lucide-react';
import { openSettingsCenter } from '@/lib/settings-center';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { sendPhoneCode, verifyPhoneCode } from '@/lib/auth/phone-auth';
import { supabase, applySession } from '@/lib/auth';

type AuthMode = 'phone-input' | 'code-verify' | 'complete';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface AuthState {
    mode: AuthMode;
    phone: string;
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
    | { type: 'TICK_COUNTDOWN' };

const initialAuthState: AuthState = {
    mode: 'phone-input',
    phone: '',
    verificationCode: '',
    loading: false,
    sendingCode: false,
    error: '',
    success: '',
    countdown: 0
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET_FORM':
            return { ...initialAuthState };
        case 'TICK_COUNTDOWN':
            return { ...state, countdown: Math.max(0, state.countdown - 1) };
        default:
            return state;
    }
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const router = useRouter();
    const [state, dispatch] = useReducer(authReducer, initialAuthState);
    const verifyingRef = useRef(false);

    const { mode, phone, verificationCode, loading, sendingCode, error, success, countdown } = state;

    const setField = useCallback(<K extends keyof AuthState>(field: K, value: AuthState[K]) => {
        dispatch({ type: 'SET_FIELD', field, value });
    }, []);

    const resetForm = useCallback(() => {
        dispatch({ type: 'RESET_FORM' });
    }, []);

    const completeAuth = useCallback(async (userData?: unknown) => {
        try {
            onSuccess?.();
            onClose();

            if (process.env.NODE_ENV === 'development' && userData) {
                const userDataTyped = userData as { user_metadata?: { nickname?: string } };
                if (!userDataTyped.user_metadata?.nickname) {
                    openSettingsCenter('profile');
                    return;
                }

                router.refresh();
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const response = await fetch('/api/user/profile');
                const profileData = await response.json();

                if (profileData && !profileData.nickname) {
                    openSettingsCenter('profile');
                    return;
                }
            }

            router.refresh();
        } catch (error) {
            console.error('Failed to check user profile:', error);
            router.refresh();
        }
    }, [onClose, onSuccess, router]);

    const handleVerifyCode = useCallback(async (code?: string) => {
        if (verifyingRef.current) return;
        const codeToVerify = code || verificationCode;

        if (!codeToVerify || codeToVerify.length !== 6) {
            setField('error', '请输入6位验证码');
            return;
        }

        setField('error', '');
        setField('success', '');
        setField('loading', true);
        verifyingRef.current = true;

        try {
            const result = await verifyPhoneCode(phone, codeToVerify, 'login');

            if (result.success) {
                if (result.session) {
                    applySession(result.session, 'SIGNED_IN');
                }

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
    }, [phone, verificationCode, completeAuth, setField]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);

    const handleSendCode = async () => {
        if (!phone || phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
            setField('error', '请输入正确的11位手机号');
            return;
        }

        setField('error', '');
        setField('success', '');
        setField('sendingCode', true);

        try {
            const result = await sendPhoneCode(phone, 'login');

            if (result.success) {
                setField('countdown', 60);
                setField('mode', 'code-verify');
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

    const handleResendCode = async () => {
        if (countdown > 0) return;
        await handleSendCode();
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleSendCode();
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleVerifyCode();
    };

    const handleBackToPhone = () => {
        setField('mode', 'phone-input');
        setField('verificationCode', '');
        setField('error', '');
        setField('success', '');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center" role="dialog" aria-modal="true">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        {mode === 'code-verify' && (
                            <button
                                onClick={handleBackToPhone}
                                className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold">
                            {mode === 'phone-input' ? '登录/注册' : '验证手机'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm mb-4">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm mb-4">
                            {success}
                        </div>
                    )}

                    {/* Phone Input Mode */}
                    {mode === 'phone-input' && (
                        <form onSubmit={handlePhoneSubmit} className="space-y-4">
                            <p className="text-sm text-foreground-secondary text-center mb-6">
                                请输入您的手机号，我们将发送验证码
                            </p>

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
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={sendingCode || !phone}
                                className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {sendingCode && <SoundWaveLoader variant="inline" />}
                                获取验证码
                            </button>
                        </form>
                    )}

                    {/* Code Verify Mode */}
                    {mode === 'code-verify' && (
                        <form onSubmit={handleVerifySubmit} className="space-y-4">
                            <p className="text-sm text-foreground-secondary text-center">
                                验证码已发送至 <span className="font-medium">{phone}</span>
                            </p>

                            <div className="space-y-2 py-4">
                                <label className="text-sm font-medium text-foreground-secondary text-center block">
                                    输入验证码
                                </label>
                                <VerificationCodeInput
                                    value={verificationCode}
                                    onChange={(v) => setField('verificationCode', v)}
                                    onComplete={handleVerifyCode}
                                    length={6}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={countdown > 0 || sendingCode}
                                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-foreground-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${countdown > 0 ? 'animate-spin' : ''}`} />
                                {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                            </button>

                            <button
                                type="submit"
                                disabled={loading || verificationCode.length !== 6}
                                className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <SoundWaveLoader variant="inline" />}
                                验证并登录
                            </button>
                        </form>
                    )}

                    {/* Legal Disclaimer */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-foreground-secondary pt-6">
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
                </div>
            </div>
        </div>
    );
}
