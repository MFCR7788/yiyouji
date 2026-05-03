/**
 * 积分进度条组件
 */
'use client';

import { BotMessageSquare } from 'lucide-react';
import type { MembershipType } from '@/lib/user/membership';
import { getPlanConfig } from '@/lib/user/membership';

interface CreditProgressBarProps {
    credits: number;
    membershipType: MembershipType;
    bonusFromRegistration?: number;
}

export function CreditProgressBar({
  credits,
  membershipType,
  bonusFromRegistration,
}: CreditProgressBarProps) {
  const plan = getPlanConfig(membershipType);
  const baseLimit = plan.creditLimit;
  const displayLimit = Math.max(credits, baseLimit);
  const scaleMax = Math.max(credits, baseLimit, 1);
  const fillPercentage = Math.min((credits / scaleMax) * 100, 100);
  const limitMarkerPercentage = Math.min((baseLimit / scaleMax) * 100, 100);
  const earnedFromRegistration = bonusFromRegistration && bonusFromRegistration > 0 ? bonusFromRegistration : 0;
  const otherCredits = credits - earnedFromRegistration;

  return (
    <section className="overflow-hidden rounded-lg border border-[#ebe8e2] bg-[#f7f6f3]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ebe8e2] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-[#37352f]">
            <BotMessageSquare className="h-4 w-4 text-[#37352f]/45" />
            <span>当前积分</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tracking-tight text-[#37352f]">{credits}/{displayLimit}</div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="relative h-2 overflow-visible rounded-full bg-[#e6ede8]">
          <div
            className="h-full rounded-full bg-[#1f9d6d] transition-[width] duration-150"
            style={{ width: `${fillPercentage}%` }}
          />
          {credits <= baseLimit && (
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `clamp(0%, calc(${limitMarkerPercentage}% - 5px), calc(100% - 10px))` }}
            >
              <span className="block h-2.5 w-2.5 rounded-full border border-[#1f9d6d] bg-[#f7f6f3]" />
            </div>
          )}
        </div>
        {earnedFromRegistration > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs text-[#37352f]/48">
            <span>新用户赠送 {earnedFromRegistration} 积分</span>
            {otherCredits > 0 && <span>其他 {otherCredits} 积分</span>}
          </div>
        )}
      </div>
    </section>
  );
}
