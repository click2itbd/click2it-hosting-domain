import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Loader2, AlertCircle, Trash2, Mail, Tag, ArrowDownRight } from 'lucide-react';
import { Product } from '../types';
import { auth, db } from '../firebase';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const currentPrice = product.discountPrice || product.price || 0;
  
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState<number>(Math.round(currentPrice * 0.95)); // default 5% drop
  const [selectedPercentage, setSelectedPercentage] = useState<number | 'custom'>(5);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);

  // Initialize email & check active alert when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const currentUserEmail = auth.currentUser?.email || '';
    if (currentUserEmail && !email) {
      setEmail(currentUserEmail);
    }

    const checkExistingAlert = async () => {
      setCheckingStatus(true);
      try {
        const userEmail = currentUserEmail || email;
        const userId = auth.currentUser?.uid;

        // Call backend API check-status first
        let foundAlert = null;

        if (userEmail || userId) {
          try {
            const queryParam = userEmail ? `email=${encodeURIComponent(userEmail)}` : `userId=${userId}`;
            const res = await fetch(`/api/price-alerts/check-status?productId=${product.id}&${queryParam}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.activeAlert) {
                foundAlert = data.activeAlert;
              }
            }
          } catch (e) {
            // fallback to direct firestore query
            const q = query(
              collection(db, 'price_alerts'),
              where('productId', '==', product.id),
              where('status', '==', 'active'),
              where('email', '==', userEmail.toLowerCase())
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              foundAlert = { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
          }
        }

        if (foundAlert) {
          setActiveAlert(foundAlert);
          setTargetPrice(foundAlert.targetPrice);
          setSelectedPercentage('custom');
          if (foundAlert.email) setEmail(foundAlert.email);
        } else {
          setActiveAlert(null);
          // Default 5% drop target
          const target = Math.round(currentPrice * 0.95);
          setTargetPrice(target);
          setSelectedPercentage(5);
        }
      } catch (err) {
        console.error('Error checking active alert:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkExistingAlert();
  }, [isOpen, product.id, currentPrice]);

  if (!isOpen) return null;

  const handlePercentageClick = (percent: number) => {
    setSelectedPercentage(percent);
    const calculated = Math.round(currentPrice * (1 - percent / 100));
    setTargetPrice(calculated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!targetPrice || targetPrice <= 0) {
      toast.error('Please enter a valid target price');
      return;
    }

    if (targetPrice >= currentPrice) {
      toast.error(`Target price should be lower than current price (${formatCurrency(currentPrice)})`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Setting price drop alert...');

    try {
      const payload = {
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || product.images?.[0] || '',
        currentPrice,
        targetPrice: Number(targetPrice),
        email: email.trim().toLowerCase(),
        userId: auth.currentUser?.uid || 'guest',
      };

      const res = await fetch('/api/price-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to set price alert');
      }

      toast.success(
        `Price alert set! We'll email ${email} when price drops to ${formatCurrency(targetPrice)} or lower.`,
        { id: toastId, duration: 5000 }
      );

      setActiveAlert({
        id: data.alertId,
        ...payload,
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Price alert submission error:', err);
      toast.error(err.message || 'Failed to subscribe to price alert', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAlert = async () => {
    if (!activeAlert) return;

    setLoading(true);
    const toastId = toast.loading('Cancelling price alert...');

    try {
      const res = await fetch('/api/price-alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: activeAlert.id,
          productId: product.id,
          email: activeAlert.email || email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel price alert');
      }

      toast.success('Price alert cancelled successfully', { id: toastId });
      setActiveAlert(null);
      setTargetPrice(Math.round(currentPrice * 0.95));
      setSelectedPercentage(5);
    } catch (err: any) {
      console.error('Cancel alert error:', err);
      toast.error(err.message || 'Failed to cancel price alert', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const savings = currentPrice - targetPrice;
  const savingsPercent = Math.round((savings / currentPrice) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-5 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Price Drop Alert</h3>
              <p className="text-xs text-orange-100 font-medium">Get notified via email when price drops</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          
          {/* Product Summary */}
          <div className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
            <img
              src={product.imageUrl || product.images?.[0] || 'https://click2itbd.com/logo.png'}
              alt={product.name}
              className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-gray-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{product.name}</h4>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs text-gray-500 font-medium">Current Price:</span>
                <span className="text-base font-extrabold text-gray-900">{formatCurrency(currentPrice)}</span>
              </div>
            </div>
          </div>

          {checkingStatus ? (
            <div className="py-8 text-center text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" />
              <p className="text-xs">Checking alert status...</p>
            </div>
          ) : activeAlert ? (
            /* Active Alert Banner & Management */
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 text-sm">
                  <h5 className="font-bold text-emerald-900">Price Alert is Active!</h5>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    We will send an email to <span className="font-semibold">{activeAlert.email}</span> when this product reaches <span className="font-bold text-emerald-800">{formatCurrency(activeAlert.targetPrice)}</span> or lower.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAlert}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Cancel Alert
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-sm font-bold transition-colors shadow-sm"
                >
                  Edit Target Price
                </button>
              </div>
            </div>
          ) : (
            /* Subscription Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Target Price Drop Presets */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Price Drop Target
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((percent) => {
                    const priceVal = Math.round(currentPrice * (1 - percent / 100));
                    const isSelected = selectedPercentage === percent;
                    return (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => handlePercentageClick(percent)}
                        className={cn(
                          'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5',
                          isSelected
                            ? 'border-orange-500 bg-orange-50/80 text-orange-900 ring-2 ring-orange-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        )}
                      >
                        <span className="text-xs font-bold flex items-center gap-0.5 text-orange-600">
                          <ArrowDownRight className="w-3 h-3" /> {percent}% Off
                        </span>
                        <span className="text-xs font-extrabold text-gray-900">{formatCurrency(priceVal)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Target Price Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-orange-500" /> Target Alert Price (৳)
                  </label>
                  {savings > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Saves {formatCurrency(savings)} ({savingsPercent}%)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    value={targetPrice || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetPrice(val);
                      setSelectedPercentage('custom');
                    }}
                    placeholder={`e.g. ${Math.round(currentPrice * 0.9)}`}
                    max={currentPrice - 1}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-gray-900 text-sm shadow-xs"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Alert triggers if price drops to or below this amount.
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-orange-500" /> Notification Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm text-gray-900 shadow-xs"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Set Price Drop Alert
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-gray-400 border-t border-gray-100 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
            Instant notification when CLICK2IT updates this product price.
          </div>
        </div>
      </div>
    </div>
  );
};
