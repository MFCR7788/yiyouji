import { NextRequest } from 'next/server';
import { getWechatPayConfig, WechatPayClient } from '@/lib/wechat-pay/client';
import { handlePaymentSuccess } from '@/lib/wechat-pay/service';
import type { WechatPayCallbackData, WechatPayTransaction } from '@/lib/wechat-pay/types';

export async function POST(request: NextRequest) {
  try {
    const payConfig = getWechatPayConfig();
    if (!payConfig) {
      console.error('[Payment Callback] Wechat pay not configured');
      return new Response(JSON.stringify({ code: 'FAIL', message: 'Payment not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json() as WechatPayCallbackData;
    console.log('[Payment Callback] Received:', JSON.stringify(body));

    const client = new WechatPayClient(payConfig);
    const decrypted = client.decryptCallback(
      body.resource.ciphertext,
      body.resource.associatedData,
      body.resource.nonce,
    );

    console.log('[Payment Callback] Decrypted:', decrypted);
    const transaction = JSON.parse(decrypted) as WechatPayTransaction;

    if (transaction.trade_state === 'SUCCESS') {
      await handlePaymentSuccess(transaction);
    }

    return new Response(JSON.stringify({ code: 'SUCCESS', message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Payment Callback] Error:', error);
    return new Response(JSON.stringify({ code: 'FAIL', message: 'Error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
