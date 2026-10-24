import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { apiPost } from '../services/apiClient';

/**
 * Landing page after the customer returns from the EPS payment page.
 * The URL result is only a hint; the real status is always verified server-side.
 */
export default function PaymentEpsReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const orderId = searchParams.get('orderId');
  const result = searchParams.get('result');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      if (!orderId) {
        setError('Invalid payment return. Order ID missing.');
        setLoading(false);
        return;
      }
      const attempts = result === 'success' ? 5 : 1;
      try {
        for (let i = 0; i < attempts; i++) {
          const r = await apiPost<{ success: boolean; paid?: boolean; status?: string; error?: string }>(
            '/api/payments/eps/verify',
            { orderId }
          );
          if (r.paid) {
            clearCart();
            toast.success('Payment successful! Your order is being processed.');
            navigate(`/order-success/${orderId}`, { replace: true });
            return;
          }
          if (i < attempts - 1) await new Promise((res) => setTimeout(res, 3000));
        }
        setError(
          result === 'success'
            ? 'We could not confirm your payment yet. If money was deducted, it will be confirmed shortly or please contact support with your order ID.'
            : `Payment was ${result || 'not completed'}. You can retry from your dashboard.`
        );
      } catch (e: any) {
        setError(e?.message || 'Unable to verify payment status. Please contact support if the amount was deducted.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId, result, clearCart, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {loading ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900">Verifying your payment…</h1>
            <p className="text-sm text-gray-500 mt-1">Please do not close this page.</p>
          </>
        ) : (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900">Payment not confirmed</h1>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <div className="mt-6 flex gap-3 justify-center">
              {orderId && (
                <button onClick={() => navigate(`/order-success/${orderId}`)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                  View Order
                </button>
              )}
              <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700">
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
