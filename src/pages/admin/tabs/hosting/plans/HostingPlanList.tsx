import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { cn } from '../../../../../lib/utils';

interface HostingPlanListProps {
  packages: any[];
  filteredPackages: any[];
  uniqueCategories: string[];
  packageCategoryFilter: string;
  setPackageCategoryFilter: (category: string) => void;
  calculatePlanPrice: (plan: any) => { monthly: number; annually: number; isOverridden: boolean };
  setEditingPackage: (plan: any) => void;
  setPackageForm: (form: any) => void;
  setIsAddingPackage: (val: boolean) => void;
  setPackageModalTab: (tab: 'basic' | 'cloudlinux' | 'compare') => void;
  handleDeletePackage: (id: string) => void;
}

const HostingPlanList: React.FC<HostingPlanListProps> = ({
  packages,
  filteredPackages,
  uniqueCategories,
  packageCategoryFilter,
  setPackageCategoryFilter,
  calculatePlanPrice,
  setEditingPackage,
  setPackageForm,
  setIsAddingPackage,
  setPackageModalTab,
  handleDeletePackage,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPackageCategoryFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              packageCategoryFilter === 'all'
                ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            All Packages ({packages.length})
          </button>

          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setPackageCategoryFilter(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 capitalize",
                packageCategoryFilter === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {cat === 'shared' ? 'Shared cPanel' : cat === 'wordpress' ? 'WP Cloud' : cat === 'cloudlinux_license' ? 'CloudLinux OS' : 'Cloud VPS'} 
              <span className="opacity-70 ml-1">({packages.filter(p => (p.category || 'shared') === cat).length})</span>
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-2 rounded-lg">
          Showing <strong className="text-gray-900">{filteredPackages.length}</strong> active plans
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((p) => {
          const calculated = calculatePlanPrice(p);
          const cat = p.category || 'shared';

          return (
            <div 
              key={p.id} 
              className={cn(
                "bg-white rounded-3xl p-6 relative group transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between",
                p.popular ? "border-2 border-blue-500 shadow-xl shadow-blue-500/10" : "border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200"
              )}
            >
              {/* Popular Badge */}
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-md shadow-blue-500/30 z-20">
                  Most Popular
                </div>
              )}

              {/* Actions Top Right */}
              <div className="absolute top-4 right-4 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={() => { 
                    setEditingPackage(p); 
                    setPackageForm({ 
                      name: p.name || '', 
                      slug: p.slug || '', 
                      category: p.category || 'shared',
                      status: p.status || 'published', 
                      badge: p.badge || '',
                      popular: p.popular || false,
                      order: p.order || 0, 
                      pricing: p.pricing || { licenseCostUsd: 0, monthly: 0, annually: 0, billingCycle: 'monthly' }, 
                      cloudLinuxLimits: p.cloudLinuxLimits || { cpu: '100', pmem: '1024', vmem: '2048', io: '10', iops: '1024', ep: '20', nproc: '100', inodes: '250000' }, 
                      allowCustomization: p.allowCustomization || false, 
                      comparisonValues: p.comparisonValues || {}, 
                      priceOverride: p.priceOverride || false, 
                      overridePrice: p.overridePrice || 0,
                      overrideAnnualPrice: p.overrideAnnualPrice || 0
                    }); 
                    setIsAddingPackage(true); 
                    setPackageModalTab('basic'); 
                  }} 
                  className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-colors cursor-pointer shadow-sm"
                  title="Edit Package"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDeletePackage(p.id)} 
                  className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-colors cursor-pointer shadow-sm"
                  title="Delete Package"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2">
                {/* Category & Status Badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className={cn(
                    "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider",
                    cat === 'shared' ? "bg-blue-50 text-blue-700" :
                    cat === 'wordpress' ? "bg-purple-50 text-purple-700" :
                    cat === 'cloudlinux_license' ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                  )}>
                    {cat === 'shared' ? 'Shared cPanel' : cat === 'wordpress' ? 'WP Cloud Turbo' : cat === 'cloudlinux_license' ? 'CloudLinux OS' : 'Cloud VPS'}
                  </span>

                  {p.badge && (
                    <span className="text-[10px] font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                      {p.badge}
                    </span>
                  )}
                </div>

                <h4 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">{p.name}</h4>
                
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">৳{calculated.monthly.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">/ mo</span>
                </div>

                <div className="text-xs text-emerald-600 font-bold mb-6 bg-emerald-50 inline-block px-2.5 py-1 rounded-md">
                  ৳{calculated.annually.toLocaleString()} / yr (Discounted)
                </div>

                {/* Specs Preview Box */}
                <div className="space-y-3 text-sm text-gray-600 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-6">
                  {p.comparisonValues?.disk_space && (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-gray-500 w-24">Storage</span>
                      <strong className="text-gray-900 truncate">{p.comparisonValues.disk_space}</strong>
                    </div>
                  )}
                  {p.comparisonValues?.bandwidth && (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <span className="text-gray-500 w-24">Bandwidth</span>
                      <strong className="text-gray-900 truncate">{p.comparisonValues.bandwidth}</strong>
                    </div>
                  )}
                  {p.comparisonValues?.addon_domains && (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-gray-500 w-24">Websites</span>
                      <strong className="text-gray-900 truncate">{p.comparisonValues.addon_domains}</strong>
                    </div>
                  )}
                  {p.cloudLinuxLimits && (
                    <div className="flex items-center gap-3 pt-3 mt-1 border-t border-gray-200/60">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      <span className="text-gray-500 w-24">Resources</span>
                      <strong className="text-indigo-700 truncate">CPU {p.cloudLinuxLimits.cpu}% | RAM {p.cloudLinuxLimits.pmem}MB</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Sort Order: {p.order || 0}</span>
                <span className={cn("flex items-center gap-1.5", p.status === 'published' ? "text-emerald-600" : "text-amber-500")}>
                  <span className={cn("w-2 h-2 rounded-full", p.status === 'published' ? "bg-emerald-500" : "bg-amber-500")}></span>
                  {p.status || 'published'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HostingPlanList;
