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

type PaymentStatus = 'pending' | 'success' | 'error' | 'loading';

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

  const initializeState = useCallback(() => {
    if (!codeUrl) {
      setErrorMessage('支付服务暂未配置，请联系管理员');
      setStatus('error');
    } else {
      setErrorMessage(null);
      setStatus('pending');
    }
    setPolling(false);
  }, [codeUrl]);

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
            <p className="text-gray-600 mb-6">{errorMessage || '支付服务出现异常，请稍后重试'}</p>
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
        ) : (
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
