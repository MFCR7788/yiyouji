export function hasNonEmptyStrings(obj: Record<string, unknown>, fields: string[]): boolean {
    return fields.every(field => typeof obj[field] === 'string' && (obj[field] as string).trim() !== '')
}

export function missingFields(obj: Record<string, unknown>, fields: string[]): string[] {
    return fields.filter(field => !obj[field] || (typeof obj[field] === 'string' && (obj[field] as string).trim() === ''))
}

export function missingSearchParams(params: URLSearchParams, fields: string[]): string[] {
    return fields.filter(field => !params.get(field) || params.get(field)!.trim() === '')
}

export function isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
}
