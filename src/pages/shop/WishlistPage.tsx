import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { Layout } from '../../components/Layout';
import { ProductCard } from '../../components/ProductCard';

export const WishlistPage: React.FC = () => {
  const { wishlist } = useWishlist();

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen pb-16 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3 mb-8">
            <Heart className="text-[#F97316] fill-[#F97316]" size={28} />
            <h1 className="text-2xl md:text-3xl font-bold text-[#081621]">My Wishlist</h1>
            <span className="bg-[#081621] text-white text-xs font-bold px-3 py-1 rounded-full ml-2">
              {wishlist.length} Items
            </span>
          </div>

          {wishlist.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <Heart size={40} className="text-[#F97316]" />
              </div>
              <h2 className="text-2xl font-bold text-[#081621] mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-8 max-w-md">
                Looks like you haven't added anything to your wishlist yet. Explore our products and find something you love!
              </p>
              <Link 
                to="/category/components"
                className="bg-[#081621] hover:bg-[#F97316] text-white px-8 py-3 rounded-md font-bold transition-colors flex items-center gap-2"
              >
                <ShoppingBag size={18} />
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {wishlist.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};
