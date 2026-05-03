import { getSystemAdminClient } from '@/lib/supabase-server'
import { WechatPayClient, getWechatPayConfig } from './client'
import type { MembershipOrder, WechatPayTransaction } from './types'
import type { PlanId } from '@/lib/user/membership'
import { planIdToMembership } from '@/lib/user/membership'

function generateOutTradeNo(orderId: string): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MG${timestamp}${random}${orderId.slice(0, 8)}`
}

function getPlanDescription(planId: PlanId): string {
  const descriptions: Record<PlanId, string> = {
    free: '免费会员',
    plus: 'Plus会员(3个月)',
    plus_6m: 'Plus会员(6个月)',
    pro: 'Pro会员(1年)',
  }
  return descriptions[planId] || '会员充值'
}

export async function createPaymentOrder(
  userId: string,
  planId: PlanId,
  clientIp?: string,
): Promise<{ orderId: string; codeUrl?: string; order: MembershipOrder }> {
  const supabase = getSystemAdminClient()
  const payConfig = getWechatPayConfig()

  const validPlans = [
    { id: 'plus' as PlanId, price: 98, months: 3 },
    { id: 'plus_6m' as PlanId, price: 168, months: 6 },
    { id: 'pro' as PlanId, price: 258, months: 12 },
  ]
  const plan = validPlans.find(p => p.id === planId)
  if (!plan) {
    throw new Error('Invalid plan')
  }

  const { data: orderData, error: orderError } = await supabase
    .from('membership_orders')
    .insert({
      user_id: userId,
      plan_id: planId,
      amount: plan.price,
      months: plan.months,
      status: 'pending',
    })
    .select('*')
    .single()

  if (orderError || !orderData) {
    console.error('[Payment] Create order failed:', orderError)
    throw new Error('Create order failed')
  }

  const order: MembershipOrder = {
    id: orderData.id,
    user_id: orderData.user_id,
    plan_id: orderData.plan_id,
    amount: orderData.amount,
    months: orderData.months,
    status: orderData.status,
    out_trade_no: orderData.out_trade_no,
    transaction_id: orderData.transaction_id,
    paid_at: orderData.paid_at ? new Date(orderData.paid_at) : undefined,
    created_at: new Date(orderData.created_at),
    updated_at: new Date(orderData.updated_at),
  }

  if (!payConfig) {
    return { orderId: order.id, order }
  }

  const outTradeNo = generateOutTradeNo(order.id)

  const { error: updateError } = await supabase
    .from('membership_orders')
    .update({ out_trade_no: outTradeNo })
    .eq('id', order.id)

  if (updateError) {
    console.error('[Payment] Update out_trade_no failed:', updateError)
  }

  const client = new WechatPayClient(payConfig)
  const { codeUrl } = await client.createNativePay({
    description: getPlanDescription(planId),
    outTradeNo,
    notifyUrl: payConfig.notifyUrl,
    amount: {
      total: plan.price * 100,
      currency: 'CNY',
    },
    sceneInfo: clientIp
      ? {
          payerClientIp: clientIp,
        }
      : undefined,
  })

  return {
    orderId: order.id,
    codeUrl,
    order: {
      ...order,
      out_trade_no: outTradeNo,
    },
  }
}

export async function handlePaymentSuccess(transaction: WechatPayTransaction): Promise<void> {
  const supabase = getSystemAdminClient()
  const { out_trade_no, transaction_id, success_time } = transaction

  const { data: order, error: orderError } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('out_trade_no', out_trade_no)
    .single()

  if (orderError || !order) {
    console.error('[Payment] Order not found:', out_trade_no, orderError)
    return
  }

  if (order.status === 'paid') {
    console.log('[Payment] Order already paid:', order.id)
    return
  }

  const planId = order.plan_id as PlanId
  const membershipType = planIdToMembership(planId)

  const { data: userData } = await supabase.from('users').select('*').eq('id', order.user_id).single()

  let newExpiresAt: Date
  if (userData?.membership_expires_at && new Date(userData.membership_expires_at) > new Date()) {
    newExpiresAt = new Date(userData.membership_expires_at)
  } else {
    newExpiresAt = new Date()
  }
  newExpiresAt.setMonth(newExpiresAt.getMonth() + order.months)

  await supabase
    .from('users')
    .update({
      membership: membershipType,
      membership_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', order.user_id)

  await supabase
    .from('membership_orders')
    .update({
      status: 'paid',
      transaction_id,
      paid_at: success_time || new Date().toISOString(),
    })
    .eq('id', order.id)
}

export async function queryOrderStatus(orderId: string): Promise<MembershipOrder> {
  const supabase = getSystemAdminClient()

  const { data: order, error: orderError } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  const payConfig = getWechatPayConfig()

  if (payConfig && order.out_trade_no && order.status === 'pending') {
    try {
      const client = new WechatPayClient(payConfig)
      const transaction = await client.queryOrder(order.out_trade_no)

      if (transaction.trade_state === 'SUCCESS') {
        await handlePaymentSuccess(transaction)
      }
    } catch (e) {
      console.error('[Payment] Query wechat order failed:', e)
    }
  }

  const { data: refreshedOrder } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  return {
    id: refreshedOrder!.id,
    user_id: refreshedOrder!.user_id,
    plan_id: refreshedOrder!.plan_id,
    amount: refreshedOrder!.amount,
    months: refreshedOrder!.months,
    status: refreshedOrder!.status,
    out_trade_no: refreshedOrder!.out_trade_no,
    transaction_id: refreshedOrder!.transaction_id,
    paid_at: refreshedOrder!.paid_at ? new Date(refreshedOrder!.paid_at) : undefined,
    created_at: new Date(refreshedOrder!.created_at),
    updated_at: new Date(refreshedOrder!.updated_at),
  }
}

