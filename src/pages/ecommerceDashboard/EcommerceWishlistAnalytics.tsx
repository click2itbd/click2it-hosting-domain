import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Heart, Search, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WishlistItem {
  productId: string;
  name: string;
  imageUrl?: string;
  price: number;
  wishlistCount: number;
  recentAdds: number; // Last 7 days
}

export const EcommerceWishlistAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistProducts, setWishlistProducts] = useState<WishlistItem[]>([]);
  
  const [stats, setStats] = useState({
    totalWishlistedProducts: 0,
    totalUsersWithWishlist: 0,
    mostWishlisted: ''
  });

  useEffect(() => {
    fetchWishlistData();
  }, []);

  const fetchWishlistData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'wishlists'));
      const counts: Record<string, { count: number; recent: number; name: string; price: number; img: string }> = {};
      let users = 0;
      const weekAgo = Date.now() - 7 * 86400000;

      snap.docs.forEach(d => {
        const data: any = d.data();
        const items: any[] = data.items || [];
        if (items.length > 0) users++;
        const isRecent = data.updatedAt && new Date(data.updatedAt).getTime() >= weekAgo;
        items.forEach(it => {
          if (!it.productId) return;
          if (!counts[it.productId]) counts[it.productId] = { count: 0, recent: 0, name: it.name || 'Unknown', price: it.price || 0, img: it.imageUrl || '' };
          counts[it.productId].count++;
          if (isRecent) counts[it.productId].recent++;
        });
      });

      const list: WishlistItem[] = Object.entries(counts)
        .map(([productId, v]) => ({ productId, name: v.name, imageUrl: v.img, price: v.price, wishlistCount: v.count, recentAdds: v.recent }))
        .sort((a, b) => b.wishlistCount - a.wishlistCount);

      setWishlistProducts(list);
      setStats({
        totalWishlistedProducts: list.reduce((s, p) => s + p.wishlistCount, 0),
        totalUsersWithWishlist: users,
        mostWishlisted: list[0]?.name || 'None'
      });
    } catch (error) {
      console.error('Wishlist analytics error', error);
      setWishlistProducts([]);
      setStats({ totalWishlistedProducts: 0, totalUsersWithWishlist: 0, mostWishlisted: 'None' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = wishlistProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Wishlist Analytics</h2>
        <p className="text-gray-500 text-sm mt-1">See which products customers want the most to plan discounts and stock.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 shrink-0">
            <Heart size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Wishlists Items</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalWishlistedProducts}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Users with Wishlist</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsersWithWishlist}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Most Wanted</p>
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{stats.mostWishlisted}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <h3 className="font-bold text-gray-900">Most Wishlisted Products</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4 text-center">Price</th>
                  <th className="px-6 py-4 text-center">Total Saves</th>
                  <th className="px-6 py-4 text-center">Recent Saves (7d)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.imageUrl || "https://placehold.co/80x80?text=No+Img"} alt={product.name} className="w-10 h-10 rounded border border-gray-200 object-cover" />
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">৳{product.price}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-pink-50 text-pink-700 font-bold px-3 py-1 rounded-full gap-1.5">
                        <Heart size={14} className="fill-pink-700" /> {product.wishlistCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                        <TrendingUp size={14} /> +{product.recentAdds}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/e-commerce?tab=inventory&edit=${product.productId}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                        <ExternalLink size={14} /> Set Discount
                      </Link>
                    </td>
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No wishlisted products yet. Data appears when logged-in customers add items to their wishlist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
