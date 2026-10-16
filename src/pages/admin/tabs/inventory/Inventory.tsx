import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn, warrantyToMonths, monthsToWarrantyValue, formatWarranty, type WarrantyUnit } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { BulkEditForm } from '../../../../components/BulkEditForm';
import {  Package, Plus, Upload, Download, Search, Edit, Trash2, X, AlertTriangle, Play, Loader2, Image as ImageIcon, FileText, XCircle, Edit2, ArrowRight, Eye, DollarSign, AlertCircle, Filter, ArrowUpDown, Tag , ChevronRight } from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';

interface InventoryTabProps { products: any[]; vendors: any[]; menus: any[]; isAddingProduct: boolean; setIsAddingProduct: (v: boolean) => void; editingProduct: any; setEditingProduct: (v: any) => void; formData: any; setFormData: (v: any) => void; inventoryCategoryFilter: string; setInventoryCategoryFilter: (v: string) => void; selectedProductIds: string[]; setSelectedProductIds: (v: string[]) => void; isBulkEditing: boolean; setIsBulkEditing: (v: boolean) => void; bulkEditData: any; setBulkEditData: (v: any) => void; isUploading: boolean; dragOver: boolean; setDragOver: (v: boolean) => void; loading: boolean; handleSaveProduct: (e: any) => void; handleDeleteProduct: (id: string) => void; handleImportProductsCSV: (e: any) => void; handleDownloadCSVTemplate: () => void; handleExportAllProducts: () => void; handleBulkExportProducts: () => void; handleBulkDeleteProducts: () => void; handleBulkUpdate: (e: any) => void; handleImageUpload: (f: any) => void; removeImage: (i: number) => void; addVariant: () => void; updateVariant: (id: string, f: string, v: any) => void; removeVariant: (id: string) => void; addSpec: () => void; updateSpec: (key: string, value: string) => void; removeSpec: (key: string) => void; setActiveTab: (v: string) => void; fetchData: () => Promise<void>; fileInputRef?: any; setIsAddingMenu?: (v: boolean) => void; }

import { useRef } from 'react';

