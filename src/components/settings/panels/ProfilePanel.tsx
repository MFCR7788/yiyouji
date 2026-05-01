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

/**
 * 昵称编辑器组件 - 独立的、可完全编辑的输入控件
 */
function NicknameEditor({
  initialValue,
  saving,
  hasChanges,
  onSave,
  onChange,
}: {
  initialValue: string;
  saving: boolean;
  hasChanges: boolean;
  onSave: () => void;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hasChanges && localValue.trim() !== '' && !saving) {
      e.preventDefault();
      onSave();
    }
  };

  const canSave = hasChanges && localValue.trim() !== '' && !saving;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={saving}
        maxLength={20}
        placeholder="输入昵称..."
        style={{
          width: '180px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: '#fff',
          color: '#111827',
          fontSize: '14px',
          outline: 'none',
          cursor: saving ? 'not-allowed' : 'text',
          opacity: saving ? 0.5 : 1,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db';
          e.target.style.boxShadow = 'none';
        }}
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: canSave ? 'pointer' : 'not-allowed',
          border: `1px solid ${canSave ? '#3b82f6' : '#e5e7eb'}`,
          background: canSave ? '#eff6ff' : '#f9fafb',
          color: canSave ? '#2563eb' : '#9ca3af',
          whiteSpace: 'nowrap',
        }}
      >
        {saving ? '保存中...' : canSave ? '保存' : '已保存'}
      </button>
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
      setNickname(profile.nickname || '');
      setOriginalNickname(profile.nickname || '');
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
              {/* 昵称编辑行 */}
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-medium text-foreground shrink-0">显示昵称</p>
                <NicknameEditor
                  initialValue={nickname}
                  saving={saving}
                  hasChanges={hasNicknameChanges}
                  onSave={handleSave}
                  onChange={setNickname}
                />
              </div>

              {/* 手机号行 */}
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-medium text-foreground shrink-0">手机号码</p>
                <span className="rounded-md bg-background-secondary/50 px-3 py-2 font-mono text-sm text-foreground/50 truncate max-w-[200px]">
                  {displayPhone || '未绑定'}
                </span>
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
