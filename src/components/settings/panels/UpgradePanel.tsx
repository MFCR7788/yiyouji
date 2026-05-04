/**
 * 订阅内容
 *
 * 'use client' 标记说明：
 * - 使用 hooks 管理会员状态
 * - 该模块供统一设置中心复用
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { MembershipCards } from '@/components/membership/MembershipCards';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { getMembershipInfo, type MembershipInfo } from '@/lib/user/membership';

export default function UpgradePanel() {
  const { user, loading: sessionLoading } = useSessionSafe();
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const handlePurchaseSuccess = () => {
    if (user) {
      void refreshMembership(user.id);
    }
  };

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="h-36 rounded-lg border border-gray-200 bg-[#f7f6f3] animate-pulse" />
      </div>
    );
  }

  const currentPlan = membership?.type || 'free';

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
      ) : null}

      <MembershipCards currentType={currentPlan} onPurchaseSuccess={handlePurchaseSuccess} />
    </div>
  );
}
