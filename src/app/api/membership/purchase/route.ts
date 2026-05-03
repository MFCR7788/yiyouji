import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { createPaymentOrder } from '@/lib/wechat-pay/service';
import { isWechatPayConfigured } from '@/lib/wechat-pay/client';
import type { PlanId } from '@/lib/user/membership';

interface PurchaseBody {
    planId: string;
}

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    return '127.0.0.1';
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status, { success: false });
        }
        const { user } = auth;

        const body = (await request.json()) as PurchaseBody;
        const { planId } = body;

        const clientIp = getClientIp(request);

        const { orderId, codeUrl, order } = await createPaymentOrder(
            user.id,
            planId as PlanId,
            clientIp,
        );

        const planNames: Record<string, string> = {
            plus: 'Plus 会员(3个月)',
            plus_6m: 'Plus 会员(6个月)',
            pro: 'Pro 会员(1年)',
        };

        return jsonOk({
            success: true,
            data: {
                orderId,
                codeUrl,
                plan: {
                    id: planId,
                    name: planNames[planId] || planId,
                    price: order.amount,
                    months: order.months,
                },
                paymentConfigured: isWechatPayConfigured(),
                message: isWechatPayConfigured()
                    ? '订单已创建，请扫码支付'
                    : '订单已创建，请联系管理员完成支付',
            },
        });
    } catch (error) {
        console.error('[membership/purchase] 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
