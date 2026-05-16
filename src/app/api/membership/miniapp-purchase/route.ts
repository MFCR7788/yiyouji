import { NextRequest } from 'next/server'
import { requireUserContext, jsonOk, jsonError, getSystemAdminClient } from '@/lib/api-utils'
import type { PlanId } from '@/lib/user/membership'
import { getPlanConfig, checkPlanAvailability } from '@/lib/user/membership'
import { createJSAPIPaymentOrder } from '@/lib/wechat-pay/service'

export async function POST(request: NextRequest) {
    const authResult = await requireUserContext(request)
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status)
    }

    try {
        const body = await request.json()
        const { plan_id } = body as { plan_id: PlanId }

        if (!plan_id || !['plus', 'plus_6m', 'pro'].includes(plan_id)) {
            return jsonError('无效的套餐 ID', 400)
        }

        const plan = getPlanConfig(plan_id)

        const { data: userProfile } = await getSystemAdminClient()
            .from('users')
            .select('membership')
            .eq('id', authResult.user.id)
            .single()

        const availability = checkPlanAvailability(plan_id, userProfile?.membership)
        if (!availability.available) {
            return jsonError(availability.reason || '无法购买此套餐', 400)
        }

        const { data: oauthBinding } = await getSystemAdminClient()
            .from('user_oauth_providers')
            .select('provider_user_id')
            .eq('user_id', authResult.user.id)
            .eq('provider', 'wechat_miniapp')
            .single()

        if (!oauthBinding?.provider_user_id) {
            return jsonError('未绑定微信账号，无法使用小程序支付', 400)
        }

        const openid = oauthBinding.provider_user_id

        const result = await createJSAPIPaymentOrder(authResult.user.id, plan_id, openid)

        return jsonOk({
            orderId: result.orderId,
            paymentParams: result.paymentParams,
            amount: plan.price,
        })
    } catch (error) {
        console.error('[miniapp-purchase] Error:', error)
        return jsonError('创建订单失败', 500)
    }
}
