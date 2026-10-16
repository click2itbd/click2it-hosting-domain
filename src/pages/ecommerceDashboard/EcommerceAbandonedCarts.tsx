import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingCart, Search, Mail, Trash2, Clock, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CartItem } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';

interface AbandonedCart {
  id: string;
  userId: string;
  userEmail: string;
  userPhone?: string;
  userName?: string;
  items: CartItem[];
  total: number;
  updatedAt: string;
}

export const EcommerceAbandonedCarts: React.FC = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'abandoned_carts'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AbandonedCart));
      setCarts(data);
    } catch (error) {
      console.error('Error fetching abandoned carts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCart = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to remove this abandoned cart?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'abandoned_carts', id));
      setCarts(carts.filter(c => c.id !== id));
      toast.success('Abandoned cart removed');
    } catch (error) {
      console.error('Error deleting cart:', error);
      toast.error('Failed to remove cart');
    }
  };

  const filteredCarts = carts.filter(c => 
    (c.userEmail && c.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.userName && c.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.userPhone && c.userPhone.includes(searchQuery))
  );

  const getTimeAgo = (dateString: string) => {
    const hours = Math.abs(new Date().getTime() - new Date(dateString).getTime()) / 36e5;
    if (hours < 1) return 'Less than an hour ago';
    if (hours < 24) return `${Math.floor(hours)} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Abandoned Carts</h2>
        <p className="text-gray-500 text-sm mt-1">Track customers who left products in their cart without checking out.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredCarts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCarts.map((cart) => (
            <div key={cart.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-900">{cart.userName || 'Guest User'}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Clock size={12} /> {getTimeAgo(cart.updatedAt)}
                  </div>
                </div>
                <div className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100 flex items-center gap-1">
                  <AlertCircle size={12} /> Abandoned
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {cart.userEmail && (
                    <a href={`mailto:${cart.userEmail}?subject=Did you forget something in your cart?`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Mail size={14} /> {cart.userEmail}
                    </a>
                  )}
                  {cart.userPhone && (
                    <a href={`tel:${cart.userPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Phone size={14} /> {cart.userPhone}
                    </a>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cart Items ({cart.items?.length || 0})</p>
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {cart.items?.map((item, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <img src={item.product?.images?.[0] || 'https://via.placeholder.com/40'} alt="product" className="w-10 h-10 object-cover rounded border border-gray-200" />
                        <div>
                          <div className="font-medium text-gray-800 line-clamp-1">{item.product?.name}</div>
                          <div className="text-gray-500 text-xs">Qty: {item.quantity} × ৳{item.product?.discountPrice || item.product?.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Cart Total</div>
                  <div className="font-bold text-gray-900 text-lg">৳{cart.total}</div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => deleteCart(cart.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove record"
                  >
                    <Trash2 size={18} />
                  </button>
                  <a 
                    href={`mailto:${cart.userEmail}?subject=We saved your cart for you!&body=Hi ${cart.userName || ''}, we noticed you left some items in your cart. Come back and complete your purchase!`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Mail size={16} /> Send Email
                  </a>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Abandoned Carts</h3>
          <p className="text-gray-500 text-sm">Customers are checking out successfully!</p>
        </div>
      )}
    </div>
  );
};
