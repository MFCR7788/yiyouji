import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { getSystemAdminClient } from '@/lib/supabase-server';
import { planIdToMembership } from '@/lib/user/membership';
import type { PlanId } from '@/lib/user/membership';

export async function POST(
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
    const orderId = resolvedParams.orderId;

    if (!orderId || typeof orderId !== 'string') {
      return jsonError('无效的订单ID', 400, { success: false });
    }

    const supabase = getSystemAdminClient();

    // 查询订单
    const { data: order, error: orderError } = await supabase
      .from('membership_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[membership/order/confirm] Order not found:', orderError);
      return jsonError('订单不存在', 404, { success: false });
    }

    // 验证订单归属
    if (order.user_id !== user.id) {
      return jsonError('无权操作此订单', 403, { success: false });
    }

    // 检查订单是否已支付
    if (order.status === 'paid') {
      return jsonOk({
        success: true,
        data: {
          confirmed: true,
          message: '订单已确认支付',
          alreadyPaid: true,
        },
      });
    }

    // 手动确认支付：直接标记为已支付并处理会员升级
    const now = new Date().toISOString();
    const planId = order.plan_id as PlanId;
    const membershipType = planIdToMembership(planId);

    // 获取用户当前会员信息
    const { data: userData } = await supabase
      .from('users')
      .select('membership_expires_at')
      .eq('id', user.id)
      .single();

    // 计算新的过期时间
    let newExpiresAt: Date;
    if (userData?.membership_expires_at && new Date(userData.membership_expires_at) > new Date()) {
      newExpiresAt = new Date(userData.membership_expires_at);
    } else {
      newExpiresAt = new Date();
    }
    newExpiresAt.setMonth(newExpiresAt.getMonth() + order.months);

    // 更新用户会员状态
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        membership: membershipType,
        membership_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (userUpdateError) {
      console.error('[membership/order/confirm] Update user failed:', userUpdateError);
      return jsonError('更新会员状态失败，请联系管理员', 500, { success: false });
    }

    // 更新订单状态
    const { error: orderUpdateError } = await supabase
      .from('membership_orders')
      .update({
        status: 'paid',
        transaction_id: `manual_${Date.now()}`,
        paid_at: now,
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('[membership/order/confirm] Update order failed:', orderUpdateError);
      return jsonError('更新订单状态失败，请联系管理员', 500, { success: false });
    }

    console.log(`[membership/order/confirm] User ${user.id} manually confirmed payment for order ${orderId}`);

    return jsonOk({
      success: true,
      data: {
        confirmed: true,
        message: '支付确认成功',
        membershipType,
        expiresAt: newExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[membership/order/confirm] Error:', error);
    return jsonError('服务器错误', 500, { success: false });
  }
}