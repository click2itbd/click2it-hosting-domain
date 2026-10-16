import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle, CheckCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import { apiPost, apiGet } from '../services/apiClient';

export const PaymentReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const status = searchParams.get('status');
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const processReturn = async () => {
      if (!orderId) {
        setError('Invalid payment return. Order ID missing.');
        setLoading(false);
        return;
      }

      try {
        if (status === 'success' && paymentId) {
          const result = await apiPost<{ success: boolean; errorMessage?: string }>(
            `/api/orders/${orderId}/payment/execute-bkash`,
            { paymentId, orderId }
          );
          
          if (result.success) {
            clearCart();
            toast.success('Payment successful! Your order has been confirmed.');
            navigate(`/order-success/${orderId}`, { replace: true });
          } else {
            throw new Error(result.errorMessage || 'Payment execution failed');
          }
        } else if (status === 'cancelled' || status === 'failed') {
          await updateDoc(doc(db, 'orders', orderId), {
            paymentStatus: 'failed',
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          });
          
          toast.error(`Payment was ${status}. Please try again.`);
          navigate(`/order-success/${orderId}`, { replace: true });
        } else {
          if (paymentId) {
            const result = await apiGet<{ status?: string }>(`/api/orders/${orderId}/payment/query-bkash?paymentId=${encodeURIComponent(paymentId)}`);
            
            if (result.status === 'Completed' || result.status === 'success') {
              clearCart();
              toast.success('Payment successful! Your order has been confirmed.');
              navigate(`/order-success/${orderId}`, { replace: true });
              return;
            }
          }
          
          setError('Unable to verify payment status. Please contact support if amount was deducted.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Payment return error:', err);
        setError(err.message || 'An error occurred while processing your payment.');
        setLoading(false);
      }
    };

    processReturn();
  }, [orderId, status, paymentId, navigate, clearCart]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg">
            Return Home
          </button>
          <button onClick={() => navigate('/hosting/checkout')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #020b2e 0%, #050f3a 55%, #0b1a5c 100%)' }}>
      <div className="bg-white/10 backdrop-blur p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-white/10">
        <Loader2 className="w-14 h-14 text-blue-400 animate-spin mx-auto mb-5" />
        <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment</h2>
        <p className="text-blue-200 text-sm">Please wait while we confirm your transaction securely...</p>
        <div className="mt-6 flex justify-center gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;
