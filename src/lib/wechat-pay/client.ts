import crypto from 'crypto'
import type {
  WechatPayConfig,
  CreateNativePayRequest,
  CreateNativePayResponse,
  WechatPayTransaction,
} from './types'

function generateNonceStr(): string {
  return crypto.randomBytes(16).toString('hex')
}

function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString()
}

export class WechatPayClient {
  private config: WechatPayConfig
  private baseUrl: string = 'https://api.mch.weixin.qq.com'

  constructor(config: WechatPayConfig) {
    this.config = config
  }

  private buildAuthorization(method: string, url: string, body: string = ''): string {
    const nonceStr = generateNonceStr()
    const timestamp = getTimestamp()

    const urlPath = new URL(url, this.baseUrl).pathname + new URL(url, this.baseUrl).search

    const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`

    const signature = this.sign(message)

    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.config.mchSerialNo}",signature="${signature}"`
  }

  private sign(message: string): string {
    const privateKey = this.config.privateKey.replace(/\\n/g, '\n')
    const sign = crypto.createSign('SHA256')
    sign.update(message)
    sign.end()
    return sign.sign(privateKey, 'base64')
  }

  async createNativePay(params: CreateNativePayRequest): Promise<CreateNativePayResponse> {
    const url = `${this.baseUrl}/v3/pay/transactions/native`
    const body = JSON.stringify({
      appid: this.config.appid,
      mchid: this.config.mchid,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: {
        total: params.amount.total,
        currency: params.amount.currency || 'CNY',
      },
      scene_info: params.sceneInfo
        ? {
            payer_client_ip: params.sceneInfo.payerClientIp,
          }
        : undefined,
    })

    const authorization = this.buildAuthorization('POST', '/v3/pay/transactions/native', body)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'Accept': 'application/json',
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WechatPay] Create native pay failed:', response.status, errorText)
      throw new Error(`WechatPay request failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      codeUrl: data.code_url,
    }
  }

  async queryOrder(outTradeNo: string): Promise<WechatPayTransaction> {
    const url = `${this.baseUrl}/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.mchid}`
    const authorization = this.buildAuthorization('GET', `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.mchid}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WechatPay] Query order failed:', response.status, errorText)
      throw new Error(`WechatPay request failed: ${response.status}`)
    }

    return await response.json()
  }

  decryptCallback(ciphertext: string, associatedData: string, nonce: string): string {
    const key = Buffer.from(this.config.apiV3Key, 'utf8')

    const nonceBuffer = Buffer.from(nonce, 'utf8')
    const associatedDataBuffer = Buffer.from(associatedData || '', 'utf8')
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64')

    const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16)
    const encryptedData = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceBuffer)
    decipher.setAAD(associatedDataBuffer)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  }
}

export function getWechatPayConfig(): WechatPayConfig | null {
  const mchid = process.env.WECHAT_PAY_MCHID
  const appid = process.env.WECHAT_PAY_APPID
  const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY
  const mchSerialNo = process.env.WECHAT_PAY_MCH_SERIAL_NO
  const privateKey = process.env.WECHAT_PAY_PRIVATE_KEY
  const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL
  const h5Domain = process.env.WECHAT_PAY_H5_DOMAIN

  if (!mchid || !appid || !apiV3Key || !mchSerialNo || !privateKey || !notifyUrl) {
    return null
  }

  return {
    mchid,
    appid,
    apiV3Key,
    mchSerialNo,
    privateKey,
    notifyUrl,
    h5Domain,
  }
}

export function isWechatPayConfigured(): boolean {
  return getWechatPayConfig() !== null
}
