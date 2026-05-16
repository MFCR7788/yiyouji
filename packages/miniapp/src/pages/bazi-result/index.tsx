import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function BaziResultPage() {
  const params = Taro.getCurrentInstance().router?.params
  let result: any = null
  try {
    result = params?.data ? JSON.parse(decodeURIComponent(params.data)) : null
  } catch { /* ignore */ }

  const handleAIAnalysis = () => {
    Taro.showToast({ title: 'AI 解读开发中', icon: 'none' })
  }

  if (!result) {
    return (
      <View className='bazi-result'>
        <Text>暂无排盘结果</Text>
      </View>
    )
  }

  return (
    <View className='bazi-result'>
      <View className='result-card'>
        <Text className='result-title'>八字排盘结果</Text>
        <View className='result-pillars'>
          {(result.pillars || []).map((pillar: any, index: number) => (
            <View key={index} className='pillar'>
              <Text className='pillar-label'>
                {['年柱', '月柱', '日柱', '时柱'][index]}
              </Text>
              <Text className='pillar-stem'>{pillar?.stem}</Text>
              <Text className='pillar-branch'>{pillar?.branch}</Text>
            </View>
          ))}
        </View>
      </View>
      <View className='result-info'>
        <Text className='result-info-text'>
          {result.summary || '排盘计算完成'}
        </Text>
      </View>
      <Button className='result-ai-btn' onClick={handleAIAnalysis}>
        AI 深度解读
      </Button>
    </View>
  )
}
