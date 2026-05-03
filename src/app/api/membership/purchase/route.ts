import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

interface PurchaseBody {
    planId: string;
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

        const validPlans = [
            { id: 'plus', price: 98, months: 3, membershipType: 'plus' },
            { id: 'plus_6m', price: 168, months: 6, membershipType: 'plus' },
            { id: 'pro', price: 258, months: 12, membershipType: 'pro' },
        ];

        const plan = validPlans.find(p => p.id === planId);
        if (!plan) {
            return jsonError('无效的套餐', 400, { success: false });
        }

        const { data: orderData, error: orderError } = await auth.db
            .from('membership_orders')
            .insert({
                user_id: user.id,
                plan_id: plan.id,
                amount: plan.price,
                months: plan.months,
                status: 'pending',
            })
            .select('id')
            .single();

        if (orderError) {
            console.error('[membership/purchase] 创建订单失败:', orderError);
            return jsonError('创建订单失败，请稍后重试', 500, { success: false });
        }

        return jsonOk({
            success: true,
            data: {
                orderId: orderData.id,
                plan: {
                    id: plan.id,
                    name: plan.id === 'plus' ? 'Plus 会员(3个月)' : plan.id === 'plus_6m' ? 'Plus 会员(6个月)' : 'Pro 会员(1年)',
                    price: plan.price,
                    months: plan.months,
                },
                payUrl: null,
                message: '订单已创建，请联系管理员完成支付',
            },
        });
    } catch (error) {
        console.error('[membership/purchase] 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
