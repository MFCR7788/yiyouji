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
    let privateKey = this.config.privateKey
    
    // 处理多种换行符格式
    // 1. 字面量的 \n (两个字符：反斜杠+n) -> 替换为真正的换行符
    // 2. 真正的换行符 -> 保持不变
    // 3. Windows 的 \r\n -> 转换为 \n
    privateKey = privateKey.replace(/\\n/g, '\n')
    privateKey = privateKey.replace(/\r\n/g, '\n')
    
    console.log('[WechatPay] sign() 私钥格式检查:', {
      originalLength: this.config.privateKey.length,
      processedLength: privateKey.length,
      startsWithPem: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      containsNewlines: privateKey.includes('\n'),
      firstLinePreview: privateKey.split('\n')[0]?.substring(0, 50),
    })
    
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

    console.log('[WechatPay] 创建 Native 支付订单:', {
      url,
      appid: this.config.appid,
      mchid: this.config.mchid,
      outTradeNo: params.outTradeNo,
      amount: params.amount.total,
      hasPrivateKey: !!this.config.privateKey,
      privateKeyLength: this.config.privateKey?.length,
      mchSerialNo: this.config.mchSerialNo,
    })

    const authorization = this.buildAuthorization('POST', '/v3/pay/transactions/native', body)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
          'Accept': 'application/json',
        },
        body,
      })
    } catch (networkError) {
      console.error('[WechatPay] 网络请求失败:', {
        error: networkError instanceof Error ? networkError.message : networkError,
        url,
        message: networkError instanceof Error ? networkError.stack : undefined,
      })
      throw new Error(`微信支付网络连接失败: ${networkError instanceof Error ? networkError.message : '未知网络错误'}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `微信支付API调用失败 (HTTP ${response.status})`

      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.code) {
          errorMessage += ` [${errorJson.code}]: ${errorJson.message || '无详细信息'}`
        }
        if (errorJson.detail) {
          errorMessage += `\n详情: ${errorJson.detail}`
        }
      } catch {
        errorMessage += ` - ${errorText.slice(0, 500)}`
      }

      console.error('[WechatPay] Create native pay failed:', {
        status: response.status,
        errorText: errorText.slice(0, 1000),
        errorMessage,
        config: {
          mchid: this.config.mchid,
          appid: this.config.appid,
          mchSerialNo: this.config.mchSerialNo,
          notifyUrl: this.config.notifyUrl,
        },
      })

      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).statusCode = response.status
      ;(enhancedError as any).wechatPayCode = (() => { try { return JSON.parse(errorText).code } catch { return undefined } })()

      throw enhancedError
    }

    const data = await response.json()
    console.log('[WechatPay] Native 支付订单创建成功:', {
      codeUrl: data.code_url?.slice(0, 50) + '...',
      outTradeNo: params.outTradeNo,
    })

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

  console.log('[WechatPay] getWechatPayConfig() 环境变量检查:', {
    hasMchid: !!mchid,
    hasAppid: !!appid,
    hasApiV3Key: !!apiV3Key,
    hasMchSerialNo: !!mchSerialNo,
    hasPrivateKey: !!privateKey,
    hasNotifyUrl: !!notifyUrl,
    privateKeyLength: privateKey?.length,
    privateKeyPreview: privateKey?.substring(0, 50),
    privateKeyContainsNewlines: privateKey?.includes('\n'),
    privateKeyContainsBackslashN: privateKey?.includes('\\n'),
  })

  if (!mchid || !appid || !apiV3Key || !mchSerialNo || !privateKey || !notifyUrl) {
    console.warn('[WechatPay] getWechatPayConfig() 返回 null - 缺少必要的配置')
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
