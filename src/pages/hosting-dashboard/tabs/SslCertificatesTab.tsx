import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Lock, CheckCircle2, Clock, XCircle, Search, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { toast } from 'react-hot-toast';

export function SslCertificatesTab({ state }) {
  const [activeSubTab, setActiveSubTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet('/api/ssl/products');
      if (res.success) {
        setProducts(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch SSL products');
      }
    } catch (e: any) {
      toast.error('API Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (state.activeTab !== 'ssl-certificates') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SSL Certificates</h1>
            <p className="text-slate-500 mt-1">Manage, order, and track Openprovider SSL certificates for your customers.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'products', label: 'Available Products', icon: ShoppingCart },
          { id: 'active', label: 'Active Certificates', icon: ShieldCheck },
          { id: 'pending', label: 'Pending Validations', icon: Clock }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
              activeSubTab === t.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
        {activeSubTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-700">Openprovider SSL Pricing</h2>
              <button onClick={fetchProducts} disabled={loading} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-colors">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Sync Prices
              </button>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw size={32} className="animate-spin mb-4" />
                <p>Fetching SSL Products from Openprovider API...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p: any) => (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-150 transition-transform"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <Lock className="text-slate-400" size={24} />
                        <div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">{p.type}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{p.name}</h3>
                      <div className="text-3xl font-extrabold text-slate-800 my-4">
                        ${p.price.toFixed(2)} <span className="text-sm text-slate-500 font-medium">/yr</span>
                      </div>
                      <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors">
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'active' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldCheck size={64} className="text-emerald-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Active Certificates</h3>
            <p className="text-slate-500 max-w-md mt-2">You don't have any active SSL certificates issued yet. Orders completed successfully will appear here.</p>
          </div>
        )}

        {activeSubTab === 'pending' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock size={64} className="text-amber-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Pending Validations</h3>
            <p className="text-slate-500 max-w-md mt-2">SSL orders waiting for DCV (Domain Control Validation) or CSR approval will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

