import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Community() {
  return (
    <View className='community'>
      <View className='community-empty'>
        <Text className='community-empty-icon'>🏘️</Text>
        <Text className='community-empty-text'>社区功能开发中</Text>
      </View>
    </View>
  )
}
