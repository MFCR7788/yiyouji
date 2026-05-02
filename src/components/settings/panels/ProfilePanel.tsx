'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import { ensureUserRecord, updateNickname } from '@/lib/auth';
import { uploadAvatarForCurrentUser } from '@/lib/user/profile';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { StatusBanner } from '@/components/profile/StatusBanner';
import { PasswordSection } from '@/components/profile/PasswordSection';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

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
  const { profile, loading: profileLoading, resolved: profileResolved, error: profileError, refresh: refreshProfile } = useCurrentUserProfile({ enabled: !!user });
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isInitialized = useRef(false);

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
    </div>
  );
}
