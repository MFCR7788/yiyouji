import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { createPaymentOrder } from '@/lib/wechat-pay/service';
import { isWechatPayConfigured } from '@/lib/wechat-pay/client';
import type { PlanId } from '@/lib/user/membership';

interface PurchaseBody {
    planId: string;
}

const VALID_PLAN_IDS: PlanId[] = ['plus', 'plus_6m', 'pro'];

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    return '127.0.0.1';
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status, { success: false });
        }
        const { user } = auth;

        const body = (await request.json()) as PurchaseBody;
        const { planId } = body;

        if (!planId || typeof planId !== 'string') {
            return jsonError('请选择会员套餐', 400, { success: false });
        }

        if (!VALID_PLAN_IDS.includes(planId as PlanId)) {
            return jsonError('无效的套餐类型', 400, { success: false });
        }

        const clientIp = getClientIp(request);

        try {
            const result = await createPaymentOrder(
                user.id,
                planId as PlanId,
                clientIp,
            );

            const planNames: Record<string, string> = {
                plus: 'Plus 会员(3个月)',
                plus_6m: 'Plus 会员(6个月)',
                pro: 'Pro 会员(1年)',
            };

            const paymentConfigured = isWechatPayConfigured();

            return jsonOk({
                success: true,
                data: {
                    orderId: result.orderId,
                    codeUrl: result.codeUrl,
                    plan: {
                        id: planId,
                        name: planNames[planId] || planId,
                        price: result.order.amount,
                        months: result.order.months,
                    },
                    paymentConfigured,
                    message: paymentConfigured
                        ? '订单已创建，请扫码支付'
                        : '订单已创建，请联系管理员完成支付',
                },
            });
        } catch (serviceError) {
            console.error('[membership/purchase] Service error:', {
                error: serviceError instanceof Error ? serviceError.message : serviceError,
                stack: serviceError instanceof Error ? serviceError.stack : undefined,
                cause: (serviceError as any)?.cause,
            });

            const errorMessage = serviceError instanceof Error ? serviceError.message : String(serviceError);
            const isDev = process.env.NODE_ENV === 'development';

            if (errorMessage === 'Invalid plan') {
                return jsonError('套餐配置错误，请稍后重试', 400, { success: false });
            }

            if (errorMessage === 'Create order failed') {
                return jsonError('创建订单失败，请稍后重试', 500, {
                    success: false,
                    code: 'ORDER_CREATE_FAILED',
                    ...(isDev && { debugInfo: errorMessage }),
                });
            }

            if (errorMessage.includes('WechatPay')) {
                let userMessage: string
                let errorCode: string = 'PAYMENT_SERVICE_ERROR'

                if (errorMessage.includes('认证失败') || errorMessage.includes('SIGN_ERROR') || errorMessage.includes('NO_AUTH')) {
                    userMessage = '支付服务配置错误，请联系管理员'
                    errorCode = 'PAYMENT_AUTH_ERROR'
                } else if (errorMessage.includes('网络连接失败') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
                    userMessage = '网络连接异常，请检查网络设置或稍后重试'
                    errorCode = 'PAYMENT_NETWORK_ERROR'
                } else if (errorMessage.includes('代理') || errorMessage.includes('proxy') || errorMessage.includes('PROXY')) {
                    userMessage = '代理服务器连接失败，请检查代理设置或联系管理员'
                    errorCode = 'PAYMENT_PROXY_ERROR'
                } else if (errorMessage.includes('参数错误') || errorMessage.includes('PARAM_ERROR') || errorMessage.includes('INVALID_')) {
                    userMessage = '支付请求参数错误，请联系管理员'
                    errorCode = 'PAYMENT_PARAM_ERROR'
                } else {
                    userMessage = '支付服务暂时不可用，请稍后重试或联系管理员'
                }

                return jsonError(userMessage, 503, {
                    success: false,
                    code: errorCode,
                    ...(isDev && { debugInfo: errorMessage }),
                })
            }

            return jsonError(`订单处理失败：${errorMessage}`, 500, {
                success: false,
                code: 'UNKNOWN_ERROR',
                ...(isDev && { debugInfo: errorMessage }),
            });
        }
    } catch (error) {
        console.error('[membership/purchase] Unexpected error:', error);
        
        if (error instanceof SyntaxError) {
            return jsonError('请求参数格式错误', 400, { success: false });
        }
        
        return jsonError('服务器繁忙，请稍后重试', 500, { success: false });
    }
}
