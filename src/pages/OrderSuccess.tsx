import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../lib/utils';
import { InvoiceModal } from '../components/hosting/InvoiceModal';
import { CheckCircle2, FileText, Download, Mail, ArrowRight, Server, Globe, ShieldCheck, Clock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../services/apiClient';

export const OrderSuccess: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        } else {
          // Check hostingOrders collection as fallback
          const hSnap = await getDoc(doc(db, 'hostingOrders', orderId));
          if (hSnap.exists()) {
            setOrder({ id: hSnap.id, ...hSnap.data() });
          }
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleResendEmail = async () => {
    if (!orderId || !order?.customerEmail) return;
    try {
      setResendingEmail(true);
      const res: any = await apiPost(`/api/orders/${orderId}/send-invoice-email`, {
        recipientEmail: order.customerEmail,
      });
      if (res?.success) {
        toast.success(res.message || 'Invoice sent to your email!');
      } else {
        toast.error(res?.error || 'Failed to dispatch invoice email');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not send invoice email');
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading order confirmation...</p>
      </div>
    );
  }

  const docNumber = order?.documentNumber || `#INV-${orderId?.slice(0, 8).toUpperCase()}`;
  const items = Array.isArray(order?.items) ? order.items : [];
  const isPaid = ['paid', 'verified', 'completed'].includes(String(order?.paymentStatus || '').toLowerCase());

  return (
    <div className="min-h-screen bg-[#070b14] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center backdrop-blur-md">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Order Placed Successfully
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Thank You for Your Order!
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Your invoice <strong className="text-blue-400 font-mono">{docNumber}</strong> has been generated and dispatched to your email.
          </p>

          {/* Email notice badge */}
          {order?.customerEmail && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm text-slate-300">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Invoice sent to: <strong className="text-white">{order.customerEmail}</strong></span>
              <button
                onClick={handleResendEmail}
                disabled={resendingEmail}
                className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline font-semibold disabled:opacity-50"
              >
                {resendingEmail ? 'Sending...' : 'Resend Email'}
              </button>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View &amp; Print Invoice
            </button>

            <button
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF Invoice
            </button>

            <Link
              to="/account/services"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-sm transition-all"
            >
              Client Area / Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Order Details Summary Box */}
        {order && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Order Information</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{docNumber}</p>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {isPaid ? 'Paid' : (order.paymentStatus || 'Pending Payment')}
                </span>
                <p className="text-xs text-slate-400 mt-1 uppercase">Method: {order.paymentMethod || 'Manual'}</p>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ordered Services</p>
              <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden">
                {items.map((item: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      {item.itemType === 'domain' ? (
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                          <Server className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">{item.name || item.domain}</p>
                        <p className="text-xs text-slate-400">
                          {item.itemType === 'domain' ? `${item.termYears || 1} Year Term` : (item.billingCycle || 'Monthly Plan')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-bold text-white">
                      {formatCurrency(Number(item.total || item.price || 0), settings as any)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-base font-extrabold text-white">
              <span>Grand Total</span>
              <span className="text-blue-400 text-xl">
                {formatCurrency(Number(order.total || 0), settings as any)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal for View / Print / PDF */}
      {order && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          order={order}
          isAdmin={false}
        />
      )}
    </div>
  );
};
export default OrderSuccess;
