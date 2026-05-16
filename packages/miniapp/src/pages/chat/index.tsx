import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Chat() {
  return (
    <View className='chat'>
      <View className='chat-empty'>
        <Text className='chat-empty-icon'>💬</Text>
        <Text className='chat-empty-text'>AI 对话功能开发中</Text>
      </View>
    </View>
  )
}
