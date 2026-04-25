/**
 * 阿里云短信服务工具函数
 *
 * 使用阿里云 SendSms API 发送验证码短信
 * API 文档：https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms
 */

import { createHash, createHmac } from 'crypto';

const ALIYUN_SMS_ENDPOINT = 'https://dysmsapi.aliyuncs.com';

interface SendSmsResult {
    success: boolean;
    bizId?: string;
    message?: string;
    code?: string;
}

/**
 * 生成阿里云短信请求所需的签名
 */
function generateSignature(
    method: string,
    params: Record<string, string>,
    accessKeySecret: string
): string {
    // 按照参数名排序（RFC 3986 规则）
    const sortedParams = Object.entries(params)
        .sort(([keyA], [keyB]) => {
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        })
        .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
        .join('&');

    // 构造待签名字符串
    const stringToSign = `${method}&${percentEncode('/')}&${percentEncode(sortedParams)}`;

    // 使用 HMAC-SHA1 签名
    const signature = createHmac('sha1', `${accessKeySecret}&`)
        .update(stringToSign)
        .digest('base64');

    return signature;
}

/**
 * RFC 3986 URL 编码
 */
function percentEncode(value: string): string {
    return encodeURIComponent(value)
        .replace(/\+/g, '%20')
        .replace(/\*/g, '%2A')
        .replace(/%7E/g, '~');
}

/**
 * 生成唯一随机数
 */
function generateUUID(): string {
    return createHash('md5')
        .update(Date.now().toString() + Math.random().toString())
        .digest('hex');
}

/**
 * 获取 ISO8601 格式时间戳
 */
function getISO8601Timestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * 发送阿里云短信
 */
export async function sendAliyunSms(
    phone: string,
    code: string
): Promise<SendSmsResult> {
    const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
    const signName = process.env.ALIYUN_SMS_SIGN_NAME;
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
    const regionId = process.env.ALIYUN_SMS_REGION_ID || 'cn-hangzhou';

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
        console.error('[SMS] 阿里云短信配置不完整');
        return {
            success: false,
            message: '短信服务配置不完整',
        };
    }

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return {
            success: false,
            message: '手机号格式不正确',
        };
    }

    // 验证验证码
    if (!/^\d{4,6}$/.test(code)) {
        return {
            success: false,
            message: '验证码格式不正确',
        };
    }

    try {
        // 构建请求参数
        const params: Record<string, string> = {
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: generateUUID(),
            Timestamp: getISO8601Timestamp(),
            Format: 'JSON',
            Version: '2017-05-25',
            Action: 'SendSms',
            AccessKeyId: accessKeyId,
            RegionId: regionId,
            PhoneNumbers: phone,
            SignName: signName,
            TemplateCode: templateCode,
            TemplateParam: JSON.stringify({ code }),
        };

        // 生成签名
        const signature = generateSignature('POST', params, accessKeySecret);
        params.Signature = signature;

        // 发送请求
        const searchParams = new URLSearchParams(params);
        const response = await fetch(ALIYUN_SMS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: searchParams.toString(),
        });

        const data = await response.json() as {
            Code?: string;
            Message?: string;
            BizId?: string;
            RequestId?: string;
        };

        console.log('[SMS] 阿里云短信响应:', JSON.stringify({
            Code: data.Code,
            Message: data.Message,
            BizId: data.BizId,
            RequestId: data.RequestId?.slice(-8),
        }));

        if (data.Code === 'OK') {
            return {
                success: true,
                bizId: data.BizId,
            };
        }

        return {
            success: false,
            code: data.Code,
            message: data.Message || '发送失败',
        };
    } catch (error) {
        console.error('[SMS] 阿里云短信发送异常:', error);
        return {
            success: false,
            message: '短信发送失败，请稍后重试',
        };
    }
}

/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
