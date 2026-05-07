'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Zap, Lock, ArrowUp } from 'lucide-react';
import { pricingPlans, type PlanId, planIdToMembership, checkPlanAvailability } from '@/lib/user/membership';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { AuthModal } from '@/components/auth/AuthModalV2';
import { useToast } from '@/components/ui/Toast';
import { PaymentModal } from './PaymentModal';

const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-5 w-5" />,
    plus: <Sparkles className="h-5 w-5" />,
    plus_6m: <Sparkles className="h-5 w-5" />,
    pro: <Crown className="h-5 w-5" />,
};

interface MembershipCardsProps {
    currentType: string;
    onPurchaseSuccess?: () => void;
}

export function MembershipCards({ currentType, onPurchaseSuccess }: MembershipCardsProps) {
    const { user } = useSessionSafe();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState<{
        orderId: string;
        codeUrl?: string;
        planName: string;
        price: number;
    } | null>(null);
    const { showToast } = useToast();

    const paidPlans = pricingPlans.filter(p => p.price > 0);

    // 检查每个套餐的可用性
    const currentMembershipType = currentType !== 'free' ? currentType as 'plus' | 'pro' | null : null;
    const planAvailability = paidPlans.reduce((acc, plan) => {
        acc[plan.id] = checkPlanAvailability(plan.id, currentMembershipType);
        return acc;
    }, {} as Record<string, ReturnType<typeof checkPlanAvailability>>);

    const handlePurchase = async (planId: PlanId) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }

        // 检查套餐是否可用
        const availability = checkPlanAvailability(planId, currentMembershipType);
        if (!availability.available) {
            showToast('warning', availability.reason || '该套餐不可用');
            return;
        }

        const membershipType = planIdToMembership(planId);
        if (membershipType === currentType) {
            showToast('info', '您已是该会员等级');
            return;
        }

        setPurchasingPlan(planId);
        try {
            const res = await fetch('/api/membership/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });
            const data = await res.json();
            if (data.success) {
                setPaymentData({
                    orderId: data.data.orderId,
                    codeUrl: data.data.codeUrl,
                    planName: data.data.plan.name,
                    price: data.data.plan.price,
                });
                setShowPaymentModal(true);
            } else {
                showToast('error', data.error || '购买失败');
            }
        } catch {
            showToast('error', '网络错误，请稍后重试');
        } finally {
            setPurchasingPlan(null);
        }
    };

    const handlePaymentSuccess = () => {
        onPurchaseSuccess?.();
        setTimeout(() => {
            setShowPaymentModal(false);
            setPaymentData(null);
        }, 1500);
    };

    const handleClosePayment = () => {
        setShowPaymentModal(false);
        setPaymentData(null);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {paidPlans.map((plan) => {
                    const isCurrentPlan =
                        planIdToMembership(plan.id as PlanId) === currentType &&
                        currentType !== 'free';
                    const isLoading = purchasingPlan === plan.id;
                    const availability = planAvailability[plan.id];
                    const isDisabled = !availability?.available;

                    return (
                        <div
                            key={plan.id}
                            className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                                isDisabled
                                    ? 'border-[#e7e2d9] bg-[#f7f6f3] opacity-60'
                                    : plan.popular
                                      ? 'border-[#1f9d6d] bg-[#f0faf6] shadow-sm'
                                      : isCurrentPlan
                                        ? 'border-[#e7e2d9] bg-[#f7f6f3]'
                                        : 'border-[#ebe8e2] bg-white hover:border-[#d5d0c7] hover:shadow-md'
                            }`}
                        >
                            {plan.badge && (
                                <div className="absolute right-0 top-0">
                                    <div
                                        className={`rounded-bl-lg px-3 py-1 text-xs font-medium ${
                                            plan.popular
                                                ? 'bg-[#1f9d6d] text-white'
                                                : 'bg-[#f0f0ee] text-[#37352f]/70'
                                        }`}
                                    >
                                        {plan.badge}
                                    </div>
                                </div>
                            )}

                            {/* 禁用状态遮罩 */}
                            {isDisabled && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
                                    <div className="text-center px-4">
                                        <Lock className="mx-auto h-6 w-6 text-[#37352f]/40 mb-2" />
                                        <p className="text-xs font-medium text-[#37352f]/60">
                                            {availability?.reason || '当前不可用'}
                                        </p>
                                        {availability?.canUpgrade && (
                                            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[#1f9d6d]">
                                                <ArrowUp className="h-3 w-3" />
                                                可升级
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                            isDisabled
                                                ? 'bg-[#f0f0ee] text-[#37352f]/30'
                                                : plan.popular
                                                  ? 'bg-[#1f9d6d]/10 text-[#1f9d6d]'
                                                  : 'bg-[#f0f0ee] text-[#37352f]/60'
                                        }`}
                                    >
                                        {planIcons[plan.id]}
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-semibold ${isDisabled ? 'text-[#37352f]/50' : 'text-[#37352f]'}`}>{plan.name}</h3>
                                        <p className={`text-xs ${isDisabled ? 'text-[#37352f]/30' : 'text-[#37352f]/50'}`}>{plan.period}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold ${isDisabled ? 'text-[#37352f]/40' : 'text-[#37352f]'}`}>¥{plan.price}</span>
                                        {plan.originalPrice && (
                                            <span className="text-xs text-[#37352f]/40 line-through">
                                                ¥{plan.originalPrice}
                                            </span>
                                        )}
                                    </div>
                                    {/* 显示积分奖励 */}
                                    {(plan as any).creditReward > 0 && (
                                        <p className={`mt-1 text-[10px] ${isDisabled ? 'text-[#37352f]/30' : 'text-[#1f9d6d]'}`}>
                                            赠送 {(plan as any).creditReward} 积分
                                        </p>
                                    )}
                                </div>

                                <ul className="mb-5 space-y-2">
                                    {plan.features.slice(0, 4).map((feature) => (
                                        <li key={feature} className={`flex items-start gap-2 text-xs ${isDisabled ? 'text-[#37352f]/30' : 'text-[#37352f]/70'}`}>
                                            <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isDisabled ? 'text-[#37352f]/20' : 'text-[#1f9d6d]'}`} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    type="button"
                                    onClick={() => handlePurchase(plan.id as PlanId)}
                                    disabled={isCurrentPlan || isDisabled || isLoading}
                                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-150 ${
                                        isDisabled
                                            ? 'cursor-not-allowed border border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/30'
                                            : isCurrentPlan
                                              ? 'cursor-default border border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/40'
                                              : plan.popular
                                                ? 'bg-[#1f9d6d] text-white hover:bg-[#178a5d] active:bg-[#146f4b]'
                                                : 'border border-[#e2ddd4] bg-[#37352f] text-white hover:bg-[#2a2826] active:bg-[#1f1e1c]'
                                    }`}
                                >
                                    {isLoading
                                        ? '处理中...'
                                        : isDisabled
                                          ? '不可用'
                                          : isCurrentPlan
                                            ? '当前套餐'
                                            : '立即开通'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            {paymentData && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={handleClosePayment}
                    orderId={paymentData.orderId}
                    codeUrl={paymentData.codeUrl}
                    planName={paymentData.planName}
                    price={paymentData.price}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
