import Taro from '@tarojs/taro'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'

interface LoginResult {
  access_token: string
  user: {
    id: string
    nickname?: string
    avatar_url?: string
    membership?: string
    ai_chat_count?: number
  }
  is_new_user: boolean
}

export async function wechatMiniappLogin(): Promise<LoginResult> {
  const { code } = await Taro.login()

  const res = await Taro.request({
    url: `${API_BASE_URL}/api/auth/wechat-miniapp/login`,
    method: 'POST',
    data: { code },
  })

  if (res.statusCode !== 200 || !res.data?.data?.access_token) {
    throw new Error(res.data?.error?.message || '登录失败')
  }

  const result = res.data.data as LoginResult

  Taro.setStorageSync('access_token', result.access_token)
  Taro.setStorageSync('user', JSON.stringify(result.user))

  return result
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return Taro.getStorageSync('access_token') || null
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  Taro.removeStorageSync('access_token')
  Taro.removeStorageSync('user')
  Taro.reLaunch({ url: '/pages/login/index' })
}

export function isLoggedIn(): boolean {
  try {
    return !!Taro.getStorageSync('access_token')
  } catch {
    return false
  }
}

export function requireLogin(): boolean {
  if (!isLoggedIn()) {
    Taro.navigateTo({ url: '/pages/login/index' })
    return false
  }
  return true
}
