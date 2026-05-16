import Taro from '@tarojs/taro'

export function getStorage<T = unknown>(key: string, defaultValue: T): T {
  try {
    const value = Taro.getStorageSync(key)
    return value ? JSON.parse(value) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setStorage(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

export function removeStorage(key: string): void {
  try {
    Taro.removeStorageSync(key)
  } catch { /* ignore */ }
}
