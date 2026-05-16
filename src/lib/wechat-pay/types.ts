export interface WechatPayConfig {
  mchid: string
  appid: string
  apiV3Key: string
  mchSerialNo: string
  privateKey: string
  notifyUrl: string
  h5Domain?: string
}

export interface CreateNativePayRequest {
  description: string
  outTradeNo: string
  notifyUrl: string
  amount: {
    total: number
    currency?: string
  }
  sceneInfo?: {
    payerClientIp: string
  }
}

export interface CreateNativePayResponse {
  codeUrl: string
}

export interface CreateJSAPIPayRequest {
  description: string
  outTradeNo: string
  notifyUrl: string
  openid: string
  amount: {
    total: number
    currency?: string
  }
}

export interface CreateJSAPIPayResponse {
  prepayId: string
}

export interface WechatPayCallbackResource {
  algorithm: string
  ciphertext: string
  associatedData: string
  nonce: string
}

export interface WechatPayCallbackData {
  id: string
  create_time: string
  resource_type: string
  event_type: string
  resource: WechatPayCallbackResource
  summary: string
}

export interface WechatPayTransaction {
  mchid: string
  appid: string
  out_trade_no: string
  transaction_id: string
  trade_type: string
  trade_state: string
  trade_state_desc: string
  bank_type: string
  attach: string
  success_time: string
  payer: {
    openid: string
  }
  amount: {
    total: number
    payer_total: number
    currency: string
    payer_currency: string
  }
}

export interface QueryOrderResponse {
  transaction: WechatPayTransaction
}

export interface MembershipOrder {
  id: string
  user_id: string
  plan_id: string
  amount: number
  months: number
  status: 'pending' | 'paid' | 'cancelled' | 'failed'
  out_trade_no?: string
  transaction_id?: string
  paid_at?: Date
  created_at: Date
  updated_at: Date
}
