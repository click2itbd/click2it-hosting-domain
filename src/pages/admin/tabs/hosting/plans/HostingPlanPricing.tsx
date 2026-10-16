import React from 'react';
import { Calculator, Save, HardDrive, Globe, Cpu, MemoryStick, Percent, Settings2 } from 'lucide-react';
import { cn } from '../../../../../lib/utils';

interface HostingPlanPricingProps {
  customPricing: any;
  setCustomPricing: (data: any) => void;
  handleSaveCustomPricing: (e: React.FormEvent) => void;
}

const HostingPlanPricing: React.FC<HostingPlanPricingProps> = ({
  customPricing,
  setCustomPricing,
  handleSaveCustomPricing,
}) => {
  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-3xl mb-10">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
            <Calculator className="text-white" size={24} />
          </div>
          Dynamic Custom Package Rates
        </h3>
        <p className="text-slate-500 text-sm mt-2 ml-14">
          Configure the exact unit price in BDT for custom packages designed by users on the slider builder.
        </p>
      </div>

      <form onSubmit={handleSaveCustomPricing} className="space-y-8 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <HardDrive size={16} className="text-indigo-500" /> Storage Rate (৳ / GB)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input type="number" min="0" required value={customPricing.perGbDisk} onChange={(e) => setCustomPricing({ ...customPricing, perGbDisk: parseFloat(e.target.value) || 0 })} 
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none" placeholder="50" />
            </div>
          </div>

          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Globe size={16} className="text-indigo-500" /> Addon Domain (৳ / EA)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input type="number" min="0" required value={customPricing.perWebsite} onChange={(e) => setCustomPricing({ ...customPricing, perWebsite: parseFloat(e.target.value) || 0 })} 
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none" placeholder="40" />
            </div>
          </div>

          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Cpu size={16} className="text-indigo-500" /> vCPU Core (৳ / Core)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input type="number" min="0" required value={customPricing.perCoreCpu} onChange={(e) => setCustomPricing({ ...customPricing, perCoreCpu: parseFloat(e.target.value) || 0 })} 
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none" placeholder="120" />
            </div>
          </div>

          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <MemoryStick size={16} className="text-indigo-500" /> RAM (৳ / GB)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input type="number" min="0" required value={customPricing.perGbRam} onChange={(e) => setCustomPricing({ ...customPricing, perGbRam: parseFloat(e.target.value) || 0 })} 
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none" placeholder="80" />
            </div>
          </div>

          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Settings2 size={16} className="text-indigo-500" /> Base Setup Fee (৳)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input type="number" min="0" required value={customPricing.basePrice} onChange={(e) => setCustomPricing({ ...customPricing, basePrice: parseFloat(e.target.value) || 0 })} 
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none" placeholder="100" />
            </div>
          </div>

          <div className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-100/50 transition-all duration-300">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Percent size={16} className="text-pink-500" /> Annual Discount (%)
            </label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              <input type="number" min="0" max="80" required value={customPricing.annualDiscountPercent} onChange={(e) => setCustomPricing({ ...customPricing, annualDiscountPercent: parseFloat(e.target.value) || 0 })} 
                className="w-full pr-8 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-base font-black text-slate-800 shadow-inner transition-all outline-none text-right" placeholder="20" />
            </div>
          </div>

        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100">
          <button type="submit" className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:shadow-indigo-200 hover:-translate-y-0.5 flex items-center gap-2 transition-all cursor-pointer">
            <Save size={18} /> Save Custom Rates
          </button>
        </div>
      </form>
    </div>
  );
};

export default HostingPlanPricing;
