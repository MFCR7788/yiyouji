export type PaymentChannel = 'native' | 'jsapi' | 'h5'

export interface PaymentOrder {
    orderId: string
    planId: string
    amount: number
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    channel: PaymentChannel
    createdAt: string
}

export interface JSAPIPaymentParams {
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
}
