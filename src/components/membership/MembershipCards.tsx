'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { pricingPlans, type PlanId, planIdToMembership } from '@/lib/user/membership';
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
        paymentConfigured?: boolean;
    } | null>(null);
    const { showToast } = useToast();

    const paidPlans = pricingPlans.filter(p => p.price > 0);

    const handlePurchase = async (planId: PlanId) => {
        if (!user) {
            setShowAuthModal(true);
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
                    paymentConfigured: data.data.paymentConfigured ?? true,
                });
                setShowPaymentModal(true);
                showToast('success', data.data?.message || '订单已创建');
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

                    return (
                        <div
                            key={plan.id}
                            className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                                plan.popular
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

                            <div className="p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                            plan.popular
                                                ? 'bg-[#1f9d6d]/10 text-[#1f9d6d]'
                                                : 'bg-[#f0f0ee] text-[#37352f]/60'
                                        }`}
                                    >
                                        {planIcons[plan.id]}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#37352f]">{plan.name}</h3>
                                        <p className="text-xs text-[#37352f]/50">{plan.period}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-[#37352f]">¥{plan.price}</span>
                                        {plan.originalPrice && (
                                            <span className="text-xs text-[#37352f]/40 line-through">
                                                ¥{plan.originalPrice}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ul className="mb-5 space-y-2">
                                    {plan.features.slice(0, 4).map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-xs text-[#37352f]/70">
                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f9d6d]" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    type="button"
                                    onClick={() => handlePurchase(plan.id as PlanId)}
                                    disabled={isCurrentPlan || isLoading}
                                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-150 ${
                                        isCurrentPlan
                                            ? 'cursor-default border border-[#e7e2d9] bg-[#f1efeb] text-[#37352f]/40'
                                            : plan.popular
                                              ? 'bg-[#1f9d6d] text-white hover:bg-[#178a5d] active:bg-[#146f4b]'
                                              : 'border border-[#e2ddd4] bg-[#37352f] text-white hover:bg-[#2a2826] active:bg-[#1f1e1c]'
                                    }`}
                                >
                                    {isLoading
                                        ? '处理中...'
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
                    paymentConfigured={paymentData.paymentConfigured}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
