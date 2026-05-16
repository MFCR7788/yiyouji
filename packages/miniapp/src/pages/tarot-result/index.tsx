import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'

export default function TarotResultPage() {
  const params = Taro.getCurrentInstance().router?.params
  let result: any = null
  try { result = params?.data ? JSON.parse(decodeURIComponent(params.data)) : null } catch { /* ignore */ }

  return (
    <View className='result-page'>
      <View className='result-card'>
        <Text className='result-title'>塔罗占卜结果</Text>
        <Text className='result-summary'>{result?.summary || '占卜完成'}</Text>
      </View>
      <Button className='ai-btn' onClick={() => Taro.showToast({ title: 'AI 解读开发中', icon: 'none' })}>AI 深度解读</Button>
    </View>
  )
}
