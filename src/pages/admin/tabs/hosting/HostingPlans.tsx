import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { 
  Server, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  Settings2, 
  Database, 
  LayoutTemplate, 
  Save, 
  DollarSign, 
  Calculator, 
  RefreshCw,
  Zap,
  Globe,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Shield
} from 'lucide-react';

import { DEFAULT_HOSTING_FEATURES, DEFAULT_HOSTING_PACKAGES } from './plans/constants';
import HostingPlanModal from './plans/HostingPlanModal';
import HostingPlanList from './plans/HostingPlanList';
import HostingPlanPricing from './plans/HostingPlanPricing';

const HostingPlansTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'packages' | 'features' | 'pricing'>('packages');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string>('all');

  // State for Features
  const [features, setFeatures] = useState<any[]>(DEFAULT_HOSTING_FEATURES);
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any>(null);
  const [featureForm, setFeatureForm] = useState({ id: '', name: '', category: 'Standard Features', type: 'text', order: 0 });

  // State for Packages
  const [packages, setPackages] = useState<any[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<any[]>([]);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  // Data fetching and filtering is handled here
  useEffect(() => {
    let filtered = packages;
    if (packageCategoryFilter !== 'all') {
      filtered = packages.filter(p => (p.category || 'shared') === packageCategoryFilter);
    }
    setFilteredPackages(filtered);
  }, [packages, packageCategoryFilter]);

  // Extract unique categories for dynamic filtering
  const uniqueCategories = Array.from(new Set(packages.map(p => p.category || 'shared')));

  const [packageForm, setPackageForm] = useState({
    name: '',
    slug: '',
    category: 'shared',
    status: 'published',
    badge: '',
    popular: false,
    order: 0,
    pricing: { licenseCostUsd: 0, monthly: 150, annually: 1440, billingCycle: 'monthly' as const },
    cloudLinuxLimits: { cpu: '100', pmem: '1024', vmem: '2048', io: '10', iops: '1024', ep: '20', nproc: '100', inodes: '250000' },
    allowCustomization: false,
    comparisonValues: {} as Record<string, any>,
    priceOverride: true,
    overridePrice: 150,
    overrideAnnualPrice: 1440
  });
  const [packageModalTab, setPackageModalTab] = useState<'basic' | 'cloudlinux' | 'compare'>('basic');

  // State for Pricing
  const [customPricing, setCustomPricing] = useState({
    perGbDisk: 50,
    perWebsite: 40,
    perCoreCpu: 120,
    perGbRam: 80,
    perEmail: 2,
    perDatabase: 5,
    basePrice: 100,
    annualDiscountPercent: 20
  });

  const fetchData = async () => {
    try {
      const featSnap = await getDocs(query(collection(db, 'hosting_features'), orderBy('order', 'asc')));
      if (!featSnap.empty) {
        setFeatures(featSnap.docs.map(d => ({ docId: d.id, ...d.data() })));
      } else {
        setFeatures(DEFAULT_HOSTING_FEATURES);
      }

      const packSnap = await getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc')));
      if (!packSnap.empty) {
        const dbPlans = packSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const mergedMap = new Map();
        DEFAULT_HOSTING_PACKAGES.forEach(pkg => mergedMap.set(pkg.id, pkg));
        dbPlans.forEach(pkg => mergedMap.set(pkg.id, { ...mergedMap.get(pkg.id), ...pkg }));
        const allMerged = Array.from(mergedMap.values()).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setPackages(allMerged);

        // Auto-seed missing packages silently
        const missing = DEFAULT_HOSTING_PACKAGES.filter(p => !dbPlans.some(d => d.id === p.id));
        if (missing.length > 0) {
          missing.forEach(async (m) => {
            try {
              await setDoc(doc(db, 'hostingPlans', m.id), m, { merge: true });
            } catch (e) {}
          });
        }
      } else {
        setPackages(DEFAULT_HOSTING_PACKAGES);
        DEFAULT_HOSTING_PACKAGES.forEach(async (pkg) => {
          try {
            await setDoc(doc(db, 'hostingPlans', pkg.id), pkg, { merge: true });
          } catch (e) {}
        });
      }

      const pricingSnap = await getDoc(doc(db, 'settings', 'custom_hosting_pricing'));
      if (pricingSnap.exists()) {
        setCustomPricing(pricingSnap.data() as any);
      } else {
        const legacySnap = await getDoc(doc(db, 'custom_hosting_pricing', 'global_pricing'));
        if (legacySnap.exists()) {
          setCustomPricing(legacySnap.data() as any);
        }
      }
    } catch (error) {
      console.error('Error fetching hosting data:', error);
      toast.error('Failed to load hosting data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculatePlanPrice = (plan: any) => {
    if (!plan) return { monthly: 0, annually: 0, isOverridden: false };
    
    if (plan.priceOverride && plan.overridePrice > 0) {
      return { 
        monthly: plan.overridePrice, 
        annually: plan.overrideAnnualPrice || Math.round(plan.overridePrice * 12 * 0.8), 
        isOverridden: true 
      };
    }

    const licenseCostUsd = plan.pricing?.licenseCostUsd || 0;
    const exchangeRate = settings.apiSettings?.usdToBdtRate || settings.usdToBdtRate || 120;
    const markupPercent = settings.apiSettings?.hostingMarkupPercent || settings.hostingMarkupPercent || 35;
    
    const calculatedMonthly = Math.round(licenseCostUsd * exchangeRate * (1 + markupPercent / 100));
    const calculatedAnnually = Math.round(calculatedMonthly * 12 * 0.8);
    
    return { monthly: calculatedMonthly, annually: calculatedAnnually, isOverridden: false };
  };

  // --- FEATURE HANDLERS ---
  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFeature) {
        await updateDoc(doc(db, 'hosting_features', editingFeature.docId), featureForm);
        toast.success('Feature updated');
      } else {
        await setDoc(doc(db, 'hosting_features', featureForm.id), featureForm);
        toast.success('Feature added');
      }
      setIsAddingFeature(false);
      setEditingFeature(null);
      setFeatureForm({ id: '', name: '', category: 'Standard Features', type: 'text', order: 0 });
      fetchData();
    } catch (error) {
      toast.error('Failed to save feature');
    }
  };

  const handleDeleteFeature = async (id: string) => {
    if (window.confirm('Delete this feature?')) {
      await deleteDoc(doc(db, 'hosting_features', id));
      toast.success('Deleted');
      fetchData();
    }
  };

  // --- PACKAGE HANDLERS ---
  const handleSeedPackages = async () => {
    try {
      toast.loading('Syncing all 13 hosting packages...', { id: 'seed' });
      for (const feat of DEFAULT_HOSTING_FEATURES) {
        await setDoc(doc(db, 'hosting_features', feat.id), feat, { merge: true });
      }
      for (const pkg of DEFAULT_HOSTING_PACKAGES) {
        await setDoc(doc(db, 'hostingPlans', pkg.id), pkg, { merge: true });
      }
      toast.success('All 13 packages synchronized with live database!', { id: 'seed' });
      fetchData();
    } catch (error) {
      toast.error('Failed to sync packages', { id: 'seed' });
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const packageData = {
        ...packageForm,
        category: packageForm.category || 'shared',
        pricing: {
          ...packageForm.pricing,
          monthly: packageForm.priceOverride ? packageForm.overridePrice : packageForm.pricing.monthly,
          annually: packageForm.priceOverride ? packageForm.overrideAnnualPrice : packageForm.pricing.annually
        }
      };

      if (editingPackage) {
        await updateDoc(doc(db, 'hostingPlans', editingPackage.id), packageData);
        toast.success('Package updated successfully!');
      } else {
        const customId = packageForm.slug ? `plan_${packageForm.slug}` : `plan_${Date.now()}`;
        await setDoc(doc(db, 'hostingPlans', customId), packageData);
        toast.success('Package created successfully!');
      }
      setIsAddingPackage(false);
      setEditingPackage(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      await deleteDoc(doc(db, 'hostingPlans', id));
      toast.success('Package deleted');
      fetchData();
    }
  };

  const handleSaveCustomPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'custom_hosting_pricing'), customPricing, { merge: true });
      await setDoc(doc(db, 'custom_hosting_pricing', 'global_pricing'), customPricing, { merge: true });
      toast.success('Custom hosting unit rates updated successfully!');
    } catch (error) {
      console.error('Error saving custom pricing:', error);
      toast.error('Failed to update custom rates');
    }
  };


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Server className="text-blue-600" />
            Hosting Package Control Hub
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage cPanel Hosting, WordPress Cloud Turbo, Cloud VPS Servers, and Custom Resource rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedPackages}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all shadow-sm cursor-pointer"
            title="Seed all 13 canonical packages to database"
          >
            <RefreshCw size={14} /> Sync All 13 Packages
          </button>

          <button
            onClick={() => {
              setEditingPackage(null);
              setPackageForm({
                name: '',
                slug: '',
                category: packageCategoryFilter === 'all' ? 'shared' : packageCategoryFilter,
                status: 'published',
                badge: '',
                popular: false,
                order: packages.length + 1,
                pricing: { licenseCostUsd: 0, monthly: 200, annually: 1920, billingCycle: 'monthly' },
                cloudLinuxLimits: { cpu: '100', pmem: '1024', vmem: '2048', io: '10', iops: '1024', ep: '20', nproc: '100', inodes: '250000' },
                allowCustomization: false,
                comparisonValues: {},
                priceOverride: true,
                overridePrice: 200,
                overrideAnnualPrice: 1920
              });
              setIsAddingPackage(true);
              setPackageModalTab('basic');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={15} /> Add New Package
          </button>
        </div>
      </div>

      {/* Main SubTabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('packages')}
          className={cn(
            "pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
            activeSubTab === 'packages'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          <Layers size={16} /> Hosting Packages ({packages.length})
        </button>

        <button
          onClick={() => setActiveSubTab('pricing')}
          className={cn(
            "pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
            activeSubTab === 'pricing'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          <Calculator size={16} /> Custom Package Rates (৳/GB)
        </button>

        <button
          onClick={() => setActiveSubTab('features')}
          className={cn(
            "pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
            activeSubTab === 'features'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          <Settings2 size={16} /> Comparison Features ({features.length})
        </button>
      </div>

      {/* SUBTAB 1: PACKAGES LIST & CATEGORY CONTROLLER */}
      {activeSubTab === 'packages' && (
        <HostingPlanList
          packages={packages}
          filteredPackages={filteredPackages}
          uniqueCategories={uniqueCategories}
          packageCategoryFilter={packageCategoryFilter}
          setPackageCategoryFilter={setPackageCategoryFilter}
          calculatePlanPrice={calculatePlanPrice}
          setEditingPackage={setEditingPackage}
          setPackageForm={setPackageForm}
          setIsAddingPackage={setIsAddingPackage}
          setPackageModalTab={setPackageModalTab}
          handleDeletePackage={handleDeletePackage}
        />
      )}

      {/* SUBTAB 2: CUSTOM PACKAGE RATES FORM */}
      {activeSubTab === 'pricing' && (
        <HostingPlanPricing
          customPricing={customPricing}
          setCustomPricing={setCustomPricing}
          handleSaveCustomPricing={handleSaveCustomPricing}
        />
      )}

      {/* SUBTAB 3: COMPARISON FEATURES */}
      {activeSubTab === 'features' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Compare Table Features</h3>
              <p className="text-xs text-gray-500">Configure the rows shown in the public plan comparison table.</p>
            </div>
            <button 
              onClick={() => { setIsAddingFeature(true); setEditingFeature(null); }} 
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center hover:bg-blue-700 shadow-md cursor-pointer"
            >
              <Plus size={15} className="mr-1.5" /> Add Feature
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-xs font-bold text-gray-700">Order</th>
                  <th className="p-3 text-xs font-bold text-gray-700">ID</th>
                  <th className="p-3 text-xs font-bold text-gray-700">Name</th>
                  <th className="p-3 text-xs font-bold text-gray-700">Category</th>
                  <th className="p-3 text-xs font-bold text-gray-700">Type</th>
                  <th className="p-3 text-xs font-bold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {features.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-400">{f.order}</td>
                    <td className="p-3 font-mono text-gray-600">{f.id}</td>
                    <td className="p-3 font-bold text-gray-900">{f.name}</td>
                    <td className="p-3 text-gray-600">{f.category}</td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", f.type === 'boolean' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                        {f.type}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => { setEditingFeature(f); setFeatureForm(f); setIsAddingFeature(true); }} className="text-blue-600 hover:text-blue-800 p-1 mr-2"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteFeature(f.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Modal */}
      {isAddingFeature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-base">{editingFeature ? 'Edit Feature' : 'Add Feature'}</h3>
              <button onClick={() => setIsAddingFeature(false)}><X size={18} className="text-gray-500 hover:text-red-500" /></button>
            </div>
            <form onSubmit={handleSaveFeature} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Feature ID (e.g. disk_space)</label>
                <input type="text" required disabled={!!editingFeature} value={featureForm.id} onChange={(e) => setFeatureForm({...featureForm, id: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
                <input type="text" required value={featureForm.name} onChange={(e) => setFeatureForm({...featureForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                <select value={featureForm.category} onChange={(e) => setFeatureForm({...featureForm, category: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option>Standard Features</option><option>CloudLinux Limits</option><option>Email & DB</option><option>Security</option><option>Server</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                <select value={featureForm.type} onChange={(e) => setFeatureForm({...featureForm, type: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="text">Text (e.g. 10 GB NVMe)</option><option value="boolean">Boolean (Yes/No Icon)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Order</label>
                <input type="number" required value={featureForm.order} onChange={(e) => setFeatureForm({...featureForm, order: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer">Save Feature</button>
            </form>
          </div>
        </div>
      )}

      {/* Package Edit/Add Modal */}
      <HostingPlanModal isOpen={isAddingPackage} onClose={() => setIsAddingPackage(false)} packageForm={packageForm} setPackageForm={setPackageForm} onSave={handleSavePackage} isEditing={!!editingPackage} features={features} />
    </div>);
};

export default HostingPlansTab;
