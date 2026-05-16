import Taro from '@tarojs/taro'

export function getSystemInfo() {
  return Taro.getSystemInfoSync()
}

export function isIPhoneX(): boolean {
  const info = getSystemInfo()
  return /iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15|iPhone 16/i.test(info.model || '')
}

export function getStatusBarHeight(): number {
  const info = getSystemInfo()
  return info.statusBarHeight || 0
}
