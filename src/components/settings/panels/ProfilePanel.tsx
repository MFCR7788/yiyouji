'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import {
  Camera,
  User as UserIcon,
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Lock,
  LogOut,
} from 'lucide-react';
import { ensureUserRecord, updateNickname, signOut } from '@/lib/auth';
import { uploadAvatarForCurrentUser } from '@/lib/user/profile';
import { useRouter } from 'next/navigation';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { StatusBanner } from '@/components/profile/StatusBanner';
import { PasswordSection } from '@/components/profile/PasswordSection';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { AuthModal } from '@/components/auth/AuthModalV2';
import { CheckinModal } from '@/components/checkin/CheckinModal';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { CreditTransactionsPanel } from '@/components/membership/CreditTransactionsPanel';
import { useToast } from '@/components/ui/Toast';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getMembershipInfo, type MembershipInfo } from '@/lib/user/membership';
import { requestBrowserJson } from '@/lib/browser-api';
import {
  type CheckinStatus,
  fetchCheckinStatus,
  performCheckinAction,
} from '@/components/checkin/checkin-client';

function Avatar({ src, alt }: { src: string | null; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shouldFallback = !src || failedSrc === src;

  if (shouldFallback) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/60 bg-background-secondary text-foreground/20">
        <UserIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="h-20 w-20 overflow-hidden rounded-full border border-border/60 bg-background-secondary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}

export default function ProfilePanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ensuredUserIdRef = useRef<string | null>(null);
  const { user, loading: sessionLoading } = useSessionSafe();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const { profile, loading: profileLoading, resolved: profileResolved, error: profileError, refresh: refreshProfile } = useCurrentUserProfile({ enabled: !!user });
  const { isFeatureEnabled, loaded: featureLoaded } = useFeatureToggles();
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isInitialized = useRef(false);

  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const [registrationBonus, setRegistrationBonus] = useState(0);
  const { showToast } = useToast();

  const checkinEnabled = featureLoaded && isFeatureEnabled('checkin');

  const refreshMembership = useCallback(async (userId: string) => {
    const result = await getMembershipInfo(userId);
    if (result.ok) {
      setMembership(result.info);
      setMembershipError(null);
      return result;
    }

    setMembershipError(result.error.message || '获取会员状态失败');
    return result;
  }, []);

  const fetchRegistrationBonus = useCallback(async () => {
    if (!user) {
      setRegistrationBonus(0);
      return;
    }

    try {
      const result = await requestBrowserJson<{
        items?: Array<{ source: string; amount: number }>;
      }>('/api/credits/transactions?limit=50', { method: 'GET' });

      if (result.data?.items) {
        const registrationTx = result.data.items.find((tx) => tx.source === 'registration');
        if (registrationTx && registrationTx.amount > 0) {
          setRegistrationBonus(registrationTx.amount);
        } else {
          setRegistrationBonus(0);
        }
      }
    } catch (error) {
      console.error('获取注册赠送积分失败:', error);
      setRegistrationBonus(0);
    }
  }, [user]);

  const refreshCheckinStatus = useCallback(async () => {
    if (!user || !checkinEnabled) {
      setCheckinStatus(null);
      setCheckinError(null);
      return null;
    }

    setCheckinLoading(true);
    try {
      const nextStatus = await fetchCheckinStatus();
      if (nextStatus.ok) {
        setCheckinStatus(nextStatus.status);
        setCheckinError(null);
        return nextStatus.status;
      }

      console.error('获取签到状态失败:', nextStatus.error);
      setCheckinStatus(null);
      setCheckinError(nextStatus.error.message || '获取签到状态失败');
      return null;
    } catch (error) {
      console.error('获取签到状态失败:', error);
      setCheckinStatus(null);
      setCheckinError('获取签到状态失败，请稍后重试');
    } finally {
      setCheckinLoading(false);
    }
  }, [checkinEnabled, user]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (profileLoading) {
      return;
    }

    if (profile) {
      ensuredUserIdRef.current = null;
      if (!isInitialized.current) {
        setNickname(profile.nickname || '');
        setOriginalNickname(profile.nickname || '');
        isInitialized.current = true;
      } else {
        setOriginalNickname(profile.nickname || '');
      }
      setAvatarUrl(profile.avatar_url || null);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(false);
    if (profileError) {
      setError(profileError.message || '加载账户失败');
      return;
    }
    if (!profileResolved) {
      return;
    }
    if (ensuredUserIdRef.current === user.id) {
      return;
    }
    ensuredUserIdRef.current = user.id;
    void ensureUserRecord(user).then(() => refreshProfile());
  }, [profile, profileError, profileLoading, profileResolved, refreshProfile, sessionLoading, user]);

  useEffect(() => {
    const initCredits = async () => {
      if (sessionLoading) return;
      if (user) {
        await refreshMembership(user.id);
        await fetchRegistrationBonus();
      } else {
        setMembership(null);
        setMembershipError(null);
        setRegistrationBonus(0);
      }
    };
    void initCredits();
  }, [fetchRegistrationBonus, refreshMembership, sessionLoading, user]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !checkinEnabled) {
      setCheckinStatus(null);
      setCheckinError(null);
      return;
    }
    void refreshCheckinStatus();
  }, [checkinEnabled, refreshCheckinStatus, sessionLoading, user]);

  const handleCheckinClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!checkinStatus?.canCheckin || checkinSubmitting) {
      return;
    }

    setCheckinSubmitting(true);
    void (async () => {
      try {
        const result = await performCheckinAction();
        if (result.ok) {
          setCheckinError(null);
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            todayCheckedIn: true,
            blockedReason: 'already_checked_in',
            currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
            creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
          } : prev);
          showToast('success', `签到成功！+${result.rewardCredits} 积分`);
          void refreshMembership(user.id);
          setTransactionsRefreshKey((value) => value + 1);
          return;
        }

        showToast('error', result.message || '签到失败');
        if (result.blockedReason === 'already_checked_in') {
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            todayCheckedIn: true,
            blockedReason: 'already_checked_in',
          } : prev);
        } else if (result.blockedReason === 'credit_cap_reached') {
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            blockedReason: 'credit_cap_reached',
            currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
            creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
          } : prev);
        }
      } catch (error) {
        console.error('签到失败:', error);
        const errorMessage = error instanceof Error ? error.message : '签到失败，请稍后重试';
        setCheckinError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setCheckinSubmitting(false);
      }
    })();
  };

  const currentPlan = membership?.type || 'free';
  const checkinButtonLabel = !user
    ? '登录后签到'
    : checkinSubmitting
      ? '签到中'
      : checkinError && !checkinStatus
        ? '状态加载失败'
        : checkinStatus?.todayCheckedIn
          ? '已签到'
          : checkinStatus?.blockedReason === 'credit_cap_reached'
            ? '已封顶'
            : '立即签到';
  const checkinButtonIcon = !user
    ? <CalendarCheck className="h-4 w-4" />
    : checkinSubmitting
      ? <CalendarCheck className="h-4 w-4" />
      : checkinError && !checkinStatus
        ? <RefreshCw className="h-4 w-4" />
        : checkinStatus?.todayCheckedIn
          ? <CheckCircle2 className="h-4 w-4" />
          : checkinStatus?.blockedReason === 'credit_cap_reached'
            ? <Lock className="h-4 w-4" />
            : <CalendarCheck className="h-4 w-4" />;
  const checkinDisabled = !!user && (checkinSubmitting || checkinLoading || !!checkinError || !checkinStatus?.canCheckin);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    console.log('[ProfilePanel] 开始保存昵称:', { nickname, originalNickname });

    try {
      const result = await updateNickname(user.id, nickname.trim());
      console.log('[ProfilePanel] 保存结果:', result);
      
      if (result.success) {
        setOriginalNickname(nickname.trim());
        setSuccess('昵称已更新');
        await refreshProfile();
        window.setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error?.message || '保存失败');
      }
    } catch (e) {
      console.error('[ProfilePanel] 保存异常:', e);
      setError('保存失败，请重试');
    }

    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      const uploadResult = await uploadAvatarForCurrentUser(user.id, file);
      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error(uploadResult.error?.message || '头像上传失败');
      }

      setAvatarUrl(uploadResult.publicUrl);
      setSuccess('头像已更新');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (uploadError) {
      console.error('Avatar upload error:', uploadError);
      setError('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSignOut = async () => {
        setSigningOut(true);
        setSignOutError('');

        try {
            const result = await signOut();
            if (result.success) {
                // 成功退出，刷新页面保持在“我的”页面
                router.refresh();
                showToast('success', '已成功退出登录');
            } else {
                setSignOutError(result.error?.message || '退出登录失败，请重试');
                showToast('error', result.error?.message || '退出登录失败，请重试');
            }
        } catch (error) {
            console.error('Sign out error:', error);
            const errorMessage = error instanceof Error ? error.message : '退出登录失败，请重试';
            setSignOutError(errorMessage);
            showToast('error', errorMessage);
        } finally {
            setSigningOut(false);
        }
    };

  if (loading || sessionLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
        <SoundWaveLoader variant="inline" />
      </div>
    );
  }

  if (!user) {
    return <SettingsLoginRequired title="请先登录后查看账户" />;
  }

  const hasNicknameChanges = nickname !== originalNickname;
  const displayPhone = (user.user_metadata?.phone as string) || '';

  return (
    <div className="space-y-8">
      <StatusBanner error={error} success={success} />

      {!originalNickname && (
        <div className="rounded-md border border-accent bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <UserIcon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">欢迎加入易有吉！</p>
              <p className="mt-1 text-sm text-foreground/60">请设置您的显示昵称，以便其他用户识别您。</p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">账户信息</h2>
        <div className="rounded-md border border-border bg-background p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex flex-col items-center gap-3 md:w-32 md:flex-shrink-0 md:self-center">
              <div className="group relative">
                <Avatar src={avatarUrl} alt={nickname || 'avatar'} />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-[#2383e2]/85 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="text-center">
                {uploadingAvatar ? <p className="mt-1 text-xs text-accent">上传中...</p> : null}
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background divide-y divide-border/60">
              <div className="flex flex-col justify-between gap-4 p-4 py-2 sm:flex-row sm:items-center">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">显示昵称</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(event) => {
                      const newValue = event.target.value;
                      console.log('[NicknameInput] onChange 触发:', { 
                        newValue, 
                        oldValue: nickname,
                        originalNickname 
                      });
                      setNickname(newValue);
                    }}
                    onFocus={() => {
                      console.log('[NicknameInput] 输入框获得焦点');
                    }}
                    onBlur={() => {
                      console.log('[NicknameInput] 输入框失去焦点', { 
                        nickname, 
                        originalNickname,
                        hasChanges: nickname !== originalNickname 
                      });
                    }}
                    disabled={saving}
                    className="w-48 rounded-md border border-border bg-background-secondary px-3 py-2 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50"
                    placeholder={!originalNickname ? '请输入您的昵称' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log('[SaveButton] 点击保存按钮', { 
                        nickname, 
                        originalNickname,
                        hasChanges: nickname !== originalNickname,
                        isEmpty: nickname.trim() === ''
                      });
                      handleSave();
                    }}
                    disabled={saving || !hasNicknameChanges || nickname.trim() === ''}
                    className={`rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      saving || !hasNicknameChanges || nickname.trim() === ''
                        ? 'cursor-not-allowed border border-border bg-background-secondary text-foreground/40'
                        : 'border border-primary bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'
                    }`}
                    title={!hasNicknameChanges ? '未修改，无需保存' : nickname.trim() === '' ? '昵称不能为空' : '点击保存修改'}
                  >
                    {saving ? (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
                        保存中
                      </span>
                    ) : hasNicknameChanges && nickname.trim() !== '' ? '保存' : '已保存'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 p-4 py-2 sm:flex-row sm:items-center">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">手机号码</p>
                </div>
                <div className="rounded-md bg-background-secondary/50 px-3 py-2 font-mono text-sm text-foreground/50">
                  {displayPhone || '未绑定'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">安全设置</h2>
        <div className="rounded-md border border-border bg-background p-4">
          <div className="mb-4 space-y-0.5">
            <p className="text-sm font-medium text-foreground">重置密码</p>
          </div>
          <PasswordSection phone={((user.user_metadata?.phone as string) || '').replace(/[^0-9]/g, '').slice(0, 11) || ''} />
        </div>
      </section>

      {user && (
        <>
          {membershipError && !membership ? (
            <div className="rounded-lg border border-[#ead9bf] bg-[#fcf8ee] px-4 py-3 text-sm text-[#946c21]">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1">{membershipError}</span>
                <button
                  type="button"
                  onClick={() => void refreshMembership(user.id)}
                  className="shrink-0 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
                >
                  重试
                </button>
              </div>
            </div>
          ) : (
            <CreditProgressBar
              credits={membership?.aiChatCount ?? 0}
              membershipType={currentPlan}
              bonusFromRegistration={registrationBonus}
            />
          )}

          <div className="rounded-lg border border-[#ebe8e2] bg-[#f7f6f3] px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {checkinEnabled ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCheckinClick}
                    disabled={checkinDisabled}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      checkinDisabled
                        ? 'cursor-not-allowed border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/42'
                        : 'border-[#e2ddd4] bg-[#efedea] text-[#37352f] hover:bg-[#e7e4de] active:bg-[#dfdbd4]'
                    }`}
                  >
                    {checkinButtonIcon}
                    <span>{checkinButtonLabel}</span>
                  </button>
                  {user && checkinStatus?.todayCheckedIn ? (
                    <button
                      type="button"
                      onClick={() => setShowCheckinModal(true)}
                      className="text-xs font-medium text-[#37352f]/55 transition-colors duration-150 hover:text-[#37352f]"
                    >
                      查看详情
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {checkinEnabled && user && checkinError ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#ead9bf] bg-[#fcf8ee] px-3 py-2 text-xs text-[#946c21]">
                <span className="min-w-0 flex-1">{checkinError}</span>
                <button
                  type="button"
                  onClick={() => void refreshCheckinStatus()}
                  className="shrink-0 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
                >
                  重试
                </button>
              </div>
            ) : null}
          </div>

          <CreditTransactionsPanel pageSize={5} refreshKey={transactionsRefreshKey} />

          <section className="space-y-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">账户操作</h2>
            <div className="rounded-md border border-border bg-background p-4">
              {signOutError && (
                <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {signOutError}
                </div>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  signingOut
                    ? 'cursor-not-allowed border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/42'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200'
                }`}
              >
                {signingOut ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
                    正在退出...
                  </span>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </>
                )}
              </button>
            </div>
          </section>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />

          <CheckinModal
            isOpen={showCheckinModal}
            onClose={() => setShowCheckinModal(false)}
            stackLevel="settings"
          />
        </>
      )}
    </div>
  );
}
