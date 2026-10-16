import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Product } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { Layout } from "../../components/Layout";
import { SEO } from "../../components/SEO";
import { ShieldAlert, Recycle } from "lucide-react";

export default function UsedItems() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsedItems = async () => {
      try {
        const q = query(collection(db, "products"), where("condition", "==", "used"));
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching used items:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsedItems();
  }, []);

  return (
    <Layout>
      <SEO title="Pre-Owned Items | Click2IT" description="Buy certified pre-owned and pre-owned electronics, components, and gadgets." />
      
      <div className="bg-amber-50 border-b border-amber-100 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Recycle size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">Pre-Owned Items</h1>
              <p className="text-slate-600 max-w-2xl text-lg">
                High-quality pre-owned electronics and PC components at unbeatable prices. All items are tested and verified by our technicians.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
              <ShieldAlert size={16} className="text-green-500" /> 100% Tested & Verified
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-12 min-h-[50vh]">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse border border-slate-100">
                <div className="aspect-square bg-slate-100 rounded-xl mb-4"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Recycle size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Pre-Owned Items Found</h3>
            <p className="text-slate-500">We currently don't have any pre-owned items in stock. Please check back later!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}