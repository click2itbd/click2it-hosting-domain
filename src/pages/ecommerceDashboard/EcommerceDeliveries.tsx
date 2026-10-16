import React, { useState, useEffect } from 'react';
import { Truck, Search, RefreshCw, CheckCircle, XCircle, AlertCircle, Calendar, RefreshCcw, Package, ShieldAlert, AlertTriangle, CheckCircle2, Key, X, ExternalLink } from 'lucide-react';
import { fetchCourierRisk, CourierRiskReport } from '../../utils/courierRisk';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';

export const EcommerceDeliveries = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<Record<string, any>>({});
  const [loadingTracking, setLoadingTracking] = useState<Record<string, boolean>>({});
  const { settings, updateSettings } = useSettings();

  const [fraudPhoneInput, setFraudPhoneInput] = useState('');
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudReport, setFraudReport] = useState<CourierRiskReport | null>(null);
  const [fraudError, setFraudError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(settings?.steadfastApiKey || '');
  const [tempSecretKey, setTempSecretKey] = useState(settings?.steadfastSecretKey || '');
  const [savingKeys, setSavingKeys] = useState(false);

  useEffect(() => {
    // Listen to latest orders and filter those with tracking numbers in memory (prevents Firestore index errors)
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(250)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .filter(o => Boolean(o.trackingNumber && typeof o.trackingNumber === 'string' && o.trackingNumber.trim() !== ''));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to delivery orders:", error);
      // Fallback in case of index constraint
      getDocs(query(collection(db, 'orders'), limit(150))).then(snap => {
        const fallbackOrders = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .filter(o => Boolean(o.trackingNumber && typeof o.trackingNumber === 'string' && o.trackingNumber.trim() !== ''));
        fallbackOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setOrders(fallbackOrders);
        setLoading(false);
      }).catch(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  const checkStatus = async (trackingCode: string, orderId: string) => {
    if (!trackingCode) return;
    if (!settings?.steadfastApiKey || !settings?.steadfastSecretKey) {
      toast.error('Steadfast API Key কনফিগার করা নেই। Settings > Courier এ গিয়ে সেট করুন।');
      return;
    }
    
    setLoadingTracking(prev => ({ ...prev, [orderId]: true }));
    try {
      const baseUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://click2itbd.com';
      const res = await fetch(`${baseUrl}/steadfast.php?action=status&tracking_code=${encodeURIComponent(trackingCode)}`, {
        headers: {
          'Api-Key': settings.steadfastApiKey,
          'Secret-Key': settings.steadfastSecretKey
        }
      });
      const data = await res.json();
      
      if (data.status === 200) {
        setTrackingData(prev => ({ 
          ...prev, 
          [orderId]: data.delivery_status || (data.consignment && data.consignment.status) || "Unknown" 
        }));
        toast.success(`Tracking updated for ${trackingCode}`);
      } else {
        toast.error(data.message || 'Failed to fetch status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network Error');
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': 
      case 'returned': return 'bg-red-100 text-red-700 border-red-200';
      case 'in_transit': 
      case 'dispatched': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Stats calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const calculateStats = () => {
    let todayCount = 0;
    let monthCount = 0;
    let cancelledCount = 0;
    let returnedCount = 0;

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt || 0);
      if (orderDate >= today) todayCount++;
      if (orderDate >= thisMonth) monthCount++;
      
      // We check our local order status, or if we had real-time API we would use trackingData
      if (order.status === 'cancelled') cancelledCount++;
      if (order.status === 'returned') returnedCount++;
    });

    return { todayCount, monthCount, cancelledCount, returnedCount };
  };

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempApiKey.trim() || !tempSecretKey.trim()) {
      toast.error('API Key এবং Secret Key দুটিই আবশ্যক');
      return;
    }
    setSavingKeys(true);
    try {
      await updateSettings({
        ...settings,
        steadfastApiKey: tempApiKey.trim(),
        steadfastSecretKey: tempSecretKey.trim()
      });
      toast.success('Steadfast API Key সফলভাবে সেভ হয়েছে!');
      setShowApiKeyModal(false);
      setFraudError(null);
    } catch (err: any) {
      toast.error(err.message || 'API Key সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleCheckFraud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fraudPhoneInput.trim()) {
      toast.error('ফোন নম্বর লিখুন');
      return;
    }
    setFraudLoading(true);
    setFraudError(null);
    setFraudReport(null);
    try {
      const report = await fetchCourierRisk(fraudPhoneInput, settings?.steadfastApiKey, settings?.steadfastSecretKey);
      setFraudReport(report);
      toast.success('কুরিয়ার রেকর্ড সফলভাবে যাচাই করা হয়েছে');
    } catch (err: any) {
      setFraudError(err.message || 'যাচাই করতে সমস্যা হয়েছে');
      toast.error(err.message || 'যাচাই করতে সমস্যা হয়েছে');
    } finally {
      setFraudLoading(false);
    }
  };

  const stats = calculateStats();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Tracker</h1>
          <p className="text-gray-500">Track all your courier shipments via API in real-time</p>
        </div>
      </div>

      {/* Fraud Prevention & Courier Risk Lookup Card */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 mb-8 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="text-indigo-600" size={20} />
                কাস্টমার কুরিয়ার রিস্ক ও ফ্রড চেকার (Steadfast Courier)
              </h2>
              {settings?.steadfastApiKey ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  API Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  API Missing
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              যেকোনো কাস্টমারের ১১ ডিজিটের মোবাইল নম্বর লিখে তার পূর্ববর্তী পার্সেল ডেলিভারি ও রিটার্ন রেকর্ড যাচাই করুন।
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTempApiKey(settings?.steadfastApiKey || '');
                setTempSecretKey(settings?.steadfastSecretKey || '');
                setShowApiKeyModal(true);
              }}
              className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Steadfast API Key & Secret Key সেট করুন"
            >
              <Key size={14} className="text-indigo-600" />
              <span>{settings?.steadfastApiKey ? 'API কী পরিবর্তন' : 'API কী সেট করুন'}</span>
            </button>
            <form onSubmit={handleCheckFraud} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="017XXXXXXXX"
                value={fraudPhoneInput}
                onChange={(e) => setFraudPhoneInput(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-56 font-mono"
              />
              <button
                type="submit"
                disabled={fraudLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                {fraudLoading ? <RefreshCw className="animate-spin" size={15} /> : <Search size={15} />}
                {fraudLoading ? 'যাচাই হচ্ছে...' : 'চেক করুন'}
              </button>
            </form>
          </div>
        </div>

        {/* API Key Missing Alert */}
        {!settings?.steadfastApiKey && (
          <div className="mb-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-start sm:items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Steadfast API Key সেট করা হয়নি:</strong> লাইভ কুরিয়ার হিস্ট্রি পেতে আপনার Steadfast একাউন্টের API Key ও Secret Key যুক্ত করতে হবে।
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempApiKey(settings?.steadfastApiKey || '');
                setTempSecretKey(settings?.steadfastSecretKey || '');
                setShowApiKeyModal(true);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors w-fit shadow-xs"
            >
              এখনই সেট করুন
            </button>
          </div>
        )}

        {/* Error Message */}
        {fraudError && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm text-rose-900 mb-1">কুরিয়ার তথ্য পাওয়া যায়নি</p>
              <p className="leading-relaxed">{fraudError}</p>
            </div>
            {!settings?.steadfastApiKey && (
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="px-3 py-1 bg-rose-600 text-white rounded font-bold text-xs hover:bg-rose-700 transition-colors shrink-0"
              >
                API Key দিন
              </button>
            )}
          </div>
        )}

        {fraudReport && (
          <div className="mt-4 pt-4 border-t border-indigo-100 space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-xs">
                <p className="text-xs text-gray-500 font-medium">মোট পার্সেল</p>
                <p className="text-xl font-black text-gray-900 mt-1">{fraudReport.total_parcels}</p>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-center shadow-xs">
                <p className="text-xs text-emerald-700 font-medium">ডেলিভারড পার্সেল</p>
                <p className="text-xl font-black text-emerald-600 mt-1">{fraudReport.total_delivered}</p>
              </div>
              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 text-center shadow-xs">
                <p className="text-xs text-rose-700 font-medium">ক্যান্সেলড / রিটার্ন</p>
                <p className="text-xl font-black text-rose-600 mt-1">{fraudReport.total_cancelled}</p>
              </div>
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 text-center shadow-xs">
                <p className="text-xs text-indigo-700 font-medium">ডেলিভারি সাকসেস রেট</p>
                <p className="text-xl font-black text-indigo-600 mt-1">{fraudReport.success_rate}%</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${fraudReport.risk_badge_color} flex items-start gap-3`}>
              <div className="mt-0.5 shrink-0">
                {fraudReport.risk_level === 'safe' ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={20} className="text-rose-600" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{fraudReport.risk_title}</p>
                <p className="text-xs leading-relaxed opacity-95">{fraudReport.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Dispatched Today</p>
            <p className="text-2xl font-black text-gray-900">{stats.todayCount}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Dispatched This Month</p>
            <p className="text-2xl font-black text-gray-900">{stats.monthCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cancelled Orders</p>
            <p className="text-2xl font-black text-gray-900">{stats.cancelledCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-lg">
            <RefreshCcw size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Returned Orders</p>
            <p className="text-2xl font-black text-gray-900">{stats.returnedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Courier</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tracking #</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Courier Status</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading deliveries...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No shipments found with tracking numbers.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-900">#{order.documentNumber || order.id.slice(0, 8).toUpperCase()}</span>
                      <div className="text-xs text-gray-500 mt-1">{format(new Date(order.createdAt || 0), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{String(order.customerName || order.shippingInfo?.fullName || 'Customer')}</div>
                      <div className="text-sm text-gray-500">{String(order.customerPhone || order.shippingInfo?.phone || '')}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        <Package size={14} />
                        {order.courier || (order as any).courierName || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                        {order.trackingNumber}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {trackingData[order.id] ? (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(trackingData[order.id])}`}>
                          {trackingData[order.id]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not checked yet</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => checkStatus(order.trackingNumber || '', order.id)}
                        disabled={loadingTracking[order.id]}
                        className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={loadingTracking[order.id] ? "animate-spin" : ""} />
                        {loadingTracking[order.id] ? 'Checking...' : 'Check Status'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Quick API Key Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowApiKeyModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-300">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Steadfast API Credentials</h3>
                  <p className="text-[11px] text-indigo-200">কুরিয়ার ট্র্যাকিং ও ফ্রড চেকার সেটআপ</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveApiKeys} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                Steadfast মার্চেন্ট পোর্টালে (steadfast.com.bd) লগইন করে <strong>Settings &gt; API</strong> থেকে আপনার Api-Key ও Secret-Key দুটি কপি করে এখানে দিন।
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Api-Key
                </label>
                <input
                  type="text"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste your Steadfast Api-Key"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Secret-Key
                </label>
                <input
                  type="password"
                  value={tempSecretKey}
                  onChange={(e) => setTempSecretKey(e.target.value)}
                  placeholder="Paste your Steadfast Secret-Key"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingKeys}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                >
                  {savingKeys ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
