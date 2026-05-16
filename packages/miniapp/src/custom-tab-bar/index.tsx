import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo } from 'react'
import './index.scss'

const TAB_LIST = [
  { pagePath: '/pages/index/index', text: '占卜', icon: '🎯' },
  { pagePath: '/pages/chat/index', text: '对话', icon: '💬' },
  { pagePath: '/pages/daily/index', text: '日运', icon: '☀️' },
  { pagePath: '/pages/community/index', text: '社区', icon: '🏘️' },
  { pagePath: '/pages/settings/index', text: '我的', icon: '👤' },
]

export default function CustomTabBar() {
  const selected = useMemo(() => {
    const path = '/' + (Taro.getCurrentInstance().router?.path || '')
    const idx = TAB_LIST.findIndex(tab => path.startsWith(tab.pagePath))
    return idx >= 0 ? idx : 0
  }, [])

  const handleSwitchTab = (index: number, path: string) => {
    if (selected === index) return
    Taro.switchTab({ url: path })
  }

  return (
    <View className='custom-tab-bar'>
      {TAB_LIST.map((tab, index) => (
        <View
          key={tab.pagePath}
          className={`tab-item ${selected === index ? 'tab-item--active' : ''}`}
          onClick={() => handleSwitchTab(index, tab.pagePath)}
        >
          <Text className='tab-icon'>{tab.icon}</Text>
          <Text className='tab-text'>{tab.text}</Text>
        </View>
      ))}
    </View>
  )
}
