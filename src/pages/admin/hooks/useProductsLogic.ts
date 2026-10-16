import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import { Product, ProductVariant } from '../../../types';

export function useProductsLogic({ setConfirmModal, checkLowStock, fetchData, setLoading, fileInputRef }: any) {

  const [products, setProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: 'Laptop',
    description: '',
    images: [] as string[],
    socketType: '',
    ramType: '',
    chipset: '',
    vendorId: '',
    variants: [] as ProductVariant[],
    specs: {} as Record<string, string>,
    hasSerialTracking: false,
    availableSerials: [] as string[],
    warrantyMonths: 0,
    showInStore: true,
    isFeatured: false,
    isExclusiveDeal: false,
    discountPrice: undefined as number | undefined,
    shortDescription: '',
    tags: [] as string[],
  });
  const [vendorProductSearchQuery, setVendorProductSearchQuery] = useState('');
  const [vendorProductCategoryFilter, setVendorProductCategoryFilter] = useState<string>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');

    const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: `${editingProduct ? 'Update' : 'Create'} Product`,
      message: `Are you sure you want to ${editingProduct ? 'update' : 'create'} the product "${formData.name}"?`,
      confirmText: 'Confirm',
      confirmColor: 'bg-[#EF4444] hover:bg-red-700',
      onConfirm: async () => {
        try {
          const productData = {
            ...formData,
            createdAt: new Date().toISOString(),
          };

          if (editingProduct) {
            await updateDoc(doc(db, 'products', editingProduct.id), productData);
            toast.success('Product updated successfully');
            checkLowStock(productData.name, productData.stock);
          } else {
            await addDoc(collection(db, 'products'), productData);
            toast.success('Product added successfully');
            checkLowStock(productData.name, productData.stock);
          }
          
          setIsAddingProduct(false);
          setEditingProduct(null);
          setFormData({ 
            name: '', 
            price: 0, 
            stock: 0, 
            category: 'Laptop', 
            description: '', 
            images: [],
            socketType: '',
            ramType: '',
            chipset: '',
            vendorId: '',
            variants: [],
            specs: {},
            hasSerialTracking: false,
            availableSerials: [],
            warrantyMonths: 0,
            showInStore: true,
            isFeatured: false,
            isExclusiveDeal: false,
            discountPrice: undefined,
            shortDescription: '',
            tags: []
          });
          fetchData();
        } catch (error) {
          console.error('Error saving product:', error);
          toast.error('Failed to save product');
        }
      }
    });
  };

    const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
          toast.success('Product deleted');
          fetchData();
        } catch (error) {
          toast.error('Failed to delete product');
        }
      }
    });
  };

    const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Products',
      message: `Are you sure you want to delete ${selectedProductIds.length} products? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          for (const id of selectedProductIds) {
            batch.delete(doc(db, 'products', id));
          }
          await batch.commit();
          toast.success(`${selectedProductIds.length} products deleted`);
          setSelectedProductIds([]);
          fetchData();
        } catch (error) {
          toast.error('Failed to delete some products');
        }
      }
    });
  };

    const handleExportAllProducts = () => {
    if (products.length === 0) return;
    
    const headers = ['Name', 'Category', 'Price', 'Stock', 'Description', 'SocketType', 'RamType', 'Images'];
    const csvContent = [
      headers.join(','),
      ...products.map(p => [
        `"${p.name}"`,
        `"${p.category}"`,
        p.price,
        p.stock,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${p.socketType || ''}"`,
        `"${p.ramType || ''}"`,
        `"${(p.images || []).join('|')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `all_products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handleBulkExportProducts = () => {
    if (selectedProductIds.length === 0) return;
    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
    
    const headers = ['Name', 'Category', 'Price', 'Stock', 'Description', 'SocketType', 'RamType', 'Images'];
    const csvContent = [
      headers.join(','),
      ...selectedProducts.map(p => [
        `"${p.name}"`,
        `"${p.category}"`,
        p.price,
        p.stock,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${p.socketType || ''}"`,
        `"${p.ramType || ''}"`,
        `"${(p.images || []).join('|')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handleImportProductsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        toast.error('CSV file is empty or missing data');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newProducts = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of lines[i]) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const productData: any = {
          name: '',
          category: 'Other',
          price: 0,
          stock: 0,
          description: '',
          images: [],
          socketType: '',
          ramType: '',
          chipset: '',
        };

        headers.forEach((header, index) => {
          const value = values[index];
          if (value === undefined) return;
          
          if (header === 'name') productData.name = value;
          else if (header === 'category') productData.category = value || 'Other';
          else if (header === 'price') productData.price = Number(value) || 0;
          else if (header === 'stock') productData.stock = Number(value) || 0;
          else if (header === 'description') productData.description = value;
          else if (header === 'sockettype') productData.socketType = value;
          else if (header === 'ramtype') productData.ramType = value;
          else if (header === 'chipset') productData.chipset = value;
          else if (header === 'images') productData.images = value ? value.split('|') : [];
        });

        if (productData.name) {
          newProducts.push(productData);
        }
      }

      if (newProducts.length > 0) {
        setLoading(true);
        try {
          const promises = newProducts.map(p => addDoc(collection(db, 'products'), {
            ...p,
            createdAt: new Date().toISOString()
          }));
          await Promise.all(promises);
          toast.success(`Successfully imported ${newProducts.length} products`);
          fetchData();
        } catch (error) {
          toast.error('Failed to import products. Check if all required fields (Name, Category, Price, Stock) are present.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return {
    products, setProducts,
    isAddingProduct, setIsAddingProduct,
    editingProduct, setEditingProduct,
    formData, setFormData,
    vendorProductSearchQuery, setVendorProductSearchQuery,
    vendorProductCategoryFilter, setVendorProductCategoryFilter,
    selectedProductIds, setSelectedProductIds,
    inventoryCategoryFilter, setInventoryCategoryFilter,
    handleSaveProduct,
    handleDeleteProduct,
    handleBulkDeleteProducts,
    handleExportAllProducts,
    handleBulkExportProducts,
    handleImportProductsCSV
  };
}
