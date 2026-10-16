// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';
import { Layout } from '../../components/Layout';
import { useSettings } from '../../context/SettingsContext';
import { generatePDF } from '../../lib/pdf';
import { formatCurrency } from '../../lib/utils';
import { CheckCircle, Download, ArrowRight, Package, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const OrderSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({ id: docSnap.id, ...data } as Order);
          if (data.paymentStatus === 'submitted' || data.paymentStatus === 'verified') {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim() || !id) return;

    setSubmitting(true);
    try {
      const docRef = doc(db, 'orders', id);
      await updateDoc(docRef, {
        paymentStatus: 'submitted',
        providerStatus: 'pending',
        transactionId: transactionId.trim(),
        paymentMethod: 'manual_bkash',
        paymentSubmittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSubmitted(true);
      toast.success('Transaction ID submitted successfully! Payment is pending verification.');
    } catch (err) {
      console.error("Error submitting transaction:", err);
      toast.error('Failed to submit transaction ID. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBkashNumber = async () => {
    const number = order?.paymentMethod === 'bkash' || order?.paymentMethod === 'manual_bkash' 
      ? (order as any).bkashNumber || '01727666677' 
      : '01727666677';
    if (number) {
      await navigator.clipboard.writeText(number);
      toast.success('bKash number copied.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2b3c]"></div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50 px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h1>
          <p className="text-gray-500 mb-6">We couldn't locate the details for this order.</p>
          <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
        </div>
      </Layout>
    );
  }

  const isManualBkash = order.paymentMethod === 'bkash' || order.paymentMethod === 'manual_bkash';

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header section */}
            <div className="bg-green-50 px-8 py-10 text-center border-b border-green-100">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="text-green-600 w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">Order Received!</h1>
              <p className="text-green-600 mb-6">Thank you, {order.customerName}. Your order has been placed successfully.</p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => generatePDF(order, 'invoice', settings)}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 transition"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download PDF Invoice
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Continue Shopping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Manual bKash Payment Section */}
            {isManualBkash && !(order as any).transactionId && !submitted && (
              <div className="bg-pink-50 border-l-4 border-pink-500 p-6 mx-8 mt-8 rounded-r-lg">
                <h3 className="text-lg font-bold text-pink-900 mb-2">Manual bKash Payment</h3>
                <p className="text-pink-800 mb-4 text-sm">
                  Please send the exact amount to our bKash number, then enter your Transaction ID below.
                </p>
                <div className="bg-white p-4 rounded-lg border border-pink-200 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Send payment to:</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold text-pink-600">{(order as any).bkashNumber || '01727666677'}</p>
                    <button
                      type="button"
                      onClick={copyBkashNumber}
                      className="px-3 py-1.5 text-xs font-medium text-pink-700 bg-pink-100 rounded-md hover:bg-pink-200 transition-colors"
                    >
                      Copy Number
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 mt-3">
                    Amount: <span className="font-bold text-lg">{formatCurrency(order.total, settings)}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Reference: <span className="font-mono font-bold">{order.documentNumber || order.id.slice(0, 8)}</span>
                  </p>
                </div>
                <form onSubmit={handleSubmitTransaction} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID *</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 9B5F6C2E"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !transactionId.trim()}
                    className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Transaction ID
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Payment Submitted / Verified Status */}
            {isManualBkash && (submitted || (order as any).transactionId) && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mx-8 mt-8 rounded-r-lg">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Payment Status</h3>
                <p className="text-blue-800 text-sm">
                  {order.paymentStatus === 'verified' 
                    ? 'Your payment has been verified. Your order is now being processed.'
                    : 'Your order has been received. Our team will verify your bKash payment manually. You will receive a confirmation email after verification.'}
                </p>
                {(order as any).transactionId && (
                  <p className="text-sm text-blue-700 mt-2">
                    Transaction ID: <span className="font-mono font-bold">{(order as any).transactionId}</span>
                  </p>
                )}
                <p className="text-sm text-blue-700 mt-1">
                  Status: <span className="font-medium capitalize">{order.paymentStatus || 'pending'}</span>
                </p>
              </div>
            )}

            {/* Order details */}
            <div className="p-8">
              <div className="flex justify-between items-end mb-6 pb-6 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Order Details</h2>
                  <p className="text-sm text-gray-500">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Order Number</p>
                  <p className="font-mono text-gray-900 font-bold">{order.documentNumber || order.id.toUpperCase().slice(0, 8)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Information</h3>
                  <div className="text-sm text-gray-800 space-y-1">
                    <p className="font-medium">{order.customerName}</p>
                    <p>{order.customerEmail}</p>
                    <p>{order.customerPhone}</p>
                    {(order as any).company && <p>{(order as any).company}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Shipping Address</h3>
                  <div className="text-sm text-gray-800 space-y-1">
                    <p>{order.shippingAddress || 'Digital Delivery'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Order Items
                </h3>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.price * item.quantity, settings)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <th scope="row" colSpan={2} className="px-6 py-3 text-right text-sm font-normal text-gray-500">Subtotal</th>
                        <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(order.items.reduce((s, i) => s + (i.price * i.quantity), 0), settings)}</td>
                      </tr>
                      {(order as any).shippingCost > 0 && (
                        <tr>
                          <th scope="row" colSpan={2} className="px-6 py-3 text-right text-sm font-normal text-gray-500">Shipping</th>
                          <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency((order as any).shippingCost, settings)}</td>
                        </tr>
                      )}
                      <tr>
                        <th scope="row" colSpan={2} className="px-6 py-4 text-right text-base font-bold text-gray-900">Total</th>
                        <td className="px-6 py-4 text-right text-base font-bold text-gray-900">{formatCurrency(order.total, settings)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

