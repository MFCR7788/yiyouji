/**
 * 订阅内容
 *
 * 'use client' 标记说明：
 * - 使用 hooks 管理会员、签到、激活码与积分记录状态
 * - 该模块供统一设置中心复用
 */
'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Key,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  type CheckinStatus,
  fetchCheckinStatus,
  performCheckinAction,
} from '@/components/checkin/checkin-client';
import { AuthModal } from '@/components/auth/AuthModal';
import { CheckinModal } from '@/components/checkin/CheckinModal';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { CreditTransactionsPanel } from '@/components/membership/CreditTransactionsPanel';
import { KeyActivationModal } from '@/components/membership/KeyActivationModal';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useToast } from '@/components/ui/Toast';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getMembershipInfo, type MembershipInfo } from '@/lib/user/membership';

function ActionButton({
  icon,
  label,
  onClick,
  href,
  disabled = false,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  title?: string;
}) {
  const className = `inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    disabled
      ? 'cursor-not-allowed border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/42'
      : 'border-[#e2ddd4] bg-[#efedea] text-[#37352f] hover:bg-[#e7e4de] active:bg-[#dfdbd4]'
  }`;

  if (href && !disabled) {
    return (
      <a href={href} className={className} title={title}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function UpgradePanel() {
  const { user, loading: sessionLoading } = useSessionSafe();
  const { isFeatureEnabled, loaded: featureLoaded } = useFeatureToggles();
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const { showToast } = useToast();

  const checkinEnabled = featureLoaded && isFeatureEnabled('checkin');
  const containerClass = 'space-y-8';

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
      return null;
    } finally {
      setCheckinLoading(false);
    }
  }, [checkinEnabled, user]);

  const refreshMembershipAndCheckin = useCallback(async (userId: string) => {
    await Promise.all([
      refreshMembership(userId),
      checkinEnabled ? refreshCheckinStatus() : Promise.resolve(null),
    ]);
  }, [checkinEnabled, refreshCheckinStatus, refreshMembership]);

  useEffect(() => {
    const init = async () => {
      if (sessionLoading) return;
      if (user) {
        await refreshMembership(user.id);
      } else {
        setMembership(null);
        setMembershipError(null);
      }
      setLoading(false);
    };
    void init();
  }, [refreshMembership, sessionLoading, user]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !checkinEnabled) {
      setCheckinStatus(null);
      setCheckinError(null);
      return;
    }
    void refreshCheckinStatus();
  }, [checkinEnabled, refreshCheckinStatus, sessionLoading, user]);

  const handleKeySuccess = (info: MembershipInfo | null) => {
    if (info) {
      setMembership(info);
      setMembershipError(null);
    }

    if (user) {
      void refreshMembershipAndCheckin(user.id);
    }
    setTransactionsRefreshKey((value) => value + 1);
  };

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

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[#37352f]/10 animate-pulse" />
          <div className="h-7 w-36 rounded bg-[#37352f]/10 animate-pulse" />
          <div className="h-4 w-64 rounded bg-[#37352f]/5 animate-pulse" />
        </div>
        <div className="h-36 rounded-lg border border-gray-200 bg-[#f7f6f3] animate-pulse" />
        <div className="h-28 rounded-lg border border-gray-200 bg-[#f7f6f3] animate-pulse" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {user && membershipError && !membership ? (
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
        />
      )}

      <div className="rounded-lg border border-[#ebe8e2] bg-[#f7f6f3] px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setShowKeyModal(true);
            }}
            icon={<Key className="h-4 w-4" />}
            label="输入激活码"
          />
          {checkinEnabled ? (
            <div className="flex items-center gap-2">
              <ActionButton
                onClick={handleCheckinClick}
                icon={checkinButtonIcon}
                label={checkinButtonLabel}
                disabled={checkinDisabled}
              />
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <KeyActivationModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSuccess={handleKeySuccess}
      />

      <CheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        stackLevel="settings"
      />
    </div>
  );
}