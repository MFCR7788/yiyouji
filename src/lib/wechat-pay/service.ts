import { getSystemAdminClient } from '@/lib/supabase-server'
import { WechatPayClient, getWechatPayConfig } from './client'
import type { MembershipOrder, WechatPayTransaction } from './types'
import type { PlanId } from '@/lib/user/membership'
import { planIdToMembership, getCreditReward, getPlanConfig } from '@/lib/user/membership'

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
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID')
  }

  const validPlans = [
    { id: 'plus' as PlanId, price: 98, months: 3 },
    { id: 'plus_6m' as PlanId, price: 168, months: 6 },
    { id: 'pro' as PlanId, price: 258, months: 12 },
  ]
  const plan = validPlans.find(p => p.id === planId)
  if (!plan) {
    console.error('[Payment] Invalid plan ID:', planId)
    throw new Error(`Invalid plan: ${planId}`)
  }

  try {
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

    if (orderError) {
      console.error('[Payment] Create order DB error:', orderError.message, orderError.code, orderError.details)
      throw new Error(`Database error: ${orderError.message}`)
    }

    if (!orderData) {
      console.error('[Payment] No data returned after insert')
      throw new Error('Create order failed: no data returned')
    }

    const order: MembershipOrder = {
      id: orderData.id,
      user_id: orderData.user_id,
      plan_id: orderData.plan_id,
      amount: orderData.amount,
      months: orderData.months,
      status: orderData.status,
      out_trade_no: orderData.out_trade_no,
      transaction_id: orderData.transaction_id || orderData.pay_transaction_id,
      paid_at: orderData.paid_at ? new Date(orderData.paid_at) : undefined,
      created_at: new Date(orderData.created_at),
      updated_at: new Date(orderData.updated_at),
    }

    const payConfig = getWechatPayConfig()

    if (!payConfig) {
      console.warn('[Payment] WeChat Pay not configured, returning order without payment URL')
      return { orderId: order.id, order }
    }

    const outTradeNo = generateOutTradeNo(order.id)

    try {
      const { error: updateError } = await supabase
        .from('membership_orders')
        .update({ out_trade_no: outTradeNo })
        .eq('id', order.id)

      if (updateError) {
        console.error('[Payment] Update out_trade_no failed:', updateError.message)
      }
    } catch (updateEx) {
      console.error('[Payment] Update out_trade_no exception:', updateEx)
    }

    try {
      const client = new WechatPayClient(payConfig)
      console.log('[Payment] 调用微信支付 Native 下单接口:', {
        planId,
        outTradeNo,
        amount: plan.price * 100,
        notifyUrl: payConfig.notifyUrl,
        hasClientIp: !!clientIp,
      })

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

      console.log('[Payment] 微信支付下单成功:', { orderId: order.id, hasCodeUrl: !!codeUrl })

      return {
        orderId: order.id,
        codeUrl,
        order: {
          ...order,
          out_trade_no: outTradeNo,
        },
      }
    } catch (wechatError) {
      const errorMsg = wechatError instanceof Error ? wechatError.message : String(wechatError)
      const statusCode = (wechatError as any)?.statusCode
      const wechatPayCode = (wechatError as any)?.wechatPayCode

      console.error('[Payment] WeChat Pay API 调用失败:', {
        error: errorMsg,
        statusCode,
        wechatPayCode,
        stack: wechatError instanceof Error ? wechatError.stack : undefined,
        config: {
          mchid: payConfig.mchid,
          appid: payConfig.appid,
          mchSerialNo: payConfig.mchSerialNo,
          notifyUrl: payConfig.notifyUrl,
          hasPrivateKey: !!payConfig.privateKey,
          privateKeyLength: payConfig.privateKey?.length,
        },
      })

      if (statusCode === 401 || statusCode === 403 || wechatPayCode === 'SIGN_ERROR' || wechatPayCode === 'NO_AUTH') {
        throw new Error(`WechatPay: 认证失败 [${wechatPayCode || statusCode}]，请检查商户证书或私钥配置`)
      }

      if (statusCode === 400 || wechatPayCode?.startsWith('INVALID_') || wechatPayCode === 'PARAM_ERROR') {
        throw new Error(`WechatPay: 请求参数错误 [${wechatPayCode || statusCode}]`)
      }

      if (errorMsg.includes('网络连接失败') || errorMsg.includes('fetch') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT')) {
        throw new Error('WechatPay: 网络连接失败，无法连接微信支付服务器，请检查网络或防火墙设置')
      }

      throw new Error(`WechatPay: ${errorMsg}`)
    }
  } catch (dbError) {
    if (dbError instanceof Error && dbError.message.startsWith('Database error:')) {
      throw dbError
    }
    if (dbError instanceof Error && dbError.message.startsWith('WechatPay:')) {
      throw dbError
    }
    console.error('[Payment] Unexpected error in createPaymentOrder:', dbError)
    throw new Error('Create order failed')
  }
}

