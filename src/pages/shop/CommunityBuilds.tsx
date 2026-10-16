import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Layout } from '../../components/Layout';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { ThumbsUp, ShoppingCart, User, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';

interface CommunityBuild {
  id: string;
  name: string;
  components: Record<string, Product>;
  totalPrice: number;
  author: string;
  upvotes: number;
  createdAt: any;
}

export const CommunityBuilds: React.FC = () => {
  const [builds, setBuilds] = useState<CommunityBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        const q = query(collection(db, 'community_builds'), orderBy('upvotes', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityBuild[];
        setBuilds(fetched);
      } catch (error) {
        console.error("Error fetching builds", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBuilds();
  }, []);

  const handleBuyBuild = (build: CommunityBuild) => {
    Object.values(build.components).forEach(product => addToCart(product));
    toast.success(`Added ${build.name} components to cart!`);
  };

  return (
    <Layout fullWidth>
      <div className="bg-[#f8fafc] min-h-screen py-12 selection:bg-slate-900 selection:text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Community Builds</h1>
            <p className="text-lg text-slate-500 font-medium">Discover top-rated PC configurations built by our community. Get inspired or copy a build directly into your cart.</p>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-4">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
             </div>
          ) : builds.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-2">No builds found</h3>
              <p className="text-slate-500">Be the first to publish a build from the PC Builder!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {builds.map((build, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={build.id} 
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:border-slate-300 transition-all"
                >
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h3 className="text-xl font-black text-slate-900 line-clamp-2">{build.name}</h3>
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-bold text-sm shrink-0">
                        <ThumbsUp size={14} /> {build.upvotes}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5"><User size={14} /> {build.author}</div>
                    </div>
                  </div>

                  <div className="p-6 flex-grow">
                    <div className="space-y-3">
                      {Object.entries(build.components).slice(0, 5).map(([cat, product]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg p-1.5 shrink-0 border border-slate-100">
                            <img src={product.images?.[0] || '/placeholder.png'} className="w-full h-full object-contain" />
                          </div>
                          <p className="text-sm font-medium text-slate-700 line-clamp-1">{product.name}</p>
                        </div>
                      ))}
                      {Object.keys(build.components).length > 5 && (
                        <p className="text-sm font-medium text-slate-400 pl-14">
                          + {Object.keys(build.components).length - 5} more components
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(build.totalPrice)}</p>
                    </div>
                    <button 
                      onClick={() => handleBuyBuild(build)}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <ShoppingCart size={18} /> Buy This Build
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
