import { View, Text, Picker, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import '../common-divination.scss'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'

export default function ZiweiPage() {
  const [gender, setGender] = useState(0)
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [loading, setLoading] = useState(false)

  const GENDER_OPTIONS = ['男', '女']

  const handleSubmit = async () => {
    const token = Taro.getStorageSync('access_token')
    if (!token) { Taro.navigateTo({ url: '/pages/login/index' }); return }
    if (!birthDate) { Taro.showToast({ title: '请选择出生日期', icon: 'none' }); return }

    setLoading(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE_URL}/api/ziwei/calculate`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        data: {
          gender: GENDER_OPTIONS[gender] === '男' ? 'male' : 'female',
          birth_date: birthDate,
          birth_time: birthTime || '12:00',
        },
      })
      if (res.statusCode === 200 && res.data?.data) {
        Taro.navigateTo({ url: `/pages/ziwei-result/index?data=${encodeURIComponent(JSON.stringify(res.data.data))}` })
      } else {
        Taro.showToast({ title: res.data?.error?.message || '计算失败', icon: 'error' })
      }
    } catch { Taro.showToast({ title: '网络错误', icon: 'error' }) }
    finally { setLoading(false) }
  }

  return (
    <View className='divination-form'>
      <View className='form-card'>
        <View className='form-item'>
          <Text className='form-label'>性别</Text>
          <Picker mode='selector' range={GENDER_OPTIONS} value={gender} onChange={e => setGender(Number(e.detail.value))}>
            <View className='form-value'>{GENDER_OPTIONS[gender]}</View>
          </Picker>
        </View>
        <View className='form-item'>
          <Text className='form-label'>出生日期</Text>
          <Picker mode='date' value={birthDate} onChange={e => setBirthDate(e.detail.value)}>
            <View className='form-value'>{birthDate || '请选择'}</View>
          </Picker>
        </View>
        <View className='form-item'>
          <Text className='form-label'>出生时间</Text>
          <Picker mode='time' value={birthTime} onChange={e => setBirthTime(e.detail.value)}>
            <View className='form-value'>{birthTime || '请选择'}</View>
          </Picker>
        </View>
      </View>
      <Button className='submit-btn' onClick={handleSubmit} loading={loading}>开始排盘</Button>
    </View>
  )
}
