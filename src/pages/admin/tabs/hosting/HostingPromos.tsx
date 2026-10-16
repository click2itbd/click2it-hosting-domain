import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Tag, Save, Globe, Sparkles, CheckCircle2, AlertCircle, Calendar, Type, Palette, Clock } from 'lucide-react';

interface PromoSettings {
  isFreeDomainEnabled: boolean;
  eligibleTlds: string[];
  bannerText: string;
  bannerColor: string;
  startDate: string;
  endDate: string;
  eligibleBillingCycles: string[];
}

export default function HostingPromos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PromoSettings>({
    isFreeDomainEnabled: false,
    eligibleTlds: ['.com'],
    bannerText: 'Limited Time Offer! Get a FREE domain when you buy our selected Hosting plans.',
    bannerColor: 'from-blue-600 to-blue-800',
    startDate: '',
    endDate: '',
    eligibleBillingCycles: ['yearly']
  });

  const [tldInput, setTldInput] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'hostingPromos');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({
            isFreeDomainEnabled: false,
            eligibleTlds: ['.com'],
            bannerText: 'Limited Time Offer! Get a FREE domain when you buy our selected Hosting plans.',
            bannerColor: 'from-blue-600 to-blue-800',
            startDate: '',
            endDate: '',
            eligibleBillingCycles: ['yearly'],
            ...snap.data()
          });
        }
      } catch (error) {
        console.error('Error fetching promo settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'hostingPromos'), settings, { merge: true });
      toast.success('Promo settings saved successfully', { position: 'bottom-right' });
    } catch (error) {
      console.error('Error saving promo settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTld = () => {
    const val = tldInput.trim().toLowerCase();
    if (!val) return;
    const cleanTld = val.startsWith('.') ? val : `.${val}`;
    if (!settings.eligibleTlds.includes(cleanTld)) {
      setSettings(prev => ({ ...prev, eligibleTlds: [...prev.eligibleTlds, cleanTld] }));
    }
    setTldInput('');
  };

  const handleRemoveTld = (tld: string) => {
    setSettings(prev => ({
      ...prev,
      eligibleTlds: prev.eligibleTlds.filter(t => t !== tld)
    }));
  };

  const toggleCycle = (cycle: string) => {
    setSettings(prev => {
      const exists = prev.eligibleBillingCycles.includes(cycle);
      return {
        ...prev,
        eligibleBillingCycles: exists 
          ? prev.eligibleBillingCycles.filter(c => c !== cycle)
          : [...prev.eligibleBillingCycles, cycle]
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const gradientOptions = [
    { label: 'Blue (Default)', value: 'from-blue-600 to-blue-800' },
    { label: 'Red (Sale)', value: 'from-red-600 to-red-800' },
    { label: 'Purple (Premium)', value: 'from-purple-600 to-indigo-800' },
    { label: 'Green (Eco/Fresh)', value: 'from-emerald-500 to-teal-700' },
    { label: 'Dark (Black Friday)', value: 'from-gray-900 to-black' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Tag className="text-blue-600" size={28} />
            Marketing Promos
          </h2>
          <p className="text-gray-500 mt-1">Manage active discounts and promotional campaigns to boost sales.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="flex items-center gap-2 px-6 py-3 bg-[#081621] text-white rounded-xl font-bold hover:bg-[#EF4444] transition-all disabled:opacity-50 shadow-md shadow-gray-200"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Main Promo Card */}
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${settings.isFreeDomainEnabled ? 'bg-white border-blue-200 shadow-xl shadow-blue-900/5' : 'bg-gray-50/50 border-gray-200'}`}>
        <div className={`absolute top-0 left-0 w-full h-1.5 transition-all duration-300 ${settings.isFreeDomainEnabled ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500' : 'bg-gray-200'}`} />
        
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl transition-colors ${settings.isFreeDomainEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Free Domain with Hosting</h3>
                {settings.isFreeDomainEnabled ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                    <AlertCircle size={14} /> Inactive
                  </span>
                )}
              </div>
              <p className="text-gray-500 leading-relaxed mt-4">
                Skyrocket your hosting sales by offering a free domain name. When a customer adds an eligible hosting plan to their cart, the price of the domain will automatically drop to <strong>0 BDT</strong>.
              </p>
            </div>
            
            <div className="shrink-0 mt-2 md:mt-0">
              <label className="relative flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.isFreeDomainEnabled}
                  onChange={e => setSettings(prev => ({ ...prev, isFreeDomainEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-16 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner group-hover:shadow-md transition-all"></div>
              </label>
            </div>
          </div>

          <div className={`transition-all duration-500 overflow-hidden ${settings.isFreeDomainEnabled ? 'max-h-[2000px] opacity-100 mt-8 pt-8 border-t border-gray-100' : 'max-h-0 opacity-0'}`}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TLDs Section */}
              <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" /> Eligible Domains
                </h4>
                <p className="text-xs text-gray-500 mb-5">Which domain extensions are free with this offer?</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {settings.eligibleTlds.map(tld => (
                    <span key={tld} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-700 shadow-sm">
                      {tld}
                      <button onClick={() => handleRemoveTld(tld)} className="text-blue-300 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tldInput} onChange={e => setTldInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTld()} placeholder=".com" className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                  <button onClick={handleAddTld} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold hover:bg-gray-50 shadow-sm">Add</button>
                </div>
              </div>

              {/* Billing Cycles Section */}
              <div className="bg-purple-50/50 rounded-xl p-6 border border-purple-100">
                <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Clock size={16} className="text-purple-600" /> Eligible Billing Cycles
                </h4>
                <p className="text-xs text-gray-500 mb-5">Which hosting billing cycles unlock the free domain?</p>
                <div className="grid grid-cols-2 gap-3">
                  {['monthly', 'yearly', 'biennially', 'triennially'].map(cycle => (
                    <label key={cycle} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.eligibleBillingCycles.includes(cycle) ? 'bg-purple-100 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={settings.eligibleBillingCycles.includes(cycle)} onChange={() => toggleCycle(cycle)} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                      <span className="text-sm font-bold text-gray-800 capitalize">{cycle}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dates Section */}
              <div className="bg-emerald-50/50 rounded-xl p-6 border border-emerald-100 md:col-span-2">
                <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" /> Promo Validity (Optional)
                </h4>
                <p className="text-xs text-gray-500 mb-5">Leave blank for a never-ending promo, or set specific dates.</p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                    <input type="datetime-local" value={settings.startDate} onChange={e => setSettings({...settings, startDate: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                    <input type="datetime-local" value={settings.endDate} onChange={e => setSettings({...settings, endDate: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 text-sm" />
                  </div>
                </div>
              </div>

              {/* Banner Design Section */}
              <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200 md:col-span-2">
                <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Palette size={16} className="text-gray-700" /> Banner Customization
                </h4>
                <p className="text-xs text-gray-500 mb-5">Customize the announcement banner shown on the website.</p>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><Type size={14}/> Banner Text</label>
                    <input type="text" value={settings.bannerText} onChange={e => setSettings({...settings, bannerText: e.target.value})} placeholder="e.g. Eid Special: Get a FREE domain!" className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-gray-400 text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Banner Color Theme</label>
                    <div className="flex flex-wrap gap-3">
                      {gradientOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setSettings({...settings, bannerColor: opt.value})}
                          className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm border-2 transition-all bg-gradient-to-r ${opt.value} ${settings.bannerColor === opt.value ? 'border-white ring-2 ring-blue-500 scale-105' : 'border-transparent opacity-80 hover:opacity-100'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="mt-6">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Live Preview</label>
                  <div className={`w-full p-4 rounded-lg bg-gradient-to-r ${settings.bannerColor} text-white flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <GiftIcon />
                      <span className="font-bold text-sm">{settings.bannerText}</span>
                    </div>
                    <span className="px-3 py-1 bg-white text-black font-bold text-xs rounded-full">Claim</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftIcon() {
  return (
    <div className="p-2 rounded bg-white/20">
      <Sparkles size={18} className="text-white" />
    </div>
  );
}
