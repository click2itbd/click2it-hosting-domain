import React from 'react';
import { User, UserPlus, Trash2, ArrowRight, CheckCircle2, ShoppingCart } from 'lucide-react';
import { cn, formatCurrency } from '../../../../lib/utils';
import { Customer, PaymentAccount } from '../../../../types';

interface POSSidebarProps {
  isPaymentView: boolean;
  setIsPaymentView: (v: boolean) => void;
  payments: {accountId: string, amount: number}[];
  setPayments: (v: any) => void;
  paymentAccounts: PaymentAccount[];
  receivedAmount: number | '';
  setReceivedAmount: (v: number | '') => void;
  total: number;
  subtotal: number;
  discountType: 'flat' | 'percentage';
  setDiscountType: (v: 'flat' | 'percentage') => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  taxPercent: number;
  setTaxPercent: (v: number) => void;
  holdCurrentCart: () => void;
  handleCheckoutClick?: () => void;
  processPaymentAndOrder: () => void;
  cart: any[];
  isProcessing: boolean;
  settings: any;
  isRedeemingPoints?: boolean;
  setIsRedeemingPoints?: (v: boolean) => void;
  selectedCustomer?: any;
}

export const POSSidebar: React.FC<POSSidebarProps> = ({
  isPaymentView,
  setIsPaymentView,
  payments,
  setPayments,
  paymentAccounts,
  receivedAmount,
  setReceivedAmount,
  total,
  subtotal,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  taxPercent,
  setTaxPercent,
  holdCurrentCart,
  processPaymentAndOrder,
  cart,
  isProcessing,
  settings,
  isRedeemingPoints,
  setIsRedeemingPoints,
  selectedCustomer,
}) => {
  return (
    <div className="w-[320px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20">
      <div className="p-6 bg-white flex flex-col h-full relative z-10">
        <h3 className="font-black text-lg text-slate-800 mb-6 border-b border-slate-100 pb-2">Order Summary</h3>
        
        <div className="space-y-4 mb-4 flex-1">
          <div className="flex justify-between items-center text-sm font-bold text-slate-600">
            <span>Discount</span>
            <div className="flex items-center gap-1">
              <select 
                value={discountType} 
                onChange={e => setDiscountType(e.target.value as 'flat' | 'percentage')}
                className="p-1.5 border border-slate-200 rounded-lg text-xs focus:ring-blue-500 outline-none"
              >
                <option value="flat">Flat</option>
                <option value="percentage">%</option>
              </select>
              <input 
                type="number" 
                min="0"
                value={discountValue || ''}
                onChange={e => setDiscountValue(Number(e.target.value))}
                placeholder="0"
                className="w-20 text-right p-1.5 border border-slate-200 rounded-lg text-sm font-black focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-slate-600">
            <span>VAT / Tax (%)</span>
            <input 
              type="number" 
              min="0"
              value={taxPercent || ''}
              onChange={e => setTaxPercent(Number(e.target.value))}
              placeholder="0"
              className="w-20 text-right p-1.5 border border-slate-200 rounded-lg text-sm font-black focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="h-px bg-slate-200 my-4" />

          {paymentAccounts.map(acc => {
            const currentPayment = payments.find(p => p.accountId === acc.id)?.amount || '';
            const isCash = acc.type === 'cash' || acc.name.toLowerCase().includes('cash');
            
            // Format label to just show the generic type like CASH, BKASH, NAGAD, BANK
            let displayLabel = acc.name.toUpperCase();
            if (acc.type) {
              const t = acc.type.toLowerCase();
              if (t === 'cash') displayLabel = 'CASH';
              else if (t === 'bkash') displayLabel = 'BKASH';
              else if (t === 'nagad') displayLabel = 'NAGAD';
              else if (t === 'bank') displayLabel = 'BANK';
              else if (t === 'card') displayLabel = 'CARD';
            }
            
            return (
              <div key={acc.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>{displayLabel}</span>
                  <input 
                    type="number" 
                    min="0"
                    value={currentPayment}
                    onChange={e => {
                      const val = Number(e.target.value);
                      let newP = [...payments];
                      const idx = newP.findIndex(p => p.accountId === acc.id);
                      if (val > 0) {
                        if (idx >= 0) newP[idx].amount = val;
                        else newP.push({ accountId: acc.id, amount: val });
                      } else {
                        if (idx >= 0) newP.splice(idx, 1);
                      }
                      setPayments(newP);
                    }}
                    placeholder="0"
                    className="w-24 text-right p-1.5 border border-slate-200 rounded-lg text-sm font-black focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {settings?.isLoyaltyEnable === 'Enable' && selectedCustomer && (selectedCustomer.loyaltyPoints || 0) >= Number(settings?.minimumPointToRedeem || 0) && setIsRedeemingPoints && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800">Redeem Points ({selectedCustomer.loyaltyPoints})</p>
                <p className="text-[10px] text-emerald-600">1 Point = 1 TK Discount</p>
              </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isRedeemingPoints || false}
                onChange={e => setIsRedeemingPoints(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-200 space-y-3">
          <div className="flex justify-between text-2xl font-black text-slate-900">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(total, settings).replace('BDT', '').trim()}</span>
          </div>
          
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-500">Remaining</span>
            <span className={cn((total - payments.reduce((s, p) => s + p.amount, 0)) > 0.01 ? "text-red-500" : "text-green-500")}>
              {formatCurrency(total - payments.reduce((s, p) => s + p.amount, 0), settings).replace('BDT', '').trim()}
            </span>
          </div>

          <div className="flex gap-2 mt-2">
            <button 
              onClick={holdCurrentCart} 
              disabled={cart.length === 0}
              className="flex-1 bg-amber-100 hover:bg-amber-200 disabled:bg-slate-100 disabled:text-slate-400 text-amber-700 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-all disabled:shadow-none"
            >
              Hold
            </button>
            <button 
              onClick={processPaymentAndOrder} 
              disabled={isProcessing || cart.length === 0}
              className="flex-[2] bg-[#1a365d] hover:bg-[#11233e] disabled:bg-slate-200 disabled:text-slate-400 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-black text-lg shadow-xl transition-all disabled:shadow-none"
            >
              <CheckCircle2 size={24} />
              {isProcessing ? 'Processing...' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

