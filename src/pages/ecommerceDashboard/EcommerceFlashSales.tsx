import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { Zap, Save, Clock, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const EcommerceFlashSales: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [flashSaleConfig, setFlashSaleConfig] = useState({
    enabled: false,
    title: 'Flash Sale',
    endTime: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const settingsSnap = await getDoc(doc(db, 'store_banners', 'ecommerce_flash_sale'));
      if (settingsSnap.exists()) {
        setFlashSaleConfig(settingsSnap.data() as any);
      } else {
        // Set default tomorrow if not exists
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFlashSaleConfig(prev => ({ ...prev, endTime: tomorrow.toISOString().slice(0, 16) }));
      }

      // Fetch products
      const pSnap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load flash sale data');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'store_banners', 'ecommerce_flash_sale'), flashSaleConfig);
      toast.success('Flash sale configuration saved!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleProductFlashSale = async (productId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', productId), { isFlashSale: !currentStatus });
      setProducts(products.map(p => p.id === productId ? { ...p, isFlashSale: !currentStatus } : p));
      toast.success(currentStatus ? 'Removed from Flash Sale' : 'Added to Flash Sale');
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error('Failed to update product');
    }
  };

  const updateFlashSalePrice = async (productId: string, newPrice: string) => {
    const numPrice = Number(newPrice);
    if (isNaN(numPrice) || numPrice <= 0) return;
    try {
      await updateDoc(doc(db, 'products', productId), { discountPrice: numPrice });
      setProducts(products.map(p => p.id === productId ? { ...p, discountPrice: numPrice } : p));
      toast.success('Offer price updated');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.isFlashSale && searchQuery.toLowerCase() === 'flash')
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Flash Sales & Campaigns</h2>
        <p className="text-gray-500 text-sm mt-1">Manage limited-time offers and select products.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-orange-500" /> Countdown Timer Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enable Flash Sale</label>
                <div className="flex items-center h-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={flashSaleConfig.enabled} onChange={e => setFlashSaleConfig({...flashSaleConfig, enabled: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">{flashSaleConfig.enabled ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
                <input 
                  type="text" 
                  value={flashSaleConfig.title}
                  onChange={e => setFlashSaleConfig({...flashSaleConfig, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={flashSaleConfig.endTime}
                  onChange={e => setFlashSaleConfig({...flashSaleConfig, endTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={saveConfig}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Timer Config'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Zap size={18} className="text-orange-500" /> Flash Sale Products
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Regular Price</th>
                    <th className="px-6 py-3">Offer Price</th>
                    <th className="px-6 py-3 text-right">In Flash Sale?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className={product.isFlashSale ? "bg-orange-50/30" : ""}>
                      <td className="px-6 py-3 flex items-center gap-3">
                        <img src={product.images?.[0] || 'https://via.placeholder.com/40'} alt={product.name} className="w-10 h-10 rounded object-cover border border-gray-200" />
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">৳{product.price}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">৳</span>
                          <input 
                            type="number"
                            defaultValue={product.discountPrice || ''}
                            placeholder="e.g. 990"
                            onBlur={(e) => updateFlashSalePrice(product.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={product.isFlashSale || false} 
                            onChange={() => toggleProductFlashSale(product.id, product.isFlashSale || false)} 
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
