import { View, Text, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'

export default function Login() {
  const [loading, setLoading] = useState(false)

  const handleWechatLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { code } = await Taro.login()
      const res = await Taro.request({
        url: `${API_BASE_URL}/api/auth/wechat-miniapp/login`,
        method: 'POST',
        data: { code },
      })

      if (res.data?.data?.access_token) {
        Taro.setStorageSync('access_token', res.data.data.access_token)
        Taro.setStorageSync('user', JSON.stringify(res.data.data.user))
        if (res.data.data.is_new_user) {
          Taro.showToast({ title: '欢迎加入易有吉！', icon: 'success', duration: 2000 })
        }
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/index/index' })
        }, 500)
      } else {
        Taro.showToast({ title: '登录失败', icon: 'error' })
      }
    } catch {
      Taro.showToast({ title: '登录失败，请重试', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login'>
      <View className='login-header'>
        <Text className='login-logo'>🎯</Text>
        <Text className='login-title'>易有吉</Text>
        <Text className='login-subtitle'>AI 命理咨询平台</Text>
      </View>
      <View className='login-actions'>
        <Button className='login-wechat-btn' onClick={handleWechatLogin} loading={loading}>
          {loading ? '登录中...' : '微信一键登录'}
        </Button>
      </View>
      <View className='login-footer'>
        <Text className='login-terms'>
          登录即表示同意《用户协议》和《隐私政策》
        </Text>
      </View>
    </View>
  )
}
