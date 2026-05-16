import { View, Text } from '@tarojs/components'
import './loading.scss'

interface LoadingProps {
  text?: string
}

export default function Loading({ text = '加载中...' }: LoadingProps) {
  return (
    <View className='loading-container'>
      <View className='loading-dots'>
        <View className='dot dot-1' />
        <View className='dot dot-2' />
        <View className='dot dot-3' />
      </View>
      <Text className='loading-text'>{text}</Text>
    </View>
  )
}
