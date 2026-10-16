import React, { useState, useEffect } from 'react';
import { Bell, Trash2, ExternalLink, Loader2, Tag, ArrowDownRight, AlertCircle, RefreshCw } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const PriceAlertsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const userEmail = auth.currentUser?.email;
      const userId = auth.currentUser?.uid;

      if (!userEmail && !userId) {
        setLoading(false);
        return;
      }

      // Try fetching via backend API
      let alertList: any[] = [];
      try {
        const queryParam = userEmail ? `email=${encodeURIComponent(userEmail)}` : `userId=${userId}`;
        const res = await fetch(`/api/price-alerts/user-alerts?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.alerts)) {
            alertList = data.alerts;
          }
        }
      } catch (e) {
        console.warn('Backend API fetch failed, querying Firestore directly:', e);
      }

      if (alertList.length === 0 && userEmail) {
        // Fallback to Firestore directly
        const q = query(
          collection(db, 'price_alerts'),
          where('email', '==', userEmail.toLowerCase()),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        alertList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      setAlerts(alertList);
    } catch (err) {
      console.error('Failed to fetch user price alerts:', err);
      toast.error('Failed to load price alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCancelAlert = async (alertId: string, productId: string) => {
    setCancellingId(alertId);
    try {
      const res = await fetch('/api/price-alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          productId,
          email: auth.currentUser?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel price alert');
      }

      toast.success('Price alert removed');
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err: any) {
      console.error('Error removing price alert:', err);
      // Fallback direct delete
      try {
        await deleteDoc(doc(db, 'price_alerts', alertId));
        toast.success('Price alert removed');
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      } catch (e2) {
        toast.error('Failed to remove price alert');
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
        <p className="text-sm font-medium">Loading your price drop alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" /> Price Drop Alerts
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Products you are tracking for price drops. We will email you automatically when target prices are reached.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
          title="Refresh Alerts"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">No Active Price Alerts</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
            When browsing products on CLICK2IT, click <strong>"Price Alert"</strong> or <strong>"Subscribe to Price Drop Alert"</strong> on any product details page to set a target price.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-all"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => {
            const isDeleting = cancellingId === alert.id;
            const target = Number(alert.targetPrice || 0);
            const current = Number(alert.currentPrice || 0);
            const drop = current > target ? current - target : 0;

            return (
              <div
                key={alert.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-3 items-start">
                    {alert.productImage ? (
                      <img
                        src={alert.productImage}
                        alt={alert.productName}
                        className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-gray-50 p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xl shrink-0">
                        ৳
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{alert.productName}</h4>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Alert Target:</span>
                          <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                            ৳{target.toLocaleString()} or lower
                          </span>
                        </div>
                        {current > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Price when set:</span>
                            <span className="font-semibold text-gray-700">৳{current.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <Link
                    to={`/product/${alert.productId}`}
                    className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 hover:underline"
                  >
                    View Product <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => handleCancelAlert(alert.id, alert.productId)}
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 py-1 px-2.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
