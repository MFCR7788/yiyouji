import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { queryOrderStatus } from '@/lib/wechat-pay/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
      return jsonError(auth.error.message, auth.error.status, { success: false });
    }
    const { user } = auth;

    const resolvedParams = await params;
    const order = await queryOrderStatus(resolvedParams.orderId);

    if (order.user_id !== user.id) {
      return jsonError('Order not found', 404, { success: false });
    }

    return jsonOk({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        planId: order.plan_id,
        amount: order.amount,
        months: order.months,
        paidAt: order.paid_at,
      },
    });
  } catch (error) {
    console.error('[membership/order/status] Error:', error);
    return jsonError('Server error', 500, { success: false });
  }
}
