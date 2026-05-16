import Taro from '@tarojs/taro'
import { getAccessToken } from './auth'
import type { PlanId } from '@mingai/shared'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'

export async function purchasePlan(planId: PlanId): Promise<void> {
  const token = await getAccessToken()
  if (!token) {
    Taro.navigateTo({ url: '/pages/login/index' })
    return
  }

  const orderRes = await Taro.request({
    url: `${API_BASE_URL}/api/membership/miniapp-purchase`,
    method: 'POST',
    header: { Authorization: `Bearer ${token}` },
    data: { plan_id: planId },
  })

  if (orderRes.statusCode !== 200 || !orderRes.data?.data) {
    throw new Error(orderRes.data?.error?.message || '创建订单失败')
  }

  const paymentParams = orderRes.data.data

  await new Promise<void>((resolve, reject) => {
    Taro.requestPayment({
      timeStamp: paymentParams.timeStamp,
      nonceStr: paymentParams.nonceStr,
      package: paymentParams.package,
      signType: paymentParams.signType,
      paySign: paymentParams.paySign,
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || '支付取消')),
    })
  })
}
