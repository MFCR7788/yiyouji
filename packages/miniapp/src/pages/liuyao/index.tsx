import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import '../common-divination.scss'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'

export default function LiuyaoPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const token = Taro.getStorageSync('access_token')
    if (!token) { Taro.navigateTo({ url: '/pages/login/index' }); return }
    setLoading(true)
    try {
      const res = await Taro.request({ url: `${API_BASE_URL}/api/liuyao`, method: 'POST', header: { Authorization: `Bearer ${token}` }, data: { question: question || '请为我占卜' } })
      if (res.statusCode === 200 && res.data?.data) { Taro.navigateTo({ url: `/pages/liuyao-result/index?data=${encodeURIComponent(JSON.stringify(res.data.data))}` }) }
      else { Taro.showToast({ title: res.data?.error?.message || '占卜失败', icon: 'error' }) }
    } catch { Taro.showToast({ title: '网络错误', icon: 'error' }) }
    finally { setLoading(false) }
  }

  return (
    <View className='divination-form'>
      <View className='form-card'>
        <View className='form-item'><Text className='form-label'>你的问题</Text><Input className='form-input' placeholder='输入你想占卜的问题...' value={question} onInput={e => setQuestion(e.detail.value)} /></View>
      </View>
      <Button className='submit-btn' onClick={handleSubmit} loading={loading}>开始占卜</Button>
    </View>
  )
}
