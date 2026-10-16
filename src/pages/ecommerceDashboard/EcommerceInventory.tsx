import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product, NavigationMenu } from '../../types';
import { Eye, Package, Plus, Search, Edit2, Trash2, X, Upload, Save, XCircle, Sparkles, Link as LinkIcon, Image as ImageIcon, Loader2, DollarSign, AlertCircle, AlertTriangle, CheckSquare, Filter, ArrowUpDown, Tag, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import { db, storage } from '../../firebase';
import { collection, addDoc, updateDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { logAudit } from '../../lib/audit';

interface EcommerceInventoryProps {
  products: Product[];
  menus: NavigationMenu[];
  handleDeleteProduct: (id: string) => Promise<void>;
  fetchData: () => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export const EcommerceInventory: React.FC<EcommerceInventoryProps> = ({
  products,
  menus,
  handleDeleteProduct,
  fetchData,
  setActiveTab
}) => {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [sortBy, setSortBy] = useState('newest');
  const [brands, setBrands] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'url' | 'image'>('url');
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const totalValue = products.reduce((acc, p) => acc + (((p as any).costPrice ?? p.price ?? 0) * (p.stock || 0)), 0);
  const lowStockCount = products.filter(p => !p.isOutOfStock && p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length;
  const outOfStockCount = products.filter(p => p.isOutOfStock || p.stock === 0).length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(filteredProducts.map(p => p.id!));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!await confirm({ title: 'Confirmation', message: `Are you sure you want to delete ${selectedProducts.length} selected products?`, isDestructive: true })) return;
    try {
      for (const id of selectedProducts) {
        await handleDeleteProduct(id);
      }
      toast.success('Selected products deleted');
      setSelectedProducts([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete some products');
    }
  };

  
  const initialForm: Partial<Product> = {
    name: '', sku: '', description: '', price: 0, stock: 0, isOutOfStock: false, category: '', images: []
  };
  const [formData, setFormData] = useState<Partial<Product>>(initialForm);
  const [specTemplates, setSpecTemplates] = useState<any[]>([]);
  const [bulkSpecInput, setBulkSpecInput] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'specificationTemplates')).then(snap => {
      setSpecTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    getDocs(collection(db, 'brands')).then(snap => {
      setBrands(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    if (formData.category && (!formData.specs || Object.keys(formData.specs).length === 0)) {
      const cat = formData.category;
      const matchedTemplate = specTemplates.find(t => cat.toLowerCase().includes(t.category.toLowerCase()));
      
      if (matchedTemplate) {
        const newSpecs: Record<string, string> = {};
        matchedTemplate.fields.forEach((f: any) => {
          newSpecs[f.label] = f.type === 'boolean' ? 'false' : '';
        });
        setFormData((prev: any) => ({ ...prev, specs: newSpecs }));
      }
    }
  }, [formData.category, specTemplates]);

  const addSpec = () => {
    const newSpecs = { ...(formData.specs || {}) };
    let keyName = "New Attribute";
    let counter = 1;
    while(newSpecs[keyName]) {
        keyName = "New Attribute " + counter;
        counter++;
    }
    newSpecs[keyName] = '';
    setFormData({ ...formData, specs: newSpecs });
  };

  const updateSpec = (key: string, value: string) => {
    const newSpecs = { ...formData.specs };
    newSpecs[key] = value;
    setFormData({ ...formData, specs: newSpecs });
  };

  const removeSpec = (key: string) => {
    const newSpecs = { ...formData.specs };
    delete newSpecs[key];
    setFormData({ ...formData, specs: newSpecs });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesCategory = categoryFilter === 'all';
    if (!matchesCategory) {
      const menu = menus.find(m => m.id === categoryFilter);
      matchesCategory = product.category === categoryFilter || (menu && product.category === menu.name);
    }

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = !product.isOutOfStock && (product.stock || 0) > 0;
    else if (stockFilter === 'low_stock') matchesStock = !product.isOutOfStock && (product.stock || 0) > 0 && (product.stock || 0) < (product.lowStockThreshold || 10);
    else if (stockFilter === 'out_of_stock') matchesStock = product.isOutOfStock || (product.stock || 0) === 0;

    let matchesBrand = brandFilter === 'all' || product.brand === brandFilter;

    return matchesSearch && matchesCategory && matchesStock && matchesBrand;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      const tA = (a.createdAt as any)?.toMillis?.() || a.createdAt || 0;
      const tB = (b.createdAt as any)?.toMillis?.() || b.createdAt || 0;
      return tB - tA;
    }
    if (sortBy === 'oldest') {
      const tA = (a.createdAt as any)?.toMillis?.() || a.createdAt || 0;
      const tB = (b.createdAt as any)?.toMillis?.() || b.createdAt || 0;
      return tA - tB;
    }
    if (sortBy === 'price_desc') return (b.price || (b as any).costPrice || 0) - (a.price || (a as any).costPrice || 0);
    if (sortBy === 'price_asc') return (a.price || (a as any).costPrice || 0) - (b.price || (b as any).costPrice || 0);
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
    return a.name.localeCompare(b.name);
  });

  const handleSmartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (importTab === 'image') {
      toast.error('Image scanning requires an active AI Vision API key (Gemini/OpenAI). This feature is currently in demo mode.');
      return;
    }

    if (importTab === 'url' && !importUrl) return toast.error('Please enter a valid URL');
    
    setImportLoading(true);
    
    try {
      // Use a CORS proxy to fetch the HTML content
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(importUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const htmlText = await response.text();
      const data = { contents: htmlText };

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');

      // Extract metadata
      const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title')?.innerText || 'Unknown Product';
      const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      
      // Try to find a price (very basic heuristic)
      let price = 0;
      const priceMeta = doc.querySelector('meta[property="product:price:amount"]');
      if (priceMeta) {
        price = parseFloat(priceMeta.getAttribute('content') || '0');
      } else {
        // Look for common price classes
        const priceElement = doc.querySelector('.price, .amount, [class*="price"]');
        if (priceElement) {
          const priceText = priceElement.textContent?.replace(/[^0-9.]/g, '') || '0';
          price = parseFloat(priceText);
        }
      }

      setImportLoading(false);
      setIsImportModalOpen(false);
      
      setEditingId(null);
      setFormData({
        name: title.trim(),
        category: menus[0]?.id || "electronics", 
        price: price || 0,
        stock: 10,
        sku: "IMPORT-" + Math.floor(Math.random() * 10000),
        images: image ? [image] : [],
        description: description.trim(),
        isOutOfStock: false,
        specs: {}
      });
      setIsModalOpen(true);
      toast.success('Product details extracted successfully!');
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to extract data from this URL. The site might be blocking requests.');
      setImportLoading(false);
    }
  };
  
  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
    setIsModalOpen(true);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && products.length > 0) {
      const p = products.find(prod => prod.id === editId);
      if (p) {
        openEditModal(p);
        // Clear the param so it doesn't reopen on refresh
        searchParams.delete('edit');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, products]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price === undefined || formData.stock === undefined) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      // Find category name
      const categoryName = menus.find(m => m.id === formData.category)?.name || '';
      
      const productData = {
        ...formData,
        category: categoryName,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
        await logAudit(
          'EDIT',
          'Product',
          `Updated product: "${formData.name}" via E-Commerce Admin (Price: ৳${formData.price}, Stock: ${formData.stock})`,
          user?.displayName || user?.email || 'Admin',
          {
            entityId: editingId,
            newState: { name: formData.name, price: formData.price, stock: formData.stock }
          }
        );
        toast.success('Product updated successfully!');
      } else {
        const newDocRef = await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString()
        });
        await logAudit(
          'CREATE',
          'Product',
          `Added new product: "${formData.name}" via E-Commerce Admin (Price: ৳${formData.price}, Stock: ${formData.stock})`,
          user?.displayName || user?.email || 'Admin',
          {
            entityId: newDocRef.id,
            newState: { name: formData.name, price: formData.price, stock: formData.stock }
          }
        );
        toast.success('Product added successfully!');
      }
      
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const loadingToast = toast.loading('Uploading image...');
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', null, 
        (error) => { toast.error('Upload failed'); toast.dismiss(loadingToast); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
          toast.success('Image uploaded!');
          toast.dismiss(loadingToast);
        }
      );
    } catch (error) {
      toast.error('Failed to upload image');
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Product Catalog
            <span className="text-sm font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{filteredProducts.length}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage your store products and inventory levels.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Sparkles size={18} className="text-purple-100" /> AI Smart Import
          </button>
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Add Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Products</p>
            <p className="text-2xl font-black text-gray-900">{products.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Inventory Value</p>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(totalValue, settings)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Low Stock</p>
            <p className="text-2xl font-black text-gray-900">{lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Out of Stock</p>
            <p className="text-2xl font-black text-gray-900">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white font-medium text-slate-700 min-w-[140px]"
              >
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            
            <div className="relative" ref={brandDropdownRef}>
              <div 
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium text-slate-700 min-w-[140px] cursor-pointer flex items-center justify-between"
              >
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <span className="truncate max-w-[100px]">{brandFilter === 'all' ? 'All Brands' : brandFilter}</span>
                <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isBrandDropdownOpen ? 'rotate-90' : ''}`} size={14} />
              </div>
              
              {isBrandDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-[320px] bg-white border border-gray-100 shadow-xl rounded-xl z-50 p-3 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setBrandFilter('all'); setIsBrandDropdownOpen(false); }}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${brandFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      All Brands
                    </button>
                    {brands.map((b: any) => (
                      <button
                        key={b.id || b.name}
                        onClick={() => { setBrandFilter(b.name); setIsBrandDropdownOpen(false); }}
                        className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors truncate ${brandFilter === b.name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                        title={b.name}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white font-medium text-slate-700 min-w-[160px]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="stock_desc">Stock: High to Low</option>
                <option value="stock_asc">Stock: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 my-1"></div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap shrink-0">Filter by Category:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              categoryFilter === 'all' 
                ? "bg-gray-900 text-white shadow-md" 
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {menus.map(menu => (
            <button
              key={menu.id}
              onClick={() => setCategoryFilter(menu.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                categoryFilter === menu.id 
                  ? "bg-gray-900 text-white shadow-md" 
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {menu.name}
            </button>
          ))}
        </div>
      </div>
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-100 animate-in fade-in shrink-0">
            <span className="text-sm font-bold">{selectedProducts.length} selected</span>
            <button 
              onClick={handleBulkDelete}
              className="text-sm font-bold bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        )}


      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Price</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Stock</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product, index) => (
                <tr key={product.id} className={`hover:bg-blue-50/40 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${selectedProducts.includes(product.id!) ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedProducts.includes(product.id!)}
                      onChange={() => handleSelectProduct(product.id!)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {product.images?.[0] ? (
                        <div className="w-14 h-14 shrink-0 rounded-lg border border-slate-200 shadow-sm bg-white overflow-hidden p-1 flex items-center justify-center">
                          <img src={product.images[0]} alt={product.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                          <Package size={24} />
                        </div>
                      )}
                      <div className="max-w-[250px]">
                        <p className="text-sm font-bold text-slate-900 truncate" title={product.name}>{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-mono font-medium border border-slate-300 shadow-sm">SKU: {product.sku || 'N/A'}</span>
                          {product.brand && <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-200">{product.brand}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {menus.find(m => m.id === product.category)?.name || product.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end justify-center h-full">
                      <span className="text-[15px] font-black text-emerald-700">{formatCurrency(product.discountPrice || product.price, settings)}</span>
                      {product.discountPrice && product.discountPrice < product.price && (
                        <span className="text-xs text-slate-400 line-through mt-0.5 font-medium">{formatCurrency(product.price, settings)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {product.isOutOfStock ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200 shadow-sm">
                        OUT OF STOCK
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        product.stock > (product.lowStockThreshold || 5) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        product.stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {product.stock} in stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => window.open(`/product/${product.id}`, '_blank')} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="View in Store">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openEditModal(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Edit Product">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={async () => { if(await confirm({ title: 'Confirmation', message: 'Delete product?', isDestructive: true })) handleDeleteProduct(product.id!); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete Product">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package size={48} className="mb-4 text-slate-300" />
                      <p className="text-lg font-bold text-slate-500">No products found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                AI Product Importer
              </h3>
              <button onClick={() => !importLoading && setIsImportModalOpen(false)} className="p-2 hover:bg-white/50 rounded-lg text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  onClick={() => setImportTab('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${importTab === 'url' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LinkIcon size={16} /> Import from URL
                </button>
                <button 
                  onClick={() => setImportTab('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${importTab === 'image' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ImageIcon size={16} /> Scan Image
                </button>
              </div>

              <form onSubmit={handleSmartImport}>
                {importTab === 'url' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Paste an Amazon, AliExpress, or other supported product URL. AI will extract images, title, price, and description.</p>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Product URL</label>
                      <input 
                        type="url" 
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                        placeholder="https://www.amazon.com/dp/B0863TXGM3" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                        required={importTab === 'url'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Upload a picture of any product. Our Vision AI will scan the image, identify the product, and fetch its market details automatically.</p>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer group">
                      <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={28} />
                      </div>
                      <p className="font-bold text-slate-700 mb-1">Click to upload product image</p>
                      <p className="text-xs text-slate-500">Supports JPG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={importLoading}
                  className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {importLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Scanning & Fetching Details...
                    </>
                  ) : (
                    <>
                      {importTab === 'url' ? 'Fetch Product Data' : 'Scan Image with AI'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 text-lg">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="product-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="col-span-2 md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                      <input type="number" required min="0" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                      <input type="number" required min="0" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>

                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Category</option>
                      {menus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input type="text" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price</label>
                      <input type="number" min="0" value={formData.discountPrice || ''} onChange={e => setFormData({...formData, discountPrice: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <input type="text" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                      <select value={formData.condition || 'new'} onChange={e => setFormData({...formData, condition: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="new">New (Default)</option>
                        <option value="used">Used / Pre-Owned</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Months)</label>
                      <input type="number" min="0" value={formData.warrantyMonths || ''} onChange={e => setFormData({...formData, warrantyMonths: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 mt-6 rounded-lg border border-gray-200 w-full h-[42px]">
                        <input type="checkbox" checked={formData.hasSerialTracking || false} onChange={e => setFormData({...formData, hasSerialTracking: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        Enable Serial Tracking
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-red-700 cursor-pointer bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                      <input type="checkbox" checked={formData.isOutOfStock || false} onChange={e => setFormData({...formData, isOutOfStock: e.target.checked})} className="rounded border-red-300 text-red-600 focus:ring-red-500" />
                      Out of Stock
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-purple-700 cursor-pointer bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                      <input type="checkbox" checked={formData.isBundle || false} onChange={e => setFormData({...formData, isBundle: e.target.checked})} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                      Is Bundle Product
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.showInStore !== false} onChange={e => setFormData({...formData, showInStore: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Show in Store
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isFeatured || false} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Featured Product
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isExclusiveDeal || false} onChange={e => setFormData({...formData, isExclusiveDeal: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Exclusive Deal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isFreeShipping || false} onChange={e => setFormData({...formData, isFreeShipping: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Free Shipping
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isNewArrival || false} onChange={e => setFormData({...formData, isNewArrival: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      New Arrival
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isBestSeller || false} onChange={e => setFormData({...formData, isBestSeller: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Best Seller
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isFlashSale || false} onChange={e => setFormData({...formData, isFlashSale: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Flash Sale
                    </label>
                  </div>
                </div>
                
                <div className="col-span-2 md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {formData.images?.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                          <img src={url} alt="Product" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setFormData({...formData, images: formData.images?.filter((_, index) => index !== i)})} className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-500 transition-colors cursor-pointer">
                        <Upload size={20} className="mb-1" />
                        <span className="text-xs font-medium">Upload</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={5} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                  </div>
                </div>
                

                  <div className="col-span-2 pt-4 mt-4 border-t border-gray-100">
                    {/* Specifications */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Specifications</h4>
                        <button
                          type="button"
                          onClick={addSpec}
                          className="text-[11px] bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Custom Spec
                        </button>
                      </div>
<div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 mt-2">
                          <label className="block text-[11px] font-bold text-blue-800 mb-1.5 uppercase">Quick Paste Specs (Key: Value)</label>
                          <div className="flex gap-2 items-start">
                            <textarea 
                              value={bulkSpecInput}
                              onChange={e => setBulkSpecInput(e.target.value)}
                              placeholder="e.g. Processor: Intel i5
RAM: 16GB
Storage: 512GB SSD"
                              className="flex-1 px-3 py-2 border border-blue-200 rounded-md focus:ring-blue-500 text-sm bg-white min-h-[60px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
    // Split by newline or comma
    
      let items = [];
      if (bulkSpecInput.includes('\n')) {
        items = bulkSpecInput.split('\n').map(s => s.trim()).filter(s => s);
      } else {
        items = bulkSpecInput.split(',').map(s => s.trim()).filter(s => s);
      }
    if (items.length > 0) {
      const newSpecs = { ...(formData.specs || {}) };
      items.forEach(item => {
        // Try to split by colon, dash, or equals to extract Key and Value
        const match = item.match(/^(.*?)\s*[:\-=]\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          newSpecs[key] = val; // Always overwrite if they pasted a value
        } else {
          // No value found, just create the field if it doesn't exist
          if (newSpecs[item] === undefined) newSpecs[item] = '';
        }
      });
      setFormData({ ...formData, specs: newSpecs });
      setBulkSpecInput('');
    }
  }}
                              className="bg-blue-600 text-white px-3 py-2 rounded-md font-bold text-xs hover:bg-blue-700 h-[60px]"
                            >
                              Add Fields
                            </button>
                          </div>
                        </div>
                      
                      <div className="space-y-4">
                        {(() => {
                          const cat = formData.category || '';
                          const matchedTemplate = specTemplates.find(t => cat.toLowerCase().includes(t.category.toLowerCase()));
                          const templateFields = matchedTemplate?.fields || [];
                          const templateFieldLabels = templateFields.map((f: any) => f.label);
                          
                          const customSpecEntries = Object.entries(formData.specs || {}).filter(([k]) => !templateFieldLabels.includes(k));

                          return (
                            <>
                              {templateFields.length > 0 && (
                                <div className="space-y-3">
                                  {templateFields.map((field: any) => (
                                    <div key={field.label} className="flex gap-2 items-center">
                                      <label className="w-1/3 text-sm font-bold text-slate-700">{field.label}</label>
                                      {field.type === 'select' ? (
                                        <select
                                          value={(formData.specs || {})[field.label] || ''}
                                          onChange={e => updateSpec(field.label, e.target.value)}
                                          className="flex-1 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">Select {field.label}</option>
                                          {field.options?.map((opt: string) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      ) : field.type === 'boolean' ? (
                                        <input
                                          type="checkbox"
                                          checked={(formData.specs || {})[field.label] === 'true'}
                                          onChange={e => updateSpec(field.label, e.target.checked ? 'true' : 'false')}
                                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={(formData.specs || {})[field.label] || ''}
                                          onChange={e => updateSpec(field.label, e.target.value)}
                                          placeholder={`Enter ${field.label}`}
                                          className="flex-1 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {customSpecEntries.length > 0 && (
                                <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                                  {customSpecEntries.map(([key, value], index) => (
                                    <div key={index} className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Property (e.g. Color)"
                                        value={key}
                                        onChange={e => {
                                          const newSpecs = { ...formData.specs };
                                          delete newSpecs[key];
                                          newSpecs[e.target.value] = value as string;
                                          setFormData({ ...formData, specs: newSpecs });
                                        }}
                                        className="w-1/3 text-sm font-bold border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Value"
                                        value={value as string}
                                        onChange={e => updateSpec(key, e.target.value)}
                                        className="flex-1 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeSpec(key)}
                                        className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {templateFields.length === 0 && customSpecEntries.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                  <p className="text-xs text-slate-400 font-bold mb-3">No technical specifications added.</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cat = formData.category || '';
                                        const t = specTemplates.find(x => cat.toLowerCase().includes(x.category.toLowerCase()));
                                        if (t) {
                                          const newSpecs: Record<string, string> = {};
                                          t.fields.forEach((f: any) => newSpecs[f.label] = f.type === 'boolean' ? 'false' : '');
                                          setFormData({ ...formData, specs: newSpecs });
                                          toast.success('Template loaded');
                                        } else {
                                          toast.error('No template found for this category');
                                        }
                                      }}
                                      className="text-[11px] bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-all mx-auto flex items-center gap-2"
                                    >
                                      <Plus size={14} /> Auto-Fill Template
                                    </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 pt-4 mt-2 border-t border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3">Offers & Linking (FBT / Bundle)</h3>
                    
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-purple-700 cursor-pointer bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                        <input type="checkbox" checked={formData.isBundle || false} onChange={e => setFormData({...formData, isBundle: e.target.checked})} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                        Is Dedicated Bundle Product
                      </label>
                    </div>

                    {formData.isBundle && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-4">
                        <label className="block text-sm font-bold text-purple-800 mb-2">Bundle Items</label>
                        <div className="max-h-40 overflow-y-auto space-y-2 bg-white p-2 rounded border border-purple-100">
                          {products.filter(p => p.id !== formData.id && !p.isBundle).map(p => (
                            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input 
                                type="checkbox" 
                                checked={(formData.bundleItems || []).some(bi => bi.productId === p.id)}
                                onChange={(e) => {
                                  const current = formData.bundleItems || [];
                                  if (e.target.checked) {
                                    setFormData({...formData, bundleItems: [...current, { productId: p.id, quantity: 1 }]});
                                  } else {
                                    setFormData({...formData, bundleItems: current.filter(bi => bi.productId !== p.id)});
                                  }
                                }}
                              />
                              <img src={p.images?.[0]} className="w-6 h-6 rounded object-cover" />
                              <span className="truncate">{p.name}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-purple-600 mt-2 font-bold">When this bundle is ordered, stock will be deducted from these individual items.</p>
                      </div>
                    )}
                    
                    {!formData.isBundle && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-bold text-blue-800">Frequently Bought Together (FBT)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-600 font-bold">Combo Discount (Tk):</span>
                            <input type="number" value={formData.fbtDiscount || 0} onChange={e => setFormData({...formData, fbtDiscount: Number(e.target.value)})} className="w-24 px-2 py-1 text-sm rounded border border-blue-200 focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2 bg-white p-2 rounded border border-blue-100">
                          {products.filter(p => p.id !== formData.id && !p.isBundle).map(p => (
                            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input 
                                type="checkbox" 
                                checked={(formData.fbtProducts || []).includes(p.id)}
                                onChange={(e) => {
                                  const current = formData.fbtProducts || [];
                                  if (e.target.checked) {
                                    setFormData({...formData, fbtProducts: [...current, p.id]});
                                  } else {
                                    setFormData({...formData, fbtProducts: current.filter(id => id !== p.id)});
                                  }
                                }}
                              />
                              <img src={p.images?.[0]} className="w-6 h-6 rounded object-cover" />
                              <span className="truncate">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" form="product-form" disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                {isSaving ? 'Saving...' : <><Save size={18} /> Save Product</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
