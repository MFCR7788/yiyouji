import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'
export default function HepanPage() {
  return (
    <View className='divination-form'>
      <View className='form-card'>
        <Text className='form-title'>八字合盘</Text>
        <Text className='form-desc'>输入双方信息，分析八字合盘</Text>
      </View>
      <Button className='submit-btn' onClick={() => Taro.showToast({ title: '合盘功能开发中', icon: 'none' })}>开始合盘</Button>
    </View>
  )
}
