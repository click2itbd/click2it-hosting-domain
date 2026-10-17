import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import { 
  Server, 
  Globe, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Calendar,
  Zap,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DomainCrossSellModal } from '../../components/hosting/DomainCrossSellModal';

const DOMAIN_DISCOUNTS: Record<number, number> = {
  1: 0,
  2: 5,
  3: 10,
  4: 12,
  5: 15
};

const HOSTING_YEAR_DISCOUNTS: Record<number, number> = {
  1: 20, // 20% annual discount
  2: 25, // 25% for 2 years
  3: 30, // 30% for 3 years
  5: 35  // 35% for 5 years
};

export const HostingCart: React.FC = () => {
  const { items: allItems, removeFromCart, updateQuantity, updateCartItem, clearCart } = useCart();
  const navigate = useNavigate();

  const items = allItems.filter((i) => i.category === 'Hosting & Domains');
  const [crossSellDomain, setCrossSellDomain] = React.useState<string | null>(null);

  const domainItem = items.find((i: any) => i.itemType === 'domain' || i.name?.toLowerCase().includes('domain'));
  const hasHostingOrVps = items.some((i: any) => i.itemType === 'hosting' || i.itemType === 'vps' || (!i.itemType?.includes('domain') && !i.name?.toLowerCase().includes('domain')));
  const extractedDomainName = domainItem ? (domainItem.name?.replace(/Domain Registration - /i, '').trim() || 'your-domain.com') : '';

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = 0;
  const total = subtotal + taxes;

  const handleDomainDurationChange = (item: any, years: number) => {
    // Base 1-year annual price
    const base1Yr = item.baseAnnualPrice || (item.termYears ? Math.round(item.price / item.termYears / (1 - (DOMAIN_DISCOUNTS[item.termYears] || 0) / 100)) : item.price);
    const discount = DOMAIN_DISCOUNTS[years] || 0;
    const newPrice = Math.round(base1Yr * years * (1 - discount / 100));

    updateCartItem(item.id, {
      termYears: years,
      baseAnnualPrice: base1Yr,
      price: newPrice,
      description: `${years} Year${years > 1 ? 's' : ''} Registration (Includes WHOIS Privacy)`
    });
    toast.success(`Updated to ${years} year${years > 1 ? 's' : ''} (${discount}% off)`);
  };

  const handleHostingDurationChange = (item: any, cycleStr: string) => {
    // Determine monthly base
    let monthlyBase = item.baseMonthlyPrice || item.monthlyPrice;
    if (!monthlyBase) {
      if (item.billingCycle === 'monthly') {
        monthlyBase = item.price;
      } else if (item.billingCycle === 'quarterly') {
        monthlyBase = Math.round(item.price / 3 / 0.95);
      } else if (item.billingCycle === 'semiannually') {
        monthlyBase = Math.round(item.price / 6 / 0.90);
      } else {
        monthlyBase = Math.round(item.price / 12 / 0.8);
      }
    }

    if (cycleStr === 'monthly') {
      updateCartItem(item.id, {
        billingCycle: 'monthly',
        baseMonthlyPrice: monthlyBase,
        price: monthlyBase,
        termYears: 0
      });
      toast.success('Updated to Monthly billing');
    } else if (cycleStr === 'quarterly') {
      const calculatedPrice = Math.round(monthlyBase * 3 * 0.95);
      updateCartItem(item.id, {
        billingCycle: 'quarterly' as any,
        baseMonthlyPrice: monthlyBase,
        termYears: 0,
        price: calculatedPrice
      });
      toast.success('Updated to Quarterly (3 Months) billing (5% off)');
    } else if (cycleStr === 'semiannually') {
      const calculatedPrice = Math.round(monthlyBase * 6 * 0.90);
      updateCartItem(item.id, {
        billingCycle: 'semiannually' as any,
        baseMonthlyPrice: monthlyBase,
        termYears: 0,
        price: calculatedPrice
      });
      toast.success('Updated to Semi-Annual (6 Months) billing (10% off)');
    } else {
      const years = Number(cycleStr);
      const discount = HOSTING_YEAR_DISCOUNTS[years] || 20;
      const calculatedPrice = Math.round(monthlyBase * 12 * years * (1 - discount / 100));
      updateCartItem(item.id, {
        billingCycle: 'yearly',
        baseMonthlyPrice: monthlyBase,
        termYears: years,
        price: calculatedPrice
      });
      toast.success(`Updated to ${years} Year${years > 1 ? 's' : ''} billing (${discount}% off)`);
    }
  };

  return (
    <Layout fullWidth>
      <div className="bg-[#0a1628] pt-24 pb-16 text-white text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
          Review Your Hosting & Domain Order
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Configure your registration duration with multi-year savings before proceeding to instant checkout.
        </p>
      </div>

      <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 py-12">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="bg-slate-100 p-6 rounded-full mb-6">
              <ShoppingCart className="w-16 h-16 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
              Looks like you haven't added any hosting plans or domains to your cart yet. Let's get you set up!
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-[#0a1628] hover:bg-[#12284c] text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg"
            >
              Browse Hosting Plans <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-black text-slate-900">Cart Items ({items.length})</h2>
                <button 
                  onClick={clearCart}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              </div>

              {/* Cross-Sell Offer Banner if cart has domain but no hosting */}
              {domainItem && !hasHostingOrVps && (
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-400/30">Bundle Offer</span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                        Power up {extractedDomainName} with High-Speed Hosting or Cloud VPS!
                      </h4>
                      <p className="text-xs text-slate-300">
                        Get up to 40% OFF + Free SSL & Automated DNS linking when bundled today.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrossSellDomain(extractedDomainName)}
                    className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
                  >
                    <Zap size={14} /> View Hosting & VPS Offers
                  </button>
                </div>
              )}

              {items.map((item) => {
                const isTransfer = item.itemType === 'domain_transfer';
                const isDomain = !isTransfer && (item.itemType === 'domain' || item.name.toLowerCase().includes('domain'));
                const isHosting = !isTransfer && !isDomain;

                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl shrink-0 border border-slate-100">
                        {isTransfer ? (
                          <RefreshCw className="w-7 h-7 text-amber-600" />
                        ) : isDomain ? (
                          <Globe className="w-7 h-7 text-indigo-600" />
                        ) : (
                          <Server className="w-7 h-7 text-blue-600" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                          {isTransfer && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                              Transfer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isTransfer ? 'Includes 1-Year Extension & Free WHOIS Privacy' : (item.description ? item.description : (typeof item.details === 'object' && item.details !== null 
                            ? Object.values(item.details).filter(Boolean).join(' • ') 
                            : (typeof item.details === 'string' ? item.details : (item.billingCycle === 'monthly' ? 'Billed Monthly' : 'Billed Annually'))))}
                        </p>

                        {/* Domain Transfer Notice */}
                        {isTransfer && (
                          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800">
                            <Sparkles size={13} className="text-amber-600" />
                            <span>1-Year Extension added upon transfer completion</span>
                          </div>
                        )}

                        {/* Multi-Year / Duration Selector for Domains */}
                        {isDomain && (
                          <div className="mt-3 flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-600" />
                            <span className="text-xs font-bold text-gray-700">Duration:</span>
                            <select
                              value={item.termYears || 1}
                              onChange={(e) => handleDomainDurationChange(item, Number(e.target.value))}
                              className="text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-indigo-400"
                            >
                              <option value={1}>1 Year (Regular)</option>
                              <option value={2}>2 Years (Save 5%)</option>
                              <option value={3}>3 Years (Save 10%) 🔥</option>
                              <option value={4}>4 Years (Save 12%)</option>
                              <option value={5}>5 Years (Save 15%) ⭐</option>
                            </select>
                          </div>
                        )}

                        {/* Multi-Year / Duration Selector for Hosting */}
                        {isHosting && (
                          <div className="mt-3 flex items-center gap-2">
                            <Zap size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-gray-700">Billing:</span>
                            <select
                              value={
                                item.billingCycle === 'monthly' ? 'monthly' :
                                (item.billingCycle as string) === 'quarterly' ? 'quarterly' :
                                (item.billingCycle as string) === 'semiannually' ? 'semiannually' :
                                String(item.termYears || 1)
                              }
                              onChange={(e) => handleHostingDurationChange(item, e.target.value)}
                              className="text-xs font-bold bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-blue-400"
                            >
                              <option value="monthly">1 Month</option>
                              <option value="quarterly">3 Months (Save 5%)</option>
                              <option value="semiannually">6 Months (Save 10%)</option>
                              <option value="1">1 Year (Save 20%) 🔥</option>
                              <option value="2">2 Years (Save 25%)</option>
                              <option value="3">3 Years (Save 30%) ⭐</option>
                              <option value="5">5 Years (Save 35%) 🚀</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.quantity > 1 ? `${formatCurrency(item.price)} each` : 'Total Price'}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-24 space-y-6">
                <h2 className="text-xl font-black text-slate-900">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Setup & Activation</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & VAT</span>
                    <span className="font-bold text-slate-900">{formatCurrency(0)}</span>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                    <span className="text-base font-bold text-slate-900">Grand Total</span>
                    <span className="text-2xl font-black text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/hosting/checkout')}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>30-Day Money-Back Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Instant Automated Provisioning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Domain Cross-Sell Offer Modal */}
      {crossSellDomain && (
        <DomainCrossSellModal
          isOpen={!!crossSellDomain}
          onClose={() => setCrossSellDomain(null)}
          domainName={crossSellDomain}
          onOpenCustomBuilder={() => {
            setCrossSellDomain(null);
            navigate('/hosting?custom=true');
          }}
        />
      )}
    </Layout>
  );
};

