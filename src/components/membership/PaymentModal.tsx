'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
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

export function PaymentModal({
  isOpen,
  onClose,
  codeUrl,
  orderId,
  planName,
  price,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [polling, setPolling] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !orderId) {
      return;
    }
    setStatus('pending');
    setPolling(false);
  }, [isOpen, orderId]);

  useEffect(() => {
    if (!isOpen || !orderId || status !== 'pending') {
      return;
    }

    setPolling(true);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/membership/order/${orderId}/status`);
        const data = await res.json();
        if (data.success) {
          const orderStatus = data.data.status;
          if (orderStatus === 'paid') {
            setStatus('success');
            setPolling(false);
            clearInterval(pollInterval);
            showToast('success', '支付成功！');
            onPaymentSuccess?.();
          }
        }
      } catch (e) {
        console.error('[Payment] Poll error:', e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, orderId, status, onPaymentSuccess, showToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
              className="w-full bg-[#1f9d6d] text-white py-3 rounded-lg font-medium hover:bg-[#178a5d]"
            >
              完成
            </button>
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
              <p className="text-gray-600">请联系管理员完成支付</p>
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
