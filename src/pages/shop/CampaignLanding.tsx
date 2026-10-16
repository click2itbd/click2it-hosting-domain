import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Product } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { Layout } from "../../components/Layout";
import { SEO } from "../../components/SEO";
import { PageLoader } from "../../components/Loading";

export const CampaignLanding: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaignProducts = async () => {
      try {
        setLoading(true);
        // Try to fetch products tagged with 'facebook'
        const fbQuery = query(
          collection(db, "products"),
          where("isExclusiveDeal", "==", true),
          limit(20)
        );
        let querySnapshot = await getDocs(fbQuery);
        let fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        // If no products found with 'facebook' tag, fallback to recent products for demo purposes
        if (fetchedProducts.length === 0) {
          const recentQuery = query(
            collection(db, "products"),
            orderBy("createdAt", "desc"),
            limit(12)
          );
          querySnapshot = await getDocs(recentQuery);
          fetchedProducts = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];
        }

        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching campaign products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignProducts();
  }, []);

  return (
    <Layout>
      <SEO
        title="Exclusive Facebook Offers"
        description="Check out our exclusive products from Facebook posts and promotions."
      />
      
      {/* Premium Campaign Banner */}
      <section className="relative overflow-hidden rounded-3xl mb-12 bg-slate-900 border border-slate-800 shadow-[0_20px_50px_rgba(8,_112,_184,_0.15)] group">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl group-hover:bg-blue-600/30 transition-all duration-700"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-all duration-700"></div>
        
        <div className="relative p-12 md:p-20 flex flex-col items-center text-center z-10 text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-300 font-semibold text-sm mb-6 uppercase tracking-widest backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Limited Time Offer
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-slate-300 drop-shadow-sm">
            Exclusive Deals
          </h1>
          <p className="text-lg md:text-xl max-w-2xl text-slate-300 font-medium leading-relaxed">
            Welcome! Explore our special handpicked products. Premium quality meets unbeatable prices. Grab them before stock runs out!
          </p>
        </div>
      </section>

      {/* Product Listing */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
          <h2 className="text-2xl font-bold text-[#081621] relative after:content-[''] after:absolute after:-bottom-[11px] after:left-0 after:w-16 after:h-1 after:bg-[#F97316]">
            Featured Products for You
          </h2>
        </div>

        {loading ? (
          <PageLoader />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">
              No exclusive products found right now. Check back later!
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
};
