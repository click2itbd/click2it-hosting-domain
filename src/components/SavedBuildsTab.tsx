import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Cpu, Trash2, ExternalLink, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface SavedBuild {
  id: string;
  name: string;
  userId: string;
  components: Record<string, Product>;
  totalPrice: number;
  createdAt: any;
}

export const SavedBuildsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchBuilds();
  }, [userId]);

  const fetchBuilds = async () => {
    try {
      const q = query(
        collection(db, 'saved_builds'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedBuild));
      setBuilds(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load saved builds');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this build?')) return;
    try {
      await deleteDoc(doc(db, 'saved_builds', id));
      setBuilds(prev => prev.filter(b => b.id !== id));
      toast.success('Build deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete build');
    }
  };

  const handleLoadBuild = (build: SavedBuild) => {
    // Save to local storage so PC builder loads it on init
    localStorage.setItem('savedPcBuild', JSON.stringify(build.components));
    toast.success('Build loaded into PC Builder!');
    navigate('/pc-build');
  };

  const handleAddToCart = (build: SavedBuild) => {
    const products = Object.values(build.components).filter(Boolean) as Product[];
    if (products.length === 0) return;

    let addedCount = 0;
    products.forEach(product => {
      addToCart(product);
      addedCount++;
    });
    toast.success(`Added ${addedCount} parts to cart!`);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Cpu className="text-slate-400" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No saved builds yet</h3>
        <p className="text-slate-500 mt-2 mb-6">Create your dream PC and save it here.</p>
        <button
          onClick={() => navigate('/pc-build')}
          className="px-6 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors"
        >
          Go to PC Builder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saved PC Builds</h2>
          <p className="text-slate-500 mt-1">Manage and purchase your dream rigs.</p>
        </div>
        <button
          onClick={() => navigate('/pc-build')}
          className="px-5 py-2 text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
        >
          + New Build
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {builds.map(build => {
          const partsList = Object.values(build.components).filter(Boolean) as Product[];
          
          return (
            <div key={build.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col transition-shadow hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{build.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {build.createdAt?.toDate ? build.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(build.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete build"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-grow bg-slate-50 rounded-xl p-3 mb-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {partsList.map(part => (
                  <div key={part.id} className="text-xs text-slate-600 flex gap-2">
                    <span className="text-slate-400 shrink-0">•</span>
                    <span className="line-clamp-1">{part.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(build.totalPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Parts</p>
                  <p className="text-lg font-black text-slate-700">{partsList.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={() => handleLoadBuild(build)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm rounded-xl transition-colors"
                >
                  <ExternalLink size={16} /> Edit
                </button>
                <button
                  onClick={() => handleAddToCart(build)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 text-white hover:bg-violet-700 font-bold text-sm rounded-xl transition-colors"
                >
                  <ShoppingCart size={16} /> Buy
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
