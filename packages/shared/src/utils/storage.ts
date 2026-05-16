export interface StorageAdapter {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
    removeItem(key: string): void
    clear(): void
}

export class WebStorageAdapter implements StorageAdapter {
    getItem(key: string): string | null {
        if (typeof self === 'undefined' || !('localStorage' in self)) return null
        return self.localStorage.getItem(key)
    }
    setItem(key: string, value: string): void {
        if (typeof self === 'undefined' || !('localStorage' in self)) return
        self.localStorage.setItem(key, value)
    }
    removeItem(key: string): void {
        if (typeof self === 'undefined' || !('localStorage' in self)) return
        self.localStorage.removeItem(key)
    }
    clear(): void {
        if (typeof self === 'undefined' || !('localStorage' in self)) return
        self.localStorage.clear()
    }
}

interface WxStorage {
    getStorageSync(key: string): string | undefined
    setStorageSync(key: string, value: string): void
    removeStorageSync(key: string): void
    clearStorageSync(): void
}

declare const wx: WxStorage

export class MiniappStorageAdapter implements StorageAdapter {
    getItem(key: string): string | null {
        try {
            return wx.getStorageSync(key) || null
        } catch {
            return null
        }
    }
    setItem(key: string, value: string): void {
        try {
            wx.setStorageSync(key, value)
        } catch { /* ignore */ }
    }
    removeItem(key: string): void {
        try {
            wx.removeStorageSync(key)
        } catch { /* ignore */ }
    }
    clear(): void {
        try {
            wx.clearStorageSync()
        } catch { /* ignore */ }
    }
}
