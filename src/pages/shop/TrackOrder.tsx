import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Package, Search, Truck, CheckCircle2, Clock, MapPin, Download, AlertCircle, Activity } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../../components/Layout';
import { Player } from '@lottiefiles/react-lottie-player';
import { generatePDF } from '../../lib/pdf';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight } from 'lucide-react';
import { Order } from '../../types';


const DeliverySequence = () => {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setPhase(p => (p + 1) % 4);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const phases = [
    { icon: <div className="text-6xl animate-bounce">🛒</div>, text: "Shopping..." },
    { icon: <div className="text-6xl animate-pulse scale-125">🎉</div>, text: "Order Confirmed!" },
    { icon: <div className="text-6xl animate-[slide_2s_ease-in-out_infinite] flex justify-center"><div className="-scale-x-100">🚚</div></div>, text: "On the way..." },
    { icon: <div className="text-6xl animate-bounce">📦</div>, text: "Delivered!" }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-blue-50/50 rounded-full border-4 border-white shadow-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-white opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center transition-all duration-500 transform scale-110">
        {phases[phase].icon}
        <p className="mt-4 font-bold text-blue-900 bg-white/80 px-3 py-1 rounded-full text-sm shadow-sm">{phases[phase].text}</p>
      </div>
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-40px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function TrackOrder() {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      const fetchRecent = async () => {
        try {
          const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          // Filter active orders and sort
          const active = orders
            .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);
          setRecentOrders(active);
        } catch (err) {}
      };
      fetchRecent();
    }
  }, [user]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setOrderId(id);
      // Auto-submit track request
      const track = async (searchId: string) => {
        setLoading(true);
        try {
          let q = query(collection(db, 'orders'), where('id', '==', searchId));
          let snap = await getDocs(q);

          if (snap.empty) {
            q = query(collection(db, 'orders'), where('invoiceNumber', '==', searchId));
            snap = await getDocs(q);
          }

          if (!snap.empty) {
            setOrder({ id: snap.docs[0].id, ...snap.docs[0].data() } as Order);
          } else {
            setError('Order not found from link.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      track(id);
    }
  }, [searchParams]);

  
  // Dynamic animation based on tracking step
  const getAnimationUrl = () => {
    if (!order) return "https://lottie.host/7905d4b8-2dc3-4a18-80f4-cf3d752f9547/d72sC3Wf7e.json"; // Shopping/Search
    if (step === -1) return "https://lottie.host/c83783a9-e0d0-4ad3-94c5-c2665e771c66/hYQ7Nq6f5i.json"; // Cancelled
    if (step === 0 || step === 1) return "https://lottie.host/66d039f9-bdbe-42af-ae7a-0fcda11cb93d/L0aR9a2PjO.json"; // Processing/Packing
    if (step === 2) return "https://lottie.host/8c06ce1d-720a-4a25-a4db-233bb33396f7/D4T358mPOn.json"; // On the way
    if (step === 3) return "https://lottie.host/b087091f-0e9b-4bd8-9d58-bb1237a28e5c/5YF5lU6mJz.json"; // Delivered
    return "https://lottie.host/8c06ce1d-720a-4a25-a4db-233bb33396f7/D4T358mPOn.json";
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      setError('Please enter your Order ID');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      // Allow searching by actual ID (which users might not know easily) or invoiceNumber
      let q = query(collection(db, 'orders'), where('id', '==', orderId));
      let snap = await getDocs(q);

      if (snap.empty) {
        q = query(collection(db, 'orders'), where('invoiceNumber', '==', orderId));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        setError('Order not found. Please check your Order ID.');
      } else {
        const foundOrder = { id: snap.docs[0].id, ...snap.docs[0].data() } as Order;
        
        // Optional phone verification
        if (phone && foundOrder.customerPhone) {
          const normInput = phone.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
          const normOrder = foundOrder.customerPhone.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
          if (normInput && normOrder && normInput !== normOrder) {
            setError('Phone number does not match this order.');
            setOrder(null);
            return;
          }
        }

        setOrder(foundOrder);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const pdfDoc = await generatePDF(order as any, 'invoice', settings, 'doc');
      pdfDoc.autoPrint();
      window.open(pdfDoc.output('bloburl'), '_blank');
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF invoice.");
    }
  };

  const step = order ? getStatusStep(order.status) : 0;

  return (
    <Layout>
    <div className="bg-gray-50 min-h-screen py-16">
      <Helmet>
        <title>Track Order - {settings.storeName || 'Store'}</title>
      </Helmet>

      <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
        <div className="text-center mb-12">
            <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center animate-in zoom-in duration-700">
              <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
              <DeliverySequence />
            </div>
              
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Track Your Order</h1>
            <p className="text-gray-600 text-lg">Enter your Order ID or Invoice Number to see live updates.</p>
          </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Order ID or Invoice Number"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  required
                />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Phone Number (Optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-colors whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Tracking...' : 'Track Order'}
              </button>
            </form>
            
            {/* Quick Access for Logged In Users */}
            {!order && recentOrders.length > 0 && (
              <div className="mt-8 text-left animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Your Active Orders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {recentOrders.map(ro => (
                    <button 
                      key={ro.id}
                      onClick={() => {
                        setOrderId(ro.invoiceNumber || ro.id);
                        setOrder(ro);
                      }}
                      className="flex flex-col bg-gray-50 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all p-4 rounded-xl text-left group"
                    >
                      <div className="flex justify-between items-start mb-2 w-full">
                        <span className="font-bold text-gray-900 truncate pr-2">#{ro.invoiceNumber || ro.id.slice(0,8)}</span>
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0">{ro.status}</span>
                      </div>
                      <span className="text-xs text-gray-500 mb-3">{new Date(ro.createdAt).toLocaleDateString()}</span>
                      <div className="mt-auto flex items-center justify-between text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform w-full">
                        Track Now <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
                <AlertCircle size={20} /> {error}
              </div>
            )}
          </div>
        </div>

        {order && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.invoiceNumber || order.id.slice(-6)}</h2>
                <p className="text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button 
                onClick={handleDownloadInvoice}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white hover:bg-black rounded-lg font-medium transition-colors"
              >
                <Download size={18} /> Download Invoice
              </button>
            </div>

            {step === -1 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Order Cancelled</h3>
                <p className="text-gray-500 mt-2">This order has been cancelled.</p>
              </div>
            ) : (
              <div className="relative mb-12">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 hidden md:block"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 hidden md:block transition-all duration-1000"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                ></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 md:gap-0">
                  {/* Step 1 */}
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${step >= 1 ? 'bg-blue-500 border-white text-white shadow-md' : 'bg-gray-100 border-white text-gray-400'}`}>
                      <Clock size={24} />
                    </div>
                    <div className="md:text-center">
                      <p className={`font-bold ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>Order Placed</p>
                      <p className="text-xs text-gray-500">We have received your order</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${step >= 2 ? 'bg-blue-500 border-white text-white shadow-md' : 'bg-gray-100 border-white text-gray-400'}`}>
                      <Package size={24} />
                    </div>
                    <div className="md:text-center">
                      <p className={`font-bold ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>Processing</p>
                      <p className="text-xs text-gray-500">Preparing your items</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${step >= 3 ? 'bg-blue-500 border-white text-white shadow-md' : 'bg-gray-100 border-white text-gray-400'}`}>
                      <Truck size={24} />
                    </div>
                    <div className="md:text-center">
                      <p className={`font-bold ${step >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>Shipped</p>
                      <p className="text-xs text-gray-500">On the way to you</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${step >= 4 ? 'bg-green-500 border-white text-white shadow-md' : 'bg-gray-100 border-white text-gray-400'}`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="md:text-center">
                      <p className={`font-bold ${step >= 4 ? 'text-gray-900' : 'text-gray-400'}`}>Delivered</p>
                      <p className="text-xs text-gray-500">Package has arrived</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={20} className="text-[#F97316]" /> Shipping Details</h3>
              <p className="text-gray-700 font-medium">{order.customerName}</p>
              <p className="text-gray-600">{order.shippingAddress}</p>
              <p className="text-gray-600">{order.customerPhone}</p>
              {order.trackingNumber && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Courier: <span className="font-medium text-gray-900">{order.courier || 'Standard'}</span></p>
                  <p className="text-sm text-gray-500">Tracking Number: <span className="font-medium text-gray-900">{order.trackingNumber}</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
