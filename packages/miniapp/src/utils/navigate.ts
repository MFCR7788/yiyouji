import Taro from '@tarojs/taro'

export function navigateTo(page: string, params?: Record<string, string>) {
  const query = params
    ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    : ''
  Taro.navigateTo({ url: `${page}${query}` })
}

export function switchTab(page: string) {
  Taro.switchTab({ url: page })
}

export function goBack() {
  Taro.navigateBack()
}
