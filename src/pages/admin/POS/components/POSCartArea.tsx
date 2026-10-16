import React from 'react';
import { ShoppingCart, Trash2, Plus } from 'lucide-react';
import { cn, formatCurrency } from '../../../../lib/utils';
import { Customer } from '../../../../types';

interface POSCartAreaProps {
  cart: any[];
  setCart: (v: any) => void;
  settings: any;
  adjustQty: (id: string, qty: number) => void;
  changeVariant: (id: string, variantId: string) => void;
  removeFromCart: (id: string) => void;
  openSerialModal: (idx: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  customers: Customer[];
  setIsAddingCustomer: (v: boolean) => void;
}

export const POSCartArea: React.FC<POSCartAreaProps> = ({
  cart,
  setCart,
  settings,
  adjustQty,
  changeVariant,
  removeFromCart,
  openSerialModal,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  setIsAddingCustomer
}) => {
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = React.useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(customerSearch))
  );
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-4">
      
      {/* Customer Selection */}
      <div className="bg-white border-b-2 border-slate-300 p-3 flex gap-2 items-center flex-wrap">
        <span className="font-bold text-slate-700 text-sm whitespace-nowrap">CUSTOMER INFO:</span>
        
        {!selectedCustomer && (
          <div className="flex-1 max-w-md relative">
            <input 
              type="text" 
              placeholder="Search by Name or Phone..." 
              value={customerSearch}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
            {isCustomerDropdownOpen && customerSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 shadow-xl rounded-lg max-h-48 overflow-y-auto z-50">
                <div 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700"
                >
                  General Customer
                </div>
                {filteredCustomers.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="text-xs text-slate-500">{c.phone || c.email}</span>
                    </div>
                    {c.loyaltyPoints && c.loyaltyPoints > 0 ? (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-1 rounded-full">
                        {c.loyaltyPoints} PTS
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {selectedCustomer ? (
          <div className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{selectedCustomer.name} <span className="text-slate-500 font-medium">({selectedCustomer.phone})</span></span>
              <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wider ml-1 border border-indigo-200">
                {selectedCustomer.loyaltyPoints || 0} PTS
              </span>
            </div>
            <button 
              onClick={() => setSelectedCustomer(null)}
              className="text-slate-400 hover:text-red-600 ml-2 hover:bg-red-50 p-1.5 rounded-md transition-colors"
              title="Remove Customer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-sm font-medium flex items-center shadow-sm">
            <span className="mr-2 text-slate-400">👤</span> General Customer
          </div>
        )}

        <button 
          onClick={() => setIsAddingCustomer(true)}
          className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> NEW CUSTOMER
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 flex-1">
          <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200">
            <ShoppingCart size={40} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-600 text-lg">Scan to begin sale</p>
            <p className="text-sm mt-1">Use the barcode scanner or search bar above to add products.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse bg-white">
              <thead className="sticky top-0 bg-slate-800 text-white z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-slate-700 w-32">ITEM CODE</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-slate-700">DESCRIPTION</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center border-b border-slate-700 w-32">QTY</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right border-b border-slate-700 w-32">RATE</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right border-b border-slate-700 w-32">TOTAL</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider border-b border-slate-700 w-12"></th>
                </tr>
              </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={item.cartItemId} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-slate-700">{item.product.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-base">{item.product.name}</span>
                      {item.product.variants && item.product.variants.length > 0 && (
                        <select 
                          value={item.selectedVariant?.id || ''}
                          onChange={e => changeVariant(item.cartItemId, e.target.value)}
                          className={cn(
                            "mt-1 text-xs border rounded p-1 font-bold w-fit focus:ring-blue-500 focus:border-blue-500",
                            !item.selectedVariant ? "border-red-400 text-red-500 bg-red-50" : "border-slate-200 text-slate-700 bg-white"
                          )}
                        >
                          <option value="" disabled>Select Variant</option>
                          {item.product.variants.map((v: any) => (
                            <option key={v.id} value={v.id}>{v.name} ({v.stock} in stock)</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                      <button onClick={() => adjustQty(item.cartItemId, item.quantity - 1)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors">-</button>
                      <span className="font-bold w-8 text-center text-sm text-slate-900">{item.quantity}</span>
                      <button onClick={() => adjustQty(item.cartItemId, item.quantity + 1)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors">+</button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      min={0}
                      value={item.product.price}
                      onChange={(e) => {
                        const newCart = [...cart];
                        newCart[idx].product = { ...newCart[idx].product, price: Number(e.target.value) };
                        setCart(newCart);
                      }}
                      className="w-24 text-right border-none bg-transparent p-0 font-bold text-slate-700 focus:ring-0 text-base"
                    />
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 text-lg">
                    {formatCurrency(item.product.price * item.quantity, settings).replace('BDT', '').trim()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-700">SUBTOTAL</td>
                <td className="py-3 px-4 text-right font-black text-slate-900 text-xl">
                  {formatCurrency(cart.reduce((s, i) => s + (i.product.price * i.quantity), 0), settings).replace('BDT', '').trim()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};
