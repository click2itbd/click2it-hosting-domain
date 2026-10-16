import React, { useState } from 'react';
import { ShoppingCart, List, Trash2, Search } from 'lucide-react';
import { cn, formatCurrency } from '../../../../lib/utils';
import toast from 'react-hot-toast';
import { Product } from '../../../../types';
import { CustomProductPurchaseModal } from '../../modals/CustomProductPurchaseModal';
import { PackagePlus } from 'lucide-react';

interface POSHeaderProps {
  heldCarts: any[];
  showHeldCarts: boolean;
  setShowHeldCarts: (v: boolean) => void;
  restoreCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  products: Product[];
  filteredProducts: Product[];
  addToCart: (p: Product, scannedSerial?: string) => void;
  settings: any;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  heldCarts,
  showHeldCarts,
  setShowHeldCarts,
  restoreCart,
  deleteHeldCart,
  searchQuery,
  setSearchQuery,
  products,
  filteredProducts,
  addToCart,
  settings,
}) => {
  const [showCustomProductModal, setShowCustomProductModal] = useState(false);
  return (
    <>
    <header className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
          <ShoppingCart className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">CLICK POS</h1>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Retail System</span>
        </div>
        
        <div className="ml-6 relative">
          <button 
            onClick={() => setShowHeldCarts(!showHeldCarts)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
              heldCarts.length > 0 ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-slate-50 text-slate-400 border-slate-200"
            )}
          >
            <List size={14} /> Held Carts
            {heldCarts.length > 0 && (
              <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[10px] ml-1">{heldCarts.length}</span>
            )}
          </button>

          {showHeldCarts && heldCarts.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 mb-1">Suspended Sales</div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {heldCarts.map(hc => (
                  <div key={hc.id} className="flex flex-col p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 cursor-pointer group" onClick={() => restoreCart(hc.id)}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-700">{hc.customer ? hc.customer.name : 'Walk-in'}</span>
                      <span className="text-[10px] text-slate-400">{hc.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">{hc.cart.length} items</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteHeldCart(hc.id); }}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={() => setShowCustomProductModal(true)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-200"><PackagePlus size={16} /> Custom Product</button>
        <div className="relative group w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search products or scan barcode..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm text-slate-700 placeholder-slate-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const currentValue = e.currentTarget.value.trim();
                if (!currentValue) return;

                const searchLower = currentValue.toLowerCase();
                
                let matchedSerial: string | undefined = undefined;
                const exactMatches = products.filter(p => {
                  if (p.id.toLowerCase() === searchLower || 
                      (p as any).sku?.toLowerCase() === searchLower ||
                      (p.model && p.model.toLowerCase() === searchLower) || 
                      p.name.toLowerCase() === searchLower) {
                    return true;
                  }
                  const foundSerial = (p.availableSerials || []).find((s: string) => s.toLowerCase() === searchLower);
                  if (foundSerial) {
                    matchedSerial = foundSerial;
                    return true;
                  }
                  return false;
                });
                
                const partialMatches = products.filter(p => p.name.toLowerCase().includes(searchLower));
                
                const bestMatch = exactMatches.length === 1 ? exactMatches[0] : (partialMatches.length === 1 ? partialMatches[0] : null);

                if (bestMatch) {
                  addToCart(bestMatch, matchedSerial);
                  setSearchQuery('');
                  toast.success(`Scanned: ${bestMatch.name}`);
                } else if (exactMatches.length > 1 || partialMatches.length > 1) {
                  toast.success(`Found multiple items. Please select manually.`);
                } else {
                  toast.error('No matching product found for scan');
                }
              }
            }}
          />
          
          {searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[60vh] overflow-y-auto z-50">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-bold">No products found</div>
              ) : (
                <div className="flex flex-col">
                  {filteredProducts.map(p => {
                    const isAvailable = p.stock > 0;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          if (isAvailable) {
                            addToCart(p);
                            setSearchQuery('');
                          } else {
                            toast.error('Item is out of stock');
                          }
                        }}
                        className={cn(
                          "p-4 border-b border-slate-100 flex items-center justify-between transition-colors",
                          isAvailable ? "hover:bg-blue-50 cursor-pointer" : "opacity-50 cursor-not-allowed bg-slate-50"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                            {p.category} • Stock: {isAvailable ? p.stock : 'OUT'}
                          </span>
                        </div>
                        <div className="font-black text-blue-600">{formatCurrency(p.price, settings)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
      {showCustomProductModal && (
        <CustomProductPurchaseModal 
          onClose={() => setShowCustomProductModal(false)} 
          onSuccess={(product) => {
            setShowCustomProductModal(false);
            addToCart(product);
          }} 
        />
      )}
    </>
  );
};

