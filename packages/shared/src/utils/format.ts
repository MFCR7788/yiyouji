export function formatPrice(price: number): string {
    return `¥${price}`
}

export function formatDate(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateTime(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

export function formatCredits(credits: number): string {
    return `${credits} 积分`
}

export function formatPeriod(months: number): string {
    if (months === 0) return '永久'
    if (months < 12) return `${months}个月`
    if (months % 12 === 0) return `${months / 12}年`
    return `${months}个月`
}
