import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, Truck, Save, Server, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const EcommerceShipping: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    insideDhaka: 60,
    outsideDhaka: 120,
    freeShippingThreshold: 5000,
    enableFreeShipping: false,
    providers: {
      steadfast: {
        enabled: false,
        apiKey: '',
        secretKey: ''
      },
      pathao: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        storeId: ''
      }
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'ecommerce_shipping'));
      if (snap.exists()) {
        setConfig(snap.data() as any);
      }
    } catch (error) {
      console.error('Error fetching shipping config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'ecommerce_shipping'), config);
      toast.success('Shipping configuration saved!');
    } catch (error) {
      console.error('Error saving shipping config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Advanced Shipping & Zones</h2>
        <p className="text-gray-500 text-sm mt-1">Configure courier charges and integrate delivery APIs.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Base Rates */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-blue-500" /> Standard Delivery Rates
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inside Dhaka (৳)</label>
                <input 
                  type="number" 
                  value={config.insideDhaka}
                  onChange={e => setConfig({...config, insideDhaka: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outside Dhaka (৳)</label>
                <input 
                  type="number" 
                  value={config.outsideDhaka}
                  onChange={e => setConfig({...config, outsideDhaka: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.enableFreeShipping}
                    onChange={e => setConfig({...config, enableFreeShipping: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Enable Conditional Free Shipping
                </label>
                
                {config.enableFreeShipping && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Order Minimum (৳)</label>
                    <input 
                      type="number" 
                      value={config.freeShippingThreshold}
                      onChange={e => setConfig({...config, freeShippingThreshold: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Orders above this amount will get free delivery.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Courier API Integration */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Server size={20} className="text-indigo-500" /> Courier API Integrations
            </h3>
            
            <div className="space-y-6">
              {/* Steadfast */}
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Truck size={20} className="text-gray-600" />
                    <span className="font-bold text-gray-900">Steadfast Courier</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.providers.steadfast.enabled} onChange={e => setConfig({...config, providers: {...config.providers, steadfast: {...config.providers.steadfast, enabled: e.target.checked}}})} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {config.providers.steadfast.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                      <input 
                        type="password" 
                        value={config.providers.steadfast.apiKey}
                        onChange={e => setConfig({...config, providers: {...config.providers, steadfast: {...config.providers.steadfast, apiKey: e.target.value}}})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Secret Key</label>
                      <input 
                        type="password" 
                        value={config.providers.steadfast.secretKey}
                        onChange={e => setConfig({...config, providers: {...config.providers, steadfast: {...config.providers.steadfast, secretKey: e.target.value}}})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter Secret Key"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pathao */}
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={20} className="text-gray-600" />
                    <span className="font-bold text-gray-900">Pathao Courier</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={config.providers.pathao.enabled} onChange={e => setConfig({...config, providers: {...config.providers, pathao: {...config.providers.pathao, enabled: e.target.checked}}})} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {config.providers.pathao.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                      <input 
                        type="text" 
                        value={config.providers.pathao.clientId}
                        onChange={e => setConfig({...config, providers: {...config.providers, pathao: {...config.providers.pathao, clientId: e.target.value}}})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                      <input 
                        type="password" 
                        value={config.providers.pathao.clientSecret}
                        onChange={e => setConfig({...config, providers: {...config.providers, pathao: {...config.providers.pathao, clientSecret: e.target.value}}})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter Client Secret"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Store ID</label>
                      <input 
                        type="text" 
                        value={config.providers.pathao.storeId}
                        onChange={e => setConfig({...config, providers: {...config.providers, pathao: {...config.providers.pathao, storeId: e.target.value}}})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter Store ID"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button 
          onClick={saveConfig}
          disabled={saving || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