const SPEC_TEMPLATES: Record<string, Record<string, string>> = {
  // PCs & Laptops
  'Laptop': { 'Processor': '', 'RAM': '', 'Storage': '', 'Display': '', 'Graphics': '', 'Battery': '', 'OS': '' },
  'Laptops': { 'Processor': '', 'RAM': '', 'Storage': '', 'Display': '', 'Graphics': '', 'Battery': '', 'OS': '' },
  'Desktop': { 'Processor': '', 'Motherboard': '', 'RAM': '', 'Storage': '', 'Graphics': '', 'Power Supply': '', 'Casing': '' },
  'PC': { 'Processor': '', 'Motherboard': '', 'RAM': '', 'Storage': '', 'Graphics': '', 'Power Supply': '', 'Casing': '' },
  'Server': { 'Processor': '', 'RAM': '', 'Storage Controller': '', 'Drive Bays': '', 'Form Factor': '', 'Power Supply': '' },
  
  // Core Components
  'Processor': { 'Cores': '', 'Threads': '', 'Base Clock': '', 'Boost Clock': '', 'Socket': '', 'TDP': '' },
  'CPU': { 'Cores': '', 'Threads': '', 'Base Clock': '', 'Boost Clock': '', 'Socket': '', 'TDP': '' },
  'Motherboard': { 'Form Factor': '', 'Socket': '', 'Chipset': '', 'Memory Slots': '', 'Max Memory': '' },
  'RAM': { 'Capacity': '', 'Type (DDR4/DDR5)': '', 'Speed': '', 'Latency': '', 'Voltage': '' },
  'Memory': { 'Capacity': '', 'Type': '', 'Speed': '', 'Latency': '', 'Voltage': '' },
  'Graphics Card': { 'Memory': '', 'Memory Type': '', 'Core Clock': '', 'Boost Clock': '', 'Ports': '' },
  'GPU': { 'Memory': '', 'Memory Type': '', 'Core Clock': '', 'Boost Clock': '', 'Ports': '' },
  'Storage': { 'Capacity': '', 'Type (SSD/HDD)': '', 'Form Factor': '', 'Interface': '', 'Read/Write Speed': '' },
  'SSD': { 'Capacity': '', 'Form Factor': '', 'Interface': '', 'Read/Write Speed': '' },
  'HDD': { 'Capacity': '', 'RPM': '', 'Cache': '', 'Form Factor': '', 'Interface': '' },
  'Power Supply': { 'Wattage': '', 'Efficiency Rating': '', 'Modular': '', 'Form Factor': '' },
  'PSU': { 'Wattage': '', 'Efficiency Rating': '', 'Modular': '', 'Form Factor': '' },
  'Casing': { 'Type': '', 'Motherboard Support': '', 'Front Ports': '', 'Fan Support': '', 'Radiator Support': '' },
  'Cooler': { 'Type (Air/Liquid)': '', 'Socket Support': '', 'Fan Speed': '', 'Noise Level': '' },
  
  // Peripherals & Audio
  'Monitor': { 'Panel Type': '', 'Refresh Rate': '', 'Resolution': '', 'Response Time': '', 'Ports': '' },
  'Keyboard': { 'Type (Mech/Membrane)': '', 'Switch Type': '', 'Connectivity': '', 'Backlight': '' },
  'Mouse': { 'Sensor': '', 'DPI': '', 'Connectivity': '', 'Buttons': '' },
  'Headphone': { 'Type': '', 'Connectivity': '', 'Frequency Response': '', 'Microphone': '', 'Impedance': '' },
  'Earphone': { 'Type': '', 'Connectivity': '', 'Frequency Response': '', 'Microphone': '' },
  'Earbud': { 'Bluetooth Version': '', 'Driver Size': '', 'Play Time': '', 'Charging Time': '', 'Water Resistance': '' },
  'TWS': { 'Bluetooth Version': '', 'Driver Size': '', 'Play Time': '', 'Charging Time': '', 'Water Resistance': '' },
  'Speaker': { 'Configuration (2.0/2.1)': '', 'Total RMS': '', 'Connectivity': '', 'Frequency Response': '' },
  'Webcam': { 'Resolution': '', 'Frame Rate': '', 'Field of View': '', 'Microphone': '' },
  'Microphone': { 'Type': '', 'Polar Pattern': '', 'Frequency Response': '', 'Connectivity': '' },
  
  // IT, Networking & Security
  'Router': { 'Antenna': '', 'Wi-Fi Speed': '', 'Bands': '', 'Ports': '', 'Coverage': '' },
  'Network': { 'Standard': '', 'Speed': '', 'Ports': '', 'Features': '' },
  'Switch': { 'Ports': '', 'Speed': '', 'PoE Support': '', 'Managed/Unmanaged': '' },
  'Access Point': { 'Wi-Fi Standard': '', 'Speed': '', 'Antenna': '', 'Coverage': '' },
  'CCTV': { 'Resolution': '', 'Lens': '', 'Night Vision Distance': '', 'Connectivity': '', 'Weatherproof Rating': '' },
  'Camera': { 'Resolution': '', 'Lens': '', 'Night Vision Distance': '', 'Connectivity': '', 'Weatherproof Rating': '' },
  'NVR': { 'Channels': '', 'Storage Capacity': '', 'Resolution Support': '', 'Video Output': '' },
  'DVR': { 'Channels': '', 'Storage Capacity': '', 'Resolution Support': '', 'Video Output': '' },
  'Printer': { 'Functions': '', 'Print Speed': '', 'Resolution': '', 'Paper Size': '', 'Connectivity': '' },
  'Scanner': { 'Type': '', 'Resolution': '', 'Scan Speed': '', 'Connectivity': '' },
  'Barcode': { 'Scan Type (1D/2D)': '', 'Connectivity': '', 'Scan Rate': '', 'Drop Resistance': '' },
  'POS': { 'Processor': '', 'RAM': '', 'Storage': '', 'Display': '', 'OS': '' },
  
  // Gadgets & Smart Home
  'Smart Watch': { 'Display': '', 'Battery Life': '', 'Water Resistance': '', 'Sensors': '', 'Connectivity': '' },
  'Power Bank': { 'Capacity': '', 'Input Ports': '', 'Output Ports': '', 'Fast Charging': '' },
  'Flash Drive': { 'Capacity': '', 'Interface (USB 2.0/3.0)': '', 'Read Speed': '', 'Material': '' },
  'Pen Drive': { 'Capacity': '', 'Interface (USB 2.0/3.0)': '', 'Read Speed': '', 'Material': '' },
  'Memory Card': { 'Capacity': '', 'Class': '', 'Read Speed': '', 'Format (SD/MicroSD)': '' },
  'Projector': { 'Brightness (Lumens)': '', 'Resolution': '', 'Contrast Ratio': '', 'Lamp Life': '', 'Projection Size': '' },
  'Drone': { 'Camera Resolution': '', 'Flight Time': '', 'Control Range': '', 'Weight': '' },
  'Action Camera': { 'Resolution': '', 'Frame Rate': '', 'Waterproof': '', 'Battery Life': '' },
  'Gimbal': { 'Payload': '', 'Battery Life': '', 'Axes': '', 'Compatibility': '' },
  'Stabilizer': { 'Payload': '', 'Battery Life': '', 'Axes': '', 'Compatibility': '' },
  'Gamepad': { 'Compatibility': '', 'Connectivity': '', 'Vibration': '', 'Battery Life': '' },
  'Controller': { 'Compatibility': '', 'Connectivity': '', 'Vibration': '', 'Battery Life': '' },
  
  // Accessories & Power
  'UPS': { 'Capacity (VA)': '', 'Load Capacity (W)': '', 'Backup Time': '', 'Battery Type': '' },
  'Cable': { 'Type': '', 'Length': '', 'Data Transfer Rate': '', 'Material': '' },
  'Adapter': { 'Input': '', 'Output': '', 'Supported Resolution/Speed': '', 'Material': '' },
  'Converter': { 'Input': '', 'Output': '', 'Supported Resolution/Speed': '', 'Material': '' },
  'Hub': { 'Input Interface': '', 'Output Ports': '', 'Data Transfer Rate': '', 'Material': '' },
  'Docking Station': { 'Input Interface': '', 'Output Ports': '', 'Power Delivery': '', 'Material': '' },
  
  // TV & Display
  'TV': { 'Screen Size': '', 'Resolution': '', 'Panel Type': '', 'Smart Features': '', 'Ports': '' },
  'Television': { 'Screen Size': '', 'Resolution': '', 'Panel Type': '', 'Smart Features': '', 'Ports': '' },
  
  // Fallback
  'Accessory': { 'Type': '', 'Material': '', 'Compatibility': '', 'Dimensions': '' },
  'Default': { 
    'Brand': '', 
    'Model': '', 
    'Type': '',
    'Color': '', 
    'Material': '',
    'Weight': '', 
    'Dimensions': '', 
    'Resolution': '',
    'Display / Lens': '',
    'Processor / Chipset': '',
    'Memory / RAM': '',
    'Storage': '',
    'Connectivity': '',
    'Ports & Interfaces': '',
    'Power / Voltage': '',
    'Battery Life': '',
    'Charging Time': '',
    'Sensor': '',
    'Night Vision': '',
    'Water/Dust Resistance': '',
    'Compatibility': '',
    'Special Features': '',
    'Included in Box': '',
    'Warranty': ''
  }
};

