import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Daily() {
  return (
    <View className='daily'>
      <View className='daily-empty'>
        <Text className='daily-empty-icon'>☀️</Text>
        <Text className='daily-empty-text'>日运功能开发中</Text>
      </View>
    </View>
  )
}
