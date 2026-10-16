import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import { apiPost } from '../services/apiClient';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      if (!orderId) {
        setError('Invalid payment callback parameters.');
        setLoading(false);
        return;
      }

      try {
        let targetRef = doc(db, 'orders', orderId);
        let docSnap = await getDoc(targetRef);
        
        if (!docSnap.exists()) {
          targetRef = doc(db, 'invoices', orderId);
          docSnap = await getDoc(targetRef);
        }

        if (!docSnap.exists()) {
          throw new Error('Order not found. Please contact support.');
        }

        const orderData = docSnap.data();

        if (status === 'success') {
          const paymentId = orderData?.bkashPaymentId;
          
          if (!paymentId) {
            throw new Error('Payment ID not found for this order. Please contact support.');
          }

          try {
            const result = await apiPost<{ success: boolean; errorMessage?: string }>(
              `/api/orders/${orderId}/payment/execute-bkash`,
              { paymentId, orderId }
            );
            
            if (result.success) {
              clearCart();
              toast.success('পেমেন্ট সফল হয়েছে! আপনার অর্ডার কনফার্ম করা হয়েছে।');
              navigate('/', { replace: true });
            } else {
              throw new Error(result.errorMessage || 'Payment execution failed');
            }
          } catch (err: any) {
            throw new Error(err?.message || 'Payment execution failed');
          }
        } else {
          await updateDoc(targetRef, {
            paymentStatus: 'failed',
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          });
          
          toast.error(`Payment ${status === 'cancelled' ? 'was cancelled' : 'failed'}. Please try again.`);
          navigate(-1);
        }
      } catch (err: any) {
        console.error('Payment callback error:', err);
        setError(err.message || 'An error occurred while verifying your payment.');
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [orderId, status, navigate, clearCart]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">{error}</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg">
          Return Home
        </button>
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
}