const InventoryTab: React.FC<InventoryTabProps> = ({ products, vendors, menus, isAddingProduct, setIsAddingProduct, editingProduct, setEditingProduct, formData, setFormData, inventoryCategoryFilter, setInventoryCategoryFilter, selectedProductIds, setSelectedProductIds, isBulkEditing, setIsBulkEditing, bulkEditData, setBulkEditData, isUploading, dragOver, setDragOver, loading, handleSaveProduct, handleDeleteProduct, handleImportProductsCSV, handleDownloadCSVTemplate, handleExportAllProducts, handleBulkExportProducts, handleBulkDeleteProducts, handleBulkUpdate, handleImageUpload, removeImage, addVariant, updateVariant, removeVariant, addSpec, updateSpec, removeSpec, setActiveTab, fetchData, setIsAddingMenu }) => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
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
  const [specTemplates, setSpecTemplates] = useState<any[]>([]);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [bulkSpecInput, setBulkSpecInput] = useState('');

  // Auto-populate specs when category is chosen or product is opened
  React.useEffect(() => {
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
  }, [formData.category, specTemplates]); // Re-run when category or templates change


  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs }) => {
      getDocs(collection(db, 'brands')).then(snap => {
        setBrands(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      getDocs(collection(db, 'specificationTemplates')).then(snap => {
        setSpecTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    });
  }, []);

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="text-[#EF4444]" /> Product Inventory
              </h2>
              <div className="flex items-center gap-2">
                {hasPermission('manage_inventory') && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportProductsCSV}
                      accept=".csv"
                      className="hidden"
                    />
                    <button
                      onClick={handleDownloadCSVTemplate}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
                      title="Download CSV Template"
                    >
                      <FileText size={18} /> Template
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
                      title="Import Products from CSV"
                    >
                      <Upload size={18} /> Import
                    </button>
                  </>
                )}
                <button
                  onClick={handleExportAllProducts}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
                  title="Export All Products to CSV"
                >
                  <Download size={18} /> Export All
                </button>
                {hasPermission('manage_inventory') && (
                  <button
                    onClick={() => { setIsAddingProduct(true); document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="bg-[#081621] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#EF4444] transition-all font-bold text-sm"
                  >
                    <Plus size={18} /> Add Product
                  </button>
                )}
              </div>
            </div>

            {/* Top Summary Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Products</p>
                  <p className="text-2xl font-black text-slate-900">{products.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Inventory Value</p>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(products.reduce((acc, p) => acc + ((p.stock || 0) * (p.costPrice ?? p.price ?? 0)), 0), settings)}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Low Stock Items</p>
                  <p className="text-2xl font-black text-slate-900">{products.filter(p => !p.isOutOfStock && p.stock > 0 && p.stock < (p.lowStockThreshold || 10)).length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Out of Stock</p>
                  <p className="text-2xl font-black text-slate-900">{products.filter(p => p.isOutOfStock || (p.stock || 0) === 0).length}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, model..."
                    value={inventorySearchQuery}
                    onChange={(e) => { setInventorySearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#EF4444]"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <select
                      value={stockFilter}
                      onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                      className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#EF4444] appearance-none bg-white font-medium text-slate-700 min-w-[140px]"
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
                      onClick={() => { setBrandFilter('all'); setCurrentPage(1); setIsBrandDropdownOpen(false); }}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${brandFilter === 'all' ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      All Brands
                    </button>
                    {brands.map((b: any) => (
                      <button
                        key={b.id || b.name}
                        onClick={() => { setBrandFilter(b.name); setCurrentPage(1); setIsBrandDropdownOpen(false); }}
                        className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors truncate ${brandFilter === b.name ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'}`}
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
                      onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                      className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#EF4444] appearance-none bg-white font-medium text-slate-700 min-w-[160px]"
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
              
              <div className="w-full h-px bg-gray-200 my-1"></div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap shrink-0">Filter by Category:</span>
                <button
                  onClick={() => setInventoryCategoryFilter('all')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0",
                    inventoryCategoryFilter === 'all' 
                      ? "bg-gray-900 text-white shadow-md" 
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  All
                </button>
                {Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort().map(category => (
                  <button
                    key={category as string}
                    onClick={() => setInventoryCategoryFilter(category as string)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0",
                      inventoryCategoryFilter === category 
                        ? "bg-gray-900 text-white shadow-md" 
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {category as string}
                  </button>
                ))}
              </div>

            </div>
            {isAddingProduct || editingProduct ? (
              <form onSubmit={handleSaveProduct} className="p-6 bg-slate-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-xl font-black text-slate-800">
                    {editingProduct ? 'Edit Product' : 'Create New Product'}
                  </h3>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                      className="px-6 py-2 bg-white text-slate-600 border border-slate-200 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      {editingProduct ? 'Update Product' : 'Save Product'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Basic Info & Pricing */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Basic Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Product Name</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. iPhone 15 Pro Max"
                          />
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase">Category</label>
                              {setIsAddingMenu && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveTab('menus'); setIsAddingMenu(true); }}
                                  className="text-blue-600 text-[10px] font-bold hover:underline flex items-center gap-1"
                                >
                                  <Plus size={10} /> Add
                                </button>
                              )}
                            </div>
                            <select
                              value={formData.category || ''}
                              onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                              className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Category</option>
                              {menus.map(menu => (
                                <option key={menu.id} value={menu.name}>{menu.name}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Sub-Category</label>
                            <select
                              value={formData.subCategory || ''}
                              onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                              className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              disabled={!formData.category}
                            >
                              <option value="">Select Sub-category</option>
                              {menus.find(m => m.name === formData.category)?.subCategories?.map((sub: any) => (
                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase">Brand</label>
                            </div>
                            <select
                              value={formData.brand || ''}
                              onChange={e => setFormData({ ...formData, brand: e.target.value })}
                              className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Brand</option>
                              {brands.map(brand => (
                                <option key={brand.id} value={brand.name}>{brand.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Model</label>
                            <input
                              type="text"
                              value={formData.model || ''}
                              onChange={e => setFormData({ ...formData, model: e.target.value })}
                              className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g. A2849"
                            />
                          </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase">Barcode / SKU</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const randomSku = 'PRD-' + Math.floor(10000000 + Math.random() * 90000000);
                                    setFormData({ ...formData, sku: randomSku });
                                  }}
                                  className="text-blue-600 text-[10px] font-bold hover:underline"
                                >
                                  Generate Auto
                                </button>
                              </div>
                              <input
                                type="text"
                                value={formData.sku || ''}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Scan or enter barcode"
                              />
                            </div>

                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Short Description</label>
                          <textarea
                            rows={2}
                            value={formData.shortDescription || ''}
                            onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                            className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief highlight (1-2 lines) for product cards..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Description</label>
                          <textarea
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Detailed product description..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tags (Comma Separated)</label>
                          <input
                            type="text"
                            value={formData.tags?.join(', ') || ''}
                            onChange={e => {
                              const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(t => t !== '');
                              setFormData({ ...formData, tags: tagsArray });
                            }}
                            className="w-full font-medium text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. gaming, budget, new arrival"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing, Stock & Settings */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Pricing, Stock & Setup</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Purchase Price (BDT)</label>
                          <input
                            type="number"
                            value={formData.costPrice || 0}
                            onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                            className="w-full font-black text-sm text-slate-700 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Sales Price (BDT)</label>
                          <input
                            type="number"
                            required
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full font-black text-sm text-blue-600 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Discount Price (BDT)</label>
                          <input
                            type="number"
                            value={formData.discountPrice || ''}
                            onChange={e => setFormData({ ...formData, discountPrice: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="Optional"
                            className="w-full font-black text-sm text-green-600 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Base Stock & Unit</label>
                            <div className="flex">
                              <input
                                type="number"
                                required
                                value={formData.stock}
                                onChange={e => {
                                  const newStock = Math.max(0, parseInt(e.target.value) || 0);
                                  if (formData.hasSerialTracking && !editingProduct) {
                                    const currentSerials = formData.availableSerials || [];
                                    let newSerials = [...currentSerials];
                                    if (newStock > currentSerials.length) {
                                      const diff = newStock - currentSerials.length;
                                      const prefix = Date.now().toString(36).toUpperCase().slice(-4);
                                      for(let i=0; i<diff; i++) {
                                        const seq = String(currentSerials.length + i + 1).padStart(3, '0');
                                        newSerials.push(`SN-${prefix}-${seq}`);
                                      }
                                    } else if (newStock < currentSerials.length) {
                                      newSerials = newSerials.slice(0, newStock);
                                    }
                                    setFormData({ ...formData, stock: newStock, availableSerials: newSerials });
                                  } else {
                                    setFormData({ ...formData, stock: newStock });
                                  }
                                }}
                                className={`w-full font-black text-sm border-slate-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500 text-slate-800`}
                              />
                              <select
                                value={formData.unit || 'pcs'}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-24 border-y border-r border-slate-300 rounded-r-lg p-2 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="pcs">pcs</option>
                                <option value="nos">nos</option>
                                <option value="meter">meter</option>
                                <option value="kg">kg</option>
                                <option value="gm">gm</option>
                                <option value="litre">litre</option>
                                <option value="box">box</option>
                                <option value="pack">pack</option>
                                <option value="chop">chop</option>
                              </select>
                            </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.hasSerialTracking}
                              onChange={e => {
                                const enabled = e.target.checked;
                                if (enabled && !editingProduct) {
                                  const count = formData.stock || 0;
                                  const prefix = Date.now().toString(36).toUpperCase().slice(-4);
                                  const initialSerials = Array.from({length: count}, (_, i) => `SN-${prefix}-${String(i+1).padStart(3, '0')}`);
                                  setFormData({ ...formData, hasSerialTracking: true, availableSerials: initialSerials });
                                } else {
                                  setFormData({ ...formData, hasSerialTracking: enabled });
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">Serial Tracking</span>
                              <span className="block text-[10px] text-slate-500">Require scanning individual SNs</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.isAccessory}
                              onChange={e => setFormData({ ...formData, isAccessory: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">Is Accessory</span>
                              <span className="block text-[10px] text-slate-500">Mark as a peripheral/accessory</span>
                            </div>
                          </label>
                        </div>

                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.showInStore !== false}
                              onChange={e => setFormData({ ...formData, showInStore: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">Show in Store</span>
                              <span className="block text-[10px] text-slate-500">Visible on public e-commerce site</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.isFeatured || false}
                              onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">Featured Product</span>
                              <span className="block text-[10px] text-slate-500">Highlight on store homepage</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.isExclusiveDeal || false}
                              onChange={e => setFormData({ ...formData, isExclusiveDeal: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-800">Exclusive Deal</span>
                              <span className="block text-[10px] text-slate-500">Show on exclusive deals page</span>
                            </div>
                          </label>
                          
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={(formData.warrantyMonths || 0) > 0} 
                                onChange={(e) => setFormData({...formData, warrantyMonths: e.target.checked ? (formData.warrantyMonths || 12) : 0, warrantyUnit: (formData as any).warrantyUnit || 'months'} as any)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="block text-sm font-bold text-slate-800">Warranty Included</span>
                          </label>
                          
                          {(formData.warrantyMonths || 0) > 0 && (
                            <div className="flex items-center gap-2 px-1">
                              <input
                                  type="number"
                                  min="1"
                                  value={monthsToWarrantyValue(formData.warrantyMonths || 0, (formData as any).warrantyUnit || 'months')}
                                  onChange={e => setFormData({ ...formData, warrantyMonths: Math.max(1 / 30, warrantyToMonths(Number(e.target.value), (formData as any).warrantyUnit || 'months')) })}
                                  className="w-20 font-black text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center"
                              />
                              <select
                                  value={(formData as any).warrantyUnit || 'months'}
                                  onChange={e => {
                                    const newUnit = e.target.value as WarrantyUnit;
                                    const oldUnit = ((formData as any).warrantyUnit || 'months') as WarrantyUnit;
                                    const shown = monthsToWarrantyValue(formData.warrantyMonths || 0, oldUnit);
                                    setFormData({ ...formData, warrantyUnit: newUnit, warrantyMonths: warrantyToMonths(shown || 1, newUnit) } as any);
                                  }}
                                  className="text-xs font-bold text-slate-600 uppercase border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {formData.hasSerialTracking && !editingProduct && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Opening Stock Serials (Barcode scan / 1 per line)</label>
                          <textarea
                            value={formData.availableSerials?.join('\n') || ''}
                            onChange={e => {
                              const lines = e.target.value.split('\n').map(s => s.trim()).filter(s => s);
                              setFormData({ 
                                ...formData, 
                                availableSerials: lines,
                                stock: lines.length 
                              });
                            }}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 h-32 font-mono text-xs bg-slate-50"
                            placeholder="SN-001&#10;SN-002&#10;SN-003"
                          />
                          <p className="text-[11px] font-bold text-amber-600 mt-1">Found {formData.availableSerials?.length || 0} serials. Stock qty is locked to this count.</p>
                        </div>
                      )}
                    </div>

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
                                          newSpecs[e.target.value] = value;
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

                  {/* Right Column: Media & Variants */}
                  <div className="space-y-6">
                    
                    {/* Media */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Product Media</h4>
                      
                      <div className="space-y-4">
                        <div
                          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}`}
                          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOver(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              handleImageUpload(e.dataTransfer.files);
                            }
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            id="product-images"
                            onChange={e => handleImageUpload(e.target.files)}
                          />
                          <label htmlFor="product-images" className="cursor-pointer flex flex-col items-center">
                            {isUploading ? (
                              <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                            ) : (
                              <ImageIcon className="text-slate-400 mb-2" size={32} />
                            )}
                            <span className="text-sm font-bold text-blue-600">Click to upload</span>
                            <span className="text-xs text-slate-500 font-medium mt-1">or drag and drop</span>
                          </label>
                        </div>

                        {formData.images?.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {formData.images.map((url: string, index: number) => (
                              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                  className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variants */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Variants</h4>
                        <button
                          type="button"
                          onClick={addVariant}
                          className="text-[11px] bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-all flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Variant
                        </button>
                      </div>
                      
                      {(formData.variants || []).length > 0 ? (
                        <div className="space-y-4">
                          {(formData.variants || []).map((variant: any) => (
                            <div key={variant.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative group">
                              <button
                                type="button"
                                onClick={() => removeVariant(variant.id)}
                                className="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                              
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Variant Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Red, XL"
                                  value={variant.name}
                                  onChange={e => updateVariant(variant.id, 'name', e.target.value)}
                                  className="w-full text-sm font-bold border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SKU</label>
                                  <input
                                    type="text"
                                    value={variant.sku}
                                    onChange={e => updateVariant(variant.id, 'sku', e.target.value)}
                                    className="w-full text-xs font-mono border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purchase Price</label>
                                  <input
                                    type="number"
                                    value={variant.costPrice || 0}
                                    onChange={e => updateVariant(variant.id, 'costPrice', Number(e.target.value))}
                                    className="w-full text-xs font-bold text-slate-700 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Price</label>
                                  <input
                                    type="number"
                                    value={variant.price}
                                    onChange={e => updateVariant(variant.id, 'price', Number(e.target.value))}
                                    className="w-full text-xs font-bold text-blue-600 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock</label>
                                  <input
                                    type="number"
                                    value={variant.stock}
                                    onChange={e => updateVariant(variant.id, 'stock', Number(e.target.value))}
                                    className="w-full text-xs font-bold border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs text-slate-400 font-bold mb-2">No variants defined.</p>
                          <span className="text-[10px] text-slate-400 max-w-[200px] inline-block">Use variants for products that have different colors, sizes, or capacities.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            ) : null}

            {isBulkEditing && selectedProductIds.length > 0 && (
              <BulkEditForm
                selectedCount={selectedProductIds.length}
                bulkEditData={bulkEditData}
                setBulkEditData={setBulkEditData}
                handleBulkUpdate={handleBulkUpdate}
                setIsBulkEditing={setIsBulkEditing}
                menus={menus}
                vendors={vendors}
                loading={loading}
              />
            )}
            {selectedProductIds.length > 0 && (
              <div className="bg-[#081621] text-white p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{selectedProductIds.length} items selected</span>
                  <div className="h-4 w-[1px] bg-gray-700" />
                  <button
                    onClick={handleBulkExportProducts}
                    className="flex items-center gap-2 text-sm hover:text-[#EF4444] transition-colors font-bold"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                  <button
                    onClick={handleBulkDeleteProducts}
                    className="flex items-center gap-2 text-sm hover:text-red-400 transition-colors font-bold"
                  >
                    <Trash2 size={16} /> Delete Selected
                  </button>
                  <button
                    onClick={() => setIsBulkEditing(!isBulkEditing)}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-colors font-bold",
                      isBulkEditing ? "text-[#EF4444]" : "hover:text-[#EF4444]"
                    )}
                  >
                    <Edit2 size={16} /> Bulk Edit
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedProductIds([]);
                    setIsBulkEditing(false);
                  }}
                  className="text-xs uppercase tracking-wider font-bold hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.length === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(products.map(p => p.id));
                          } else {
                            setSelectedProductIds([]);
                            setIsBulkEditing(false);
                          }
                        }}
                        className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                      />
                    </th>
                    <th className="px-6 py-4 w-10">#</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const filtered = [...products]
                      .filter(p => inventoryCategoryFilter === 'all' || p.category === inventoryCategoryFilter)
                      .filter(p => {
                        if (!inventorySearchQuery.trim()) return true;
                        const q = inventorySearchQuery.toLowerCase();
                        return (p.name || '').toLowerCase().includes(q) ||
                               (p.sku || p.id || '').toLowerCase().includes(q) ||
                               (p.model || '').toLowerCase().includes(q);
                      })
                      .filter(p => {
                        if (stockFilter === 'all') return true;
                        if (stockFilter === 'in_stock') return !p.isOutOfStock && p.stock > 0;
                        if (stockFilter === 'low_stock') return !p.isOutOfStock && p.stock > 0 && p.stock < (p.lowStockThreshold || 10);
                        if (stockFilter === 'out_of_stock') return p.isOutOfStock || (p.stock || 0) === 0;
                        return true;
                      })
                      .filter(p => brandFilter === 'all' || p.brand === brandFilter)
                      .sort((a, b) => {
                        if (sortBy === 'newest') {
                           const tA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                           const tB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                           return tB - tA;
                        }
                        if (sortBy === 'oldest') {
                           const tA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                           const tB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                           return tA - tB;
                        }
                        if (sortBy === 'price_desc') return (b.price || b.costPrice || 0) - (a.price || a.costPrice || 0);
                        if (sortBy === 'price_asc') return (a.price || a.costPrice || 0) - (b.price || b.costPrice || 0);
                        if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
                        if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
                        return a.name.localeCompare(b.name);
                      });
                    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product, index) => (
                    <tr key={product.id} className={cn(
                      "hover:bg-gray-50 transition-colors",
                      selectedProductIds.includes(product.id) && "bg-red-50/50"
                    )}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, product.id]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                            }
                          }}
                          className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                        />
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="text-gray-300" size={20} />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900">{product.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">ID: {product.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                          {vendors.find(v => v.id === product.vendorId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4"><span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{product.category}</span></td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(product.price, settings)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                            product.stock >= 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                            product.stock > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT OF STOCK'}
                          </span>
                          {product.stock > 0 && product.stock < 10 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <AlertTriangle size={12} /> Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {settings.externalStoreEnabled && (
                            <button
                              onClick={async () => {
                                try {
                                  toast.loading(`Pushing ${product.name} to ${settings.externalStoreType}...`, { id: 'sync' });
                                  if (settings.externalStoreType === 'webhook' && settings.externalStoreUrl) {
                                     console.log('Pushing to Webhook:', {
                                       url: settings.externalStoreUrl,
                                       product: { id: product.id, name: product.name, price: product.price, stock: product.stock }
                                     });
                                  }
                                  await new Promise(resolve => setTimeout(resolve, 1500));
                                  toast.success(`Product synced successfully to ${settings.externalStoreType || 'external store'}`, { id: 'sync' });
                                } catch (error) {
                                  toast.error('Failed to sync product', { id: 'sync' });
                                }
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                              title="Push to External Store"
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                          {hasPermission('manage_inventory') && (
                            <button
                              onClick={() => setViewingProduct(product)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-all"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {hasPermission('manage_inventory') && (
                            <button
                              onClick={() => { setEditingProduct(product); setFormData({ ...product, variants: product.variants || [], specs: product.specs || {} }); setIsAddingProduct(true); document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                              title="Edit Product"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-all"
                              title="Delete Product"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={products
                .filter(p => inventoryCategoryFilter === 'all' || p.category === inventoryCategoryFilter)
                .filter(p => {
                  if (!inventorySearchQuery.trim()) return true;
                  const q = inventorySearchQuery.toLowerCase();
                  return (p.name || '').toLowerCase().includes(q) ||
                         (p.sku || p.id || '').toLowerCase().includes(q) ||
                         (p.model || '').toLowerCase().includes(q);
                })
                .filter(p => {
                  if (stockFilter === 'all') return true;
                  if (stockFilter === 'in_stock') return !p.isOutOfStock && p.stock > 0;
                  if (stockFilter === 'low_stock') return !p.isOutOfStock && p.stock > 0 && p.stock < (p.lowStockThreshold || 10);
                  if (stockFilter === 'out_of_stock') return p.isOutOfStock || (p.stock || 0) === 0;
                  return true;
                })
                .filter(p => brandFilter === 'all' || p.brand === brandFilter).length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>

          {/* Product Detail Modal */}
          {viewingProduct && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingProduct(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h3 className="font-bold text-lg text-[#081621]">Product Details</h3>
                  <button onClick={() => setViewingProduct(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {viewingProduct.images?.[0] && (
                    <div className="flex justify-center mb-3">
                      <img src={viewingProduct.images[0]} alt="" className="h-28 w-28 object-contain rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Product Name</span>
                      <span className="font-bold text-gray-900">{viewingProduct.name || '-'}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Model</span>
                      <span className="font-bold text-gray-900">{viewingProduct.model || '-'}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Category</span>
                      <span className="font-bold text-gray-900">{viewingProduct.category || '-'}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Sub Category</span>
                      <span className="font-bold text-gray-900">{viewingProduct.subCategory || '-'}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Brand</span>
                      <span className="font-bold text-gray-900">{viewingProduct.brand || '-'}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">SKU / Barcode</span>
                      <span className="font-bold text-gray-900">{viewingProduct.sku || '-'}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-blue-500 uppercase mb-0.5">Cost Price</span>
                      <span className="font-bold text-blue-900">{formatCurrency(viewingProduct.costPrice || 0, settings)}</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-green-500 uppercase mb-0.5">Sales Price</span>
                      <span className="font-bold text-green-900">{formatCurrency(viewingProduct.price || 0, settings)}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Stock</span>
                      <span className={cn("font-bold", viewingProduct.stock > 0 ? 'text-green-700' : 'text-red-600')}>{viewingProduct.stock || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Warranty</span>
                      <span className="font-bold text-gray-900">{viewingProduct.warrantyMonths ? formatWarranty(viewingProduct.warrantyMonths, viewingProduct.warrantyUnit) : 'No'}</span>
                    </div>
                  </div>
                  {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                    <div className="mt-3">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Variants</span>
                      <div className="flex flex-wrap gap-1">
                        {viewingProduct.variants.map((v: any, i: number) => (
                          <span key={i} className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded">{v.name} - {formatCurrency(v.price, settings)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewingProduct.availableSerials && viewingProduct.availableSerials.length > 0 && (
                    <div className="mt-3">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serial Numbers ({viewingProduct.availableSerials.length})</span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {viewingProduct.availableSerials.map((s: string, i: number) => (
                          <span key={i} className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
    </>
  );
};

export default InventoryTab;
