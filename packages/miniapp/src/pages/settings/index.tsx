import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Settings() {
  const user = (() => {
    try {
      return JSON.parse(Taro.getStorageSync('user') || 'null')
    } catch {
      return null
    }
  })()

  const menuItems = [
    { label: '会员中心', path: '/pages/membership/index', icon: '👑' },
    { label: '积分记录', path: '', icon: '💰' },
    { label: '命理记录', path: '', icon: '📋' },
    { label: '功能设置', path: '', icon: '⚙️' },
    { label: '帮助与反馈', path: '', icon: '❓' },
    { label: '关于', path: '', icon: 'ℹ️' },
  ]

  const handleMenuClick = (path: string, label: string) => {
    if (!path) {
      Taro.showToast({ title: `${label}开发中`, icon: 'none' })
      return
    }
    Taro.navigateTo({ url: path })
  }

  return (
    <View className='settings'>
      <View className='settings-profile'>
        <View className='settings-avatar'>
          <Text className='settings-avatar-text'>
            {user?.nickname?.[0] || '吉'}
          </Text>
        </View>
        <View className='settings-info'>
          <Text className='settings-nickname'>{user?.nickname || '未登录'}</Text>
          <Text className='settings-membership'>
            {user?.membership === 'pro' ? 'Pro 会员' : user?.membership === 'plus' ? 'Plus 会员' : '免费用户'}
          </Text>
        </View>
      </View>
      <View className='settings-menu'>
        {menuItems.map((item) => (
          <View
            key={item.label}
            className='settings-menu-item'
            onClick={() => handleMenuClick(item.path, item.label)}
          >
            <Text className='settings-menu-icon'>{item.icon}</Text>
            <Text className='settings-menu-label'>{item.label}</Text>
            <Text className='settings-menu-arrow'>›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
