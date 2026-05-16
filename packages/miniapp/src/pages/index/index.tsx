import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const DIVINATION_MODULES = [
  { id: 'bazi', name: '八字排盘', icon: '🎯', path: '/pages/bazi/index' },
  { id: 'ziwei', name: '紫微斗数', icon: '⭐', path: '/pages/ziwei/index' },
  { id: 'tarot', name: '塔罗占卜', icon: '🔮', path: '/pages/tarot/index' },
  { id: 'liuyao', name: '六爻占卜', icon: '☯️', path: '/pages/liuyao/index' },
  { id: 'qimen', name: '奇门遁甲', icon: '🌀', path: '/pages/qimen/index' },
  { id: 'daliuren', name: '大六壬', icon: '🎲', path: '/pages/daliuren/index' },
  { id: 'hepan', name: '八字合盘', icon: '💕', path: '/pages/hepan/index' },
  { id: 'face', name: '面相分析', icon: '👤', path: '/pages/face/index' },
  { id: 'palm', name: '手相分析', icon: '✋', path: '/pages/palm/index' },
  { id: 'mbti', name: 'MBTI', icon: '🧠', path: '/pages/mbti/index' },
]

export default function Index() {
  const handleModuleClick = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  return (
    <View className='index'>
      <View className='index-header'>
        <Text className='index-title'>易有吉</Text>
        <Text className='index-subtitle'>AI 命理咨询</Text>
      </View>
      <View className='index-grid'>
        {DIVINATION_MODULES.map((module) => (
          <View
            key={module.id}
            className='index-grid-item'
            onClick={() => handleModuleClick(module.path)}
          >
            <Text className='index-grid-icon'>{module.icon}</Text>
            <Text className='index-grid-name'>{module.name}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