export async function createJSAPIPaymentOrder(
  userId: string,
  planId: PlanId,
  openid: string,
): Promise<{ orderId: string; paymentParams?: { timeStamp: string; nonceStr: string; package: string; signType: string; paySign: string }; order: MembershipOrder }> {
  const supabase = getSystemAdminClient()

  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID')
  }

  if (!openid || typeof openid !== 'string') {
    throw new Error('Invalid openid')
  }

  const validPlans = [
    { id: 'plus' as PlanId, price: 98, months: 3 },
    { id: 'plus_6m' as PlanId, price: 168, months: 6 },
    { id: 'pro' as PlanId, price: 258, months: 12 },
  ]
  const plan = validPlans.find(p => p.id === planId)
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`)
  }

  try {
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

    if (orderError) {
      console.error('[JSAPI Payment] Create order DB error:', orderError.message)
      throw new Error(`Database error: ${orderError.message}`)
    }

    if (!orderData) {
      throw new Error('Create order failed: no data returned')
    }

    const order: MembershipOrder = {
      id: orderData.id,
      user_id: orderData.user_id,
      plan_id: orderData.plan_id,
      amount: orderData.amount,
      months: orderData.months,
      status: orderData.status,
      out_trade_no: orderData.out_trade_no,
      transaction_id: orderData.transaction_id || orderData.pay_transaction_id,
      paid_at: orderData.paid_at ? new Date(orderData.paid_at) : undefined,
      created_at: new Date(orderData.created_at),
      updated_at: new Date(orderData.updated_at),
    }

    const payConfig = getWechatPayConfig()

    if (!payConfig) {
      console.warn('[JSAPI Payment] WeChat Pay not configured, returning order without payment params')
      return { orderId: order.id, order }
    }

    const outTradeNo = generateOutTradeNo(order.id)

    try {
      const { error: updateError } = await supabase
        .from('membership_orders')
        .update({ out_trade_no: outTradeNo })
        .eq('id', order.id)

      if (updateError) {
        console.error('[JSAPI Payment] Update out_trade_no failed:', updateError.message)
      }
    } catch (updateEx) {
      console.error('[JSAPI Payment] Update out_trade_no exception:', updateEx)
    }

    try {
      const client = new WechatPayClient(payConfig)
      console.log('[JSAPI Payment] 调用微信支付 JSAPI 下单接口:', {
        planId,
        outTradeNo,
        amount: plan.price * 100,
        openid,
      })

      const { prepayId } = await client.createJSAPIPay({
        description: getPlanDescription(planId),
        outTradeNo,
        notifyUrl: payConfig.notifyUrl,
        openid,
        amount: {
          total: plan.price * 100,
          currency: 'CNY',
        },
      })

      const paymentParams = client.signMiniappPayment(prepayId)

      console.log('[JSAPI Payment] 微信支付 JSAPI 下单成功:', { orderId: order.id, hasPrepayId: !!prepayId })

      return {
        orderId: order.id,
        paymentParams,
        order: {
          ...order,
          out_trade_no: outTradeNo,
        },
      }
    } catch (wechatError) {
      const errorMsg = wechatError instanceof Error ? wechatError.message : String(wechatError)
      console.error('[JSAPI Payment] WeChat Pay API 调用失败:', errorMsg)
      throw new Error(`WechatPay JSAPI: ${errorMsg}`)
    }
  } catch (dbError) {
    if (dbError instanceof Error && (dbError.message.startsWith('Database error:') || dbError.message.startsWith('WechatPay'))) {
      throw dbError
    }
    console.error('[JSAPI Payment] Unexpected error:', dbError)
    throw new Error('Create JSAPI order failed')
  }
}

export async function handlePaymentSuccess(transaction: WechatPayTransaction): Promise<void> {
  const supabase = getSystemAdminClient()
  const { out_trade_no, transaction_id, success_time } = transaction

  if (!out_trade_no) {
    console.error('[Payment Callback] Missing out_trade_no in transaction')
    return
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('membership_orders')
      .select('*')
      .eq('out_trade_no', out_trade_no)
      .single()

    if (orderError) {
      console.error('[Payment] Query order failed:', out_trade_no, orderError.message)
      return
    }

    if (!order) {
      console.error('[Payment] Order not found:', out_trade_no)
      return
    }

    if (order.status === 'paid') {
      console.log('[Payment] Order already paid:', order.id)
      return
    }

    const planId = order.plan_id as PlanId
    const membershipType = planIdToMembership(planId)

    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', order.user_id).single()

      let newExpiresAt: Date
      if (userData?.membership_expires_at && new Date(userData.membership_expires_at) > new Date()) {
        newExpiresAt = new Date(userData.membership_expires_at)
      } else {
        newExpiresAt = new Date()
      }
      newExpiresAt.setMonth(newExpiresAt.getMonth() + order.months)

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          membership: membershipType,
          membership_expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', order.user_id)

      if (userUpdateError) {
        console.error('[Payment] Update user membership failed:', userUpdateError.message)
        return
      }

      const { error: orderUpdateError } = await supabase
        .from('membership_orders')
        .update({
          status: 'paid',
          transaction_id,
          paid_at: success_time || new Date().toISOString(),
        })
        .eq('id', order.id)

      if (orderUpdateError) {
        console.error('[Payment] Update order status failed:', orderUpdateError.message)
      }

      // 赠送积分
      const creditReward = getCreditReward(planId)
      if (creditReward > 0) {
        try {
          const { data: currentData } = await supabase
            .from('users')
            .select('ai_chat_count')
            .eq('id', order.user_id)
            .maybeSingle()

          const currentCredits = (currentData?.ai_chat_count as number) || 0
          const targetCredits = currentCredits + creditReward

          const { error: creditError } = await supabase
            .from('users')
            .update({ ai_chat_count: targetCredits })
            .eq('id', order.user_id)

          if (creditError) {
            console.error('[Payment] Credit reward update failed:', creditError.message)
          } else {
            console.info(`[Payment] Credit reward ${creditReward} added for user ${order.user_id}, total: ${targetCredits}`)

            // 记录积分交易日志
            try {
              const { logCreditTransaction } = await import('@/lib/user/credit-transactions')
              await logCreditTransaction({
                userId: order.user_id,
                amount: creditReward,
                type: 'earn',
                source: 'membership_purchase',
                description: `购买${getPlanConfig(planId).name}(${getPlanConfig(planId).period})赠送 ${creditReward} 积分`,
              })
            } catch (logError) {
              console.error('[Payment] Log credit transaction failed:', logError)
            }
          }
        } catch (creditEx) {
          console.error('[Payment] Credit reward exception:', creditEx)
        }
      }

      console.log('[Payment] Payment success processed for order:', order.id)
    } catch (processError) {
      console.error('[Payment] Process payment success error:', processError)
    }
  } catch (queryError) {
    console.error('[Payment] Handle payment success unexpected error:', queryError)
  }
}

export async function queryOrderStatus(orderId: string): Promise<MembershipOrder> {
  if (!orderId || typeof orderId !== 'string') {
    throw new Error('Invalid order ID')
  }

  const supabase = getSystemAdminClient()

  const { data: order, error: orderError } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError) {
    console.error('[Payment] Query order DB error:', orderError.message)
    throw new Error('Order not found')
  }

  if (!order) {
    throw new Error('Order not found')
  }

  const payConfig = getWechatPayConfig()

  if (payConfig && order.out_trade_no && order.status === 'pending') {
    try {
      const client = new WechatPayClient(payConfig)
      const transaction = await client.queryOrder(order.out_trade_no)

      if (transaction.trade_state === 'SUCCESS') {
        await handlePaymentSuccess(transaction)
        
        const { data: refreshedOrder } = await supabase
          .from('membership_orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (refreshedOrder) {
          return mapDbOrderToMembershipOrder(refreshedOrder)
        }
      }
    } catch (e) {
      console.error('[Payment] Query wechat order failed:', e)
    }
  }

  return mapDbOrderToMembershipOrder(order)
}

function mapDbOrderToMembershipOrder(dbOrder: Record<string, unknown>): MembershipOrder {
  return {
    id: String(dbOrder.id),
    user_id: String(dbOrder.user_id),
    plan_id: String(dbOrder.plan_id),
    amount: Number(dbOrder.amount),
    months: Number(dbOrder.months),
    status: dbOrder.status as MembershipOrder['status'],
    out_trade_no: dbOrder.out_trade_no as string | undefined,
    transaction_id: (dbOrder.transaction_id || dbOrder.pay_transaction_id) as string | undefined,
    paid_at: dbOrder.paid_at ? new Date(String(dbOrder.paid_at)) : undefined,
    created_at: new Date(String(dbOrder.created_at)),
    updated_at: new Date(String(dbOrder.updated_at)),
  }
}
