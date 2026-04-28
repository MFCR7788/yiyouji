/**
 * 阿里云短信服务工具函数
 *
 * 使用阿里云 SendSms API 发送验证码短信
 * API 文档：https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms
 */

import { createHash, createHmac } from 'crypto';

const ALIYUN_SMS_ENDPOINT = 'https://dysmsapi.aliyuncs.com';
const REQUEST_TIMEOUT = 15000;

interface SendSmsResult {
    success: boolean;
    bizId?: string;
    message?: string;
    code?: string;
}

const ERROR_CODE_MAP: Record<string, string> = {
    'isv.MISSING_PARAMETERS': '缺少必填参数',
    'isv.INVALID_PARAMETERS': '参数格式不正确',
    'isv.OUT_OF_SERVICE': '服务已欠费，请充值后重试',
    'isv.PRODUCT_UN_SUBSCRIPT': '未开通短信服务',
    'isv.PRODUCT_UNSUBSCRIBE': '未开通短信服务',
    'isv.ACCOUNT_NOT_EXISTS': '账户不存在',
    'isv.ACCOUNT_ABNORMAL': '账户状态异常',
    'isv.SIGNATURE_DOES_NOT_EXIST': '签名不存在',
    'isv.SIGNATURE_INVALID': '签名无效',
    'isv.TEMPLATE_DOES_NOT_EXIST': '模板不存在',
    'isv.TEMPLATE_INVALID': '模板无效或未通过审核',
    'isv.TEMPLATE_PARAMS_ERROR': '模板参数错误',
    'isv.PHONE_NUMBER_ILLEGAL': '手机号格式不正确',
    'isv.MOBILE_NUMBER_COUNT_LIMIT': '手机号数量超限',
    'isv.SMS_LIMIT_CONTROL': '发送频率超限，请稍后重试',
    'isv.BUSINESS_LIMIT_CONTROL': '业务限制，请稍后重试',
    'SignatureDoesNotMatch': '签名验证失败，请检查 AccessKey',
    'InternalError': '系统内部错误，请稍后重试',
    'Throttling.User': '用户请求频率超限',
    'Throttling.System': '系统繁忙，请稍后重试',
    'InvalidTimeStamp.Expired': '时间戳已过期',
    'InvalidTimeStamp.OutOfRange': '时间戳不在有效范围内',
};

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

    console.debug('[SMS] 发送短信请求 - 手机号:', phone, '验证码:', code);

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
        console.error('[SMS] 阿里云短信配置不完整:', {
            accessKeyId: !!accessKeyId,
            accessKeySecret: !!accessKeySecret,
            signName: !!signName,
            templateCode: !!templateCode,
            regionId: !!regionId,
        });
        return {
            success: false,
            message: '短信服务配置不完整',
        };
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
        console.warn('[SMS] 手机号格式不正确:', phone);
        return {
            success: false,
            message: '手机号格式不正确',
        };
    }

    if (!/^\d{4,6}$/.test(code)) {
        console.warn('[SMS] 验证码格式不正确:', code);
        return {
            success: false,
            message: '验证码格式不正确',
        };
    }

    try {
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

        const signature = generateSignature('POST', params, accessKeySecret);
        params.Signature = signature;

        const searchParams = new URLSearchParams(params);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(ALIYUN_SMS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: searchParams.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('[SMS] HTTP 请求失败:', response.status, response.statusText);
            return {
                success: false,
                message: `HTTP错误: ${response.status}`,
            };
        }

        const data = await response.json() as {
            Code?: string;
            Message?: string;
            BizId?: string;
            RequestId?: string;
        };

        console.info('[SMS] 阿里云短信响应:', JSON.stringify({
            Code: data.Code,
            Message: data.Message,
            BizId: data.BizId,
            RequestId: data.RequestId?.slice(-8),
        }));

        if (data.Code === 'OK') {
            console.info('[SMS] 短信发送成功 - 手机号:', phone, 'BizId:', data.BizId);
            return {
                success: true,
                bizId: data.BizId,
            };
        }

        const friendlyMessage = ERROR_CODE_MAP[data.Code || ''] || data.Message || '发送失败';
        console.error('[SMS] 短信发送失败 - 手机号:', phone, '错误码:', data.Code, '错误信息:', friendlyMessage);

        return {
            success: false,
            code: data.Code,
            message: friendlyMessage,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('[SMS] 短信发送超时 - 手机号:', phone);
            return {
                success: false,
                message: '请求超时，请稍后重试',
            };
        }
        console.error('[SMS] 阿里云短信发送异常 - 手机号:', phone, '错误:', error);
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
