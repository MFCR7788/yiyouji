'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeUrl?: string;
  orderId: string;
  planName: string;
  price: number;
  paymentConfigured?: boolean;
  onPaymentSuccess?: () => void;
}

type PaymentStatus = 'pending' | 'success' | 'error' | 'loading' | 'manual-confirm';

export function PaymentModal({
  isOpen,
  onClose,
  codeUrl,
  orderId,
  planName,
  price,
  paymentConfigured = true,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [polling, setPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initializeState = useCallback(() => {
    if (codeUrl) {
      // 有动态二维码（微信支付API已配置）
      setErrorMessage(null);
      setStatus('pending');
    } else if (!paymentConfigured) {
      // 无动态二维码且未配置支付 → 使用静态收款码或手动确认模式
      setErrorMessage(null);
      setStatus('manual-confirm');
    } else {
      // 其他错误情况
      setErrorMessage('支付服务暂时不可用，请稍后重试');
      setStatus('error');
    }
    setPolling(false);
  }, [codeUrl, paymentConfigured]);

  useEffect(() => {
    if (!isOpen || !orderId) {
      return;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    initializeState();
  }, [isOpen, orderId, initializeState]);

  useEffect(() => {
    if (!isOpen || !orderId || status !== 'pending') {
      return;
    }

    setPolling(true);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/membership/order/${orderId}/status`);
        const data = await res.json();

        if (data.success) {
          const orderStatus = data.data.status;
          if (orderStatus === 'paid') {
            setStatus('success');
            setPolling(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            showToast('success', '支付成功！');
            onPaymentSuccess?.();
          }
        } else {
          console.warn('[Payment] Poll returned error:', data.error);
        }
      } catch (e) {
        console.error('[Payment] Poll error:', e);
      }
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, orderId, status, onPaymentSuccess, showToast]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const handleManualConfirm = async () => {
    try {
      const res = await fetch(`/api/membership/order/${orderId}/confirm`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success && data.data.confirmed) {
        setStatus('success');
        showToast('success', '支付确认成功！');
        onPaymentSuccess?.();
      } else {
        showToast('error', data.error || '确认失败，请联系管理员');
      }
    } catch (e) {
      console.error('[Payment] Manual confirm error:', e);
      showToast('error', '网络错误，请稍后重试');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="关闭"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付成功</h3>
            <p className="text-gray-600 mb-6">您已成功开通 {planName}</p>
            <button
              onClick={onClose}
              className="w-full bg-[#1f9d6d] text-white py-3 rounded-lg font-medium hover:bg-[#178a5d] transition-colors"
            >
              完成
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付暂时不可用</h3>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={onClose}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
          </div>
        ) : status === 'loading' ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-[#1f9d6d] mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">正在准备支付...</h3>
            <p className="text-gray-500 text-sm">请稍候，正在创建订单</p>
          </div>
        ) : status === 'manual-confirm' ? (
          /* 手动支付/静态收款码模式 */
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">扫码付款</h3>
            <p className="text-gray-600 mb-4">
              开通 {planName}
            </p>

            <div className="text-3xl font-bold text-[#1f9d6d] mb-6">
              ¥{price.toFixed(2)}
            </div>

            {/* 静态收款码区域 */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 border-2 border-[#1f9d6d] rounded-xl shadow-lg">
                <StaticQRCode size={220} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-700 leading-relaxed">
                请使用<strong>微信</strong>或<strong>支付宝</strong>扫描上方二维码完成付款。
                付款完成后，请点击下方按钮确认。
              </p>
            </div>

            {/* 确认按钮 */}
            <button
              onClick={handleManualConfirm}
              className="w-full bg-[#1f9d6d] text-white py-3 rounded-lg font-medium hover:bg-[#178a5d] transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <CreditCard className="w-5 h-5" />
              我已完成付款
            </button>

            <button
              onClick={() => {
                showToast('info', `订单号：${orderId}\n您可以稍后在"我的订单"中查看`);
                onClose();
              }}
              className="w-full text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
            >
              稍后支付
            </button>
          </div>
        ) : (
          /* 自动轮询模式（微信支付API） */
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">请扫码支付</h3>
            <p className="text-gray-600 mb-6">
              开通 {planName}
            </p>

            <div className="text-3xl font-bold text-[#1f9d6d] mb-6">
              ¥{price.toFixed(2)}
            </div>

            {codeUrl ? (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 border rounded-lg shadow-sm">
                  <QRCode value={codeUrl} size={200} />
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <p className="text-gray-600">二维码生成失败，请联系管理员</p>
              </div>
            )}

            {polling && (
              <div className="flex items-center justify-center text-gray-500 mb-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">等待支付...</span>
              </div>
            )}

            <p className="text-sm text-gray-400">
              使用微信扫描上方二维码完成支付
            </p>

            <button
              onClick={() => {
                showToast('info', '订单已创建，您可以稍后在我的订单中查看');
                onClose();
              }}
              className="mt-4 w-full text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
            >
              稍后支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QRCode({ value, size }: { value: string; size: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`}
      alt="微信支付二维码"
      className="rounded"
      width={size}
      height={size}
    />
  );
}

function StaticQRCode({ size }: { size: number }) {
  /*
   * 静态收款码组件
   *
   * 使用说明：
   * 1. 将你的微信/支付宝收款码图片放到 public/images/payment-qr.png（或 .svg）
   * 2. 或者在环境变量 NEXT_PUBLIC_PAYMENT_QR_URL 中设置图片URL
   * 3. 如果都没有配置，会显示占位符提示
   */

  const qrImageUrl = process.env.NEXT_PUBLIC_PAYMENT_QR_URL || '/images/payment-qr.svg';

  return (
    <img
      src={qrImageUrl}
      alt="收款二维码"
      className="rounded"
      width={size}
      height={size}
      onError={(e) => {
        // 图片加载失败时显示占位符
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('.qr-placeholder')) {
          const placeholder = document.createElement('div');
          placeholder.className = 'qr-placeholder flex flex-col items-center justify-center bg-gray-100 rounded';
          placeholder.style.width = `${size}px`;
          placeholder.style.height = `${size}px`;
          placeholder.innerHTML = `
            <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
            </svg>
            <span class="text-xs text-gray-500">暂无收款码</span>
            <span class="text-xs text-gray-400 mt-1">请联系管理员配置</span>
          `;
          parent.appendChild(placeholder);
        }
      }}
    />
  );
}