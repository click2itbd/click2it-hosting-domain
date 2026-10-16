import React, { useState } from 'react';
import { X, DollarSign, Cloud, Server, BarChart, HardDrive, Cpu, Activity, LayoutTemplate, Shield, Settings2, Save } from 'lucide-react';
import { cn } from '../../../../../lib/utils';

interface HostingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageForm: any;
  setPackageForm: (data: any) => void;
  onSave: (e: React.FormEvent) => void;
  isEditing: boolean;
  features: any[];
}

const HostingPlanModal: React.FC<HostingPlanModalProps> = ({
  isOpen,
  onClose,
  packageForm,
  setPackageForm,
  onSave,
  isEditing,
  features,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'cloudlinux' | 'compare'>('basic');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:px-8 flex justify-between items-center text-white">
          <div>
            <h3 className="font-black text-2xl flex items-center gap-3">
              <Server className="w-7 h-7 opacity-90" />
              {isEditing ? 'Edit Hosting Package' : 'Create New Hosting Package'}
            </h3>
            <p className="text-blue-100 text-sm mt-1 font-medium">
              Configure name, pricing, tier, and server specifications below.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex px-4 sm:px-8 bg-gray-50/50 border-b border-gray-100 gap-6">
          {[
            { id: 'basic', label: 'Basic Info & Pricing', icon: DollarSign },
            { id: 'cloudlinux', label: 'Server & Resource Limits', icon: Cpu },
            { id: 'compare', label: 'Comparison Features', icon: LayoutTemplate }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[60vh] bg-gray-50/30">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              
              {/* Core Information Section */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Settings2 size={16} />
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg">Core Information</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Package Name</label>
                    <input type="text" required value={packageForm.name} onChange={(e) => setPackageForm({...packageForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. WP Pro Turbo" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Slug / Identifier</label>
                    <input type="text" required value={packageForm.slug} onChange={(e) => setPackageForm({...packageForm, slug: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. wp-pro" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Tier / Category</label>
                    <select value={packageForm.category || 'shared'} onChange={(e) => setPackageForm({...packageForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                      <option value="shared">Shared cPanel</option>
                      <option value="wordpress">WordPress Cloud</option>
                      <option value="vps">Cloud VPS</option>
                      <option value="cloudlinux_license">CloudLinux License</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Status</label>
                    <select value={packageForm.status} onChange={(e) => setPackageForm({...packageForm, status: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                      <option value="published">🟢 Published</option>
                      <option value="draft">🟡 Draft (Hidden)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Badge Tag</label>
                    <input type="text" value={packageForm.badge || ''} onChange={(e) => setPackageForm({...packageForm, badge: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Most Popular" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Display Sort Order</label>
                    <input type="number" value={packageForm.order} onChange={(e) => setPackageForm({...packageForm, order: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Pricing Box Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <DollarSign size={16} />
                  </div>
                  <h4 className="font-black text-indigo-950 text-lg">Package Pricing (BDT)</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={40}/></div>
                    <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">Monthly Price (৳)</label>
                    <input 
                      type="number" min="0" required
                      value={packageForm.overridePrice || 0} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPackageForm({
                          ...packageForm, 
                          priceOverride: true, 
                          overridePrice: val,
                          overrideAnnualPrice: Math.round(val * 12 * 0.8)
                        });
                      }} 
                      className="w-full bg-gray-50 border-none p-3 rounded-xl text-xl font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={40}/></div>
                    <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">Annual Prepayment Price (৳)</label>
                    <input 
                      type="number" min="0" required
                      value={packageForm.overrideAnnualPrice || Math.round((packageForm.overridePrice || 0) * 12 * 0.8)} 
                      onChange={(e) => setPackageForm({...packageForm, overrideAnnualPrice: parseFloat(e.target.value) || 0})} 
                      className="w-full bg-gray-50 border-none p-3 rounded-xl text-xl font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                    <p className="text-[10px] text-gray-400 mt-2 font-medium bg-gray-50 p-1.5 rounded-lg inline-block">Default: 20% discount on 12 months</p>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 bg-white rounded-2xl cursor-pointer border border-indigo-50 hover:border-indigo-200 transition-colors shadow-sm">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={packageForm.popular || false} 
                      onChange={(e) => setPackageForm({...packageForm, popular: e.target.checked})} 
                      className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-indigo-200 checked:border-indigo-600 checked:bg-indigo-600 transition-all"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none text-white">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-indigo-900">Mark as "Most Popular" Featured Plan</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: CLOUDLINUX LIMITS */}
          {activeTab === 'cloudlinux' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl flex items-start gap-3 border border-emerald-100 mb-6">
                <Activity className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-medium">Specify detailed system resource limits and hardware allocations for this package. These reflect directly in cPanel/WHM LVE Manager.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'cpu', label: 'CPU Limit', sub: 'e.g. 200% or 4 Cores', icon: Cpu, color: 'text-blue-500' },
                  { id: 'pmem', label: 'Physical RAM', sub: 'MB / GB', icon: Server, color: 'text-purple-500' },
                  { id: 'io', label: 'IO Usage', sub: 'MB/s Limit', icon: HardDrive, color: 'text-emerald-500' },
                  { id: 'ep', label: 'Entry Processes (EP)', sub: 'Concurrent Connections', icon: Cloud, color: 'text-orange-500' },
                  { id: 'nproc', label: 'Number of Processes', sub: 'Total Processes', icon: Settings2, color: 'text-pink-500' },
                  { id: 'inodes', label: 'Inodes', sub: 'File Count Limit', icon: Shield, color: 'text-indigo-500' },
                ].map(field => (
                  <div key={field.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-1">
                      <field.icon size={16} className={cn(field.color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
                      {field.label}
                    </label>
                    <p className="text-[10px] text-gray-400 font-medium mb-3">{field.sub}</p>
                    <input 
                      type="text" 
                      value={packageForm.cloudLinuxLimits?.[field.id] || ''} 
                      onChange={(e) => setPackageForm({...packageForm, cloudLinuxLimits: {...packageForm.cloudLinuxLimits, [field.id]: e.target.value}})} 
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMPARE SPECS */}
          {activeTab === 'compare' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-blue-900 font-bold text-lg mb-1 flex items-center gap-2">
                    <BarChart size={20} /> Feature Comparison Matrix
                  </h4>
                  <p className="text-blue-700 text-sm font-medium">Define which features are included in this plan to display on the pricing tables.</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                {features.map((f, i) => (
                  <div key={f.id} className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 sm:p-5 transition-colors hover:bg-gray-50", i !== features.length - 1 && "border-b border-gray-100")}>
                    <div className="col-span-1">
                      <p className="font-bold text-gray-900 text-sm">{f.name}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{f.category}</span>
                    </div>
                    <div className="col-span-2">
                      {f.type === 'boolean' ? (
                        <div className="relative">
                          <select 
                            value={packageForm.comparisonValues?.[f.id] === undefined ? 'true' : String(packageForm.comparisonValues[f.id])} 
                            onChange={(e) => setPackageForm({...packageForm, comparisonValues: {...packageForm.comparisonValues, [f.id]: e.target.value === 'true'}})}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                          >
                            <option value="true">✅ Included</option>
                            <option value="false">❌ Not Included</option>
                          </select>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          value={packageForm.comparisonValues?.[f.id] || ''} 
                          onChange={(e) => setPackageForm({...packageForm, comparisonValues: {...packageForm.comparisonValues, [f.id]: e.target.value}})}
                          placeholder="e.g. 10 GB Pure NVMe SSD..."
                          className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer actions */}
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 rounded-b-[2rem]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 text-gray-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onSave} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save size={18} />
            {isEditing ? 'Save Changes' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostingPlanModal;
