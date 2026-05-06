'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeUrl?: string;
  orderId: string;
  planName: string;
  price: number;
  onPaymentSuccess?: () => void;
}

type PaymentStatus = 'pending' | 'success' | 'error' | 'loading' | 'expired';

export function PaymentModal({
  isOpen,
  onClose,
  codeUrl,
  orderId,
  planName,
  price,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [polling, setPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  const initializeState = useCallback(() => {
    if (codeUrl) {
      setErrorMessage(null);
      setStatus('pending');
    } else {
      setErrorMessage('二维码生成失败，请稍后重试');
      setStatus('error');
    }
    pollCountRef.current = 0;
  }, [codeUrl]);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setTimeout(() => {
      setPolling(false);
      initializeState();
    }, 0);
  }, [isOpen, orderId, initializeState]);

  useEffect(() => {
    if (!isOpen || !orderId || status !== 'pending') return;

    setTimeout(() => {
      setPolling(true);
    }, 0);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollCountRef.current += 1;

        if (pollCountRef.current > 150) {
          setStatus('expired');
          setPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

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
          } else if (orderStatus === 'closed' || orderStatus === 'cancelled') {
            setStatus('expired');
            setPolling(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
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

  const handleRetry = () => {
    setStatus('loading');
    onClose();
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
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付失败</h3>
            <p className="text-gray-600 mb-4">{errorMessage || '支付服务暂时不可用，请稍后重试或联系管理员'}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-red-700 leading-relaxed">
                可能的原因：
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1 list-disc list-inside">
                <li>网络连接不稳定</li>
                <li>代理服务器未运行（如使用了代理）</li>
                <li>支付服务配置问题</li>
                <li>微信支付服务暂时维护</li>
              </ul>
            </div>
            <button
              onClick={handleRetry}
              className="w-full bg-[#1f9d6d] text-white py-3 rounded-lg font-medium hover:bg-[#178a5d] transition-colors mb-3"
            >
              重新购买
            </button>
            <button
              onClick={onClose}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              返回
            </button>
          </div>
        ) : status === 'expired' ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">订单已过期</h3>
            <p className="text-gray-600 mb-6">支付超时，订单已自动关闭，请重新发起购买</p>
            <button
              onClick={handleRetry}
              className="w-full bg-[#1f9d6d] text-white py-3 rounded-lg font-medium hover:bg-[#178a5d] transition-colors mb-3"
            >
              重新购买
            </button>
            <button
              onClick={onClose}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              返回
            </button>
          </div>
        ) : status === 'loading' ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-[#1f9d6d] mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">正在准备支付...</h3>
            <p className="text-gray-500 text-sm">请稍候，正在生成微信支付二维码</p>
          </div>
        ) : (
          /* pending - 微信支付二维码模式 */
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">微信扫码支付</h3>
            <p className="text-gray-600 mb-4">
              开通 {planName}
            </p>

            <div className="text-3xl font-bold text-[#1f9d6d] mb-6">
              ¥{price.toFixed(2)}
            </div>

            {codeUrl ? (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 border-2 border-[#07C160] rounded-xl shadow-md">
                  <QRCode value={codeUrl} size={220} />
                </div>
              </div>
            ) : null}

            {polling && (
              <div className="flex items-center justify-center text-[#07C160] mb-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm font-medium">等待微信支付...</span>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-green-700 leading-relaxed">
                请使用<strong>微信扫一扫</strong>扫描上方二维码完成付款。
                支付成功后页面将自动跳转。
              </p>
            </div>

            <p className="text-xs text-gray-400">
              订单号：{orderId.slice(0, 8)}...
            </p>
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