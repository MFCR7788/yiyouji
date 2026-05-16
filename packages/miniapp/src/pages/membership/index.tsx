import { View, Text, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { pricingPlans, checkPlanAvailability, calculateMonthlyPrice } from '@mingai/shared'
import type { PlanId } from '@mingai/shared'
import './index.scss'

export default function MembershipPage() {
  const [purchasing, setPurchasing] = useState<PlanId | null>(null)

  const user = (() => {
    try {
      return JSON.parse(Taro.getStorageSync('user') || 'null')
    } catch {
      return null
    }
  })()

  const currentMembership = user?.membership || 'free'

  const handlePurchase = async (planId: PlanId) => {
    const token = Taro.getStorageSync('access_token')
    if (!token) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }

    const availability = checkPlanAvailability(planId, currentMembership)
    if (!availability.available) {
      Taro.showToast({ title: availability.reason || '无法购买', icon: 'none' })
      return
    }

    setPurchasing(planId)
    try {
      const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'
      const orderRes = await Taro.request({
        url: `${API_BASE_URL}/api/membership/miniapp-purchase`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        data: { plan_id: planId },
      })

      if (orderRes.statusCode === 200 && orderRes.data?.data) {
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
        Taro.showToast({ title: '购买成功', icon: 'success' })
      } else {
        Taro.showToast({ title: orderRes.data?.error?.message || '创建订单失败', icon: 'none' })
      }
    } catch (err: any) {
      Taro.showToast({ title: err.message || '购买失败', icon: 'none' })
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <View className='membership'>
      <View className='membership-current'>
        <Text className='membership-current-label'>当前会员</Text>
        <Text className='membership-current-type'>
          {currentMembership === 'pro' ? 'Pro 会员' : currentMembership === 'plus' ? 'Plus 会员' : '免费用户'}
        </Text>
      </View>
      <View className='membership-plans'>
        {pricingPlans.filter(p => p.id !== 'free').map((plan) => {
          const availability = checkPlanAvailability(plan.id, currentMembership)
          const monthlyPrice = calculateMonthlyPrice(plan.id)
          return (
            <View key={plan.id} className='plan-card'>
              {plan.badge && <View className='plan-badge'>{plan.badge}</View>}
              <Text className='plan-name'>{plan.name}</Text>
              <Text className='plan-period'>{plan.period}</Text>
              <View className='plan-price-row'>
                <Text className='plan-price'>¥{plan.price}</Text>
                {plan.originalPrice && (
                  <Text className='plan-original-price'>¥{plan.originalPrice}</Text>
                )}
              </View>
              <Text className='plan-monthly'>月均 ¥{monthlyPrice}</Text>
              <View className='plan-features'>
                {plan.features.map((feature) => (
                  <Text key={feature} className='plan-feature'>✓ {feature}</Text>
                ))}
              </View>
              <Button
                className={`plan-btn ${!availability.available ? 'plan-btn--disabled' : ''}`}
                onClick={() => handlePurchase(plan.id)}
                disabled={!availability.available || purchasing === plan.id}
                loading={purchasing === plan.id}
              >
                {availability.available ? '立即开通' : '已拥有'}
              </Button>
            </View>
          )
        })}
      </View>
    </View>
  )
}
