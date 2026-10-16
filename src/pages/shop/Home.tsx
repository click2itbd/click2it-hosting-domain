import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { Product, NavigationMenu } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { Layout } from "../../components/Layout";
import { HeroBanner } from "../../components/HeroBanner";
import {
  ChevronRight,
  Laptop,
  Cpu,
  Monitor,
  MousePointer2,
  Fan,
  Server,
  Database,
  HardDrive,
  Plug,
  Keyboard,
  Mouse,
  BatteryCharging,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { SEO } from "../../components/SEO";
import { formatCurrency } from "../../lib/utils";
import { ServerCog, Globe, Cctv, Smartphone, Code, Briefcase, ChevronLeft, Truck, ShieldCheck, Award, HeadphonesIcon } from "lucide-react";
import {
  FlashSale,
  ProductCarousel,
  PromoBentoGrid,
  TopBrands,
  Testimonials,
} from "../../components/home/HomeSections";

const getPlaceholder = (slug: string) => {
  const map: Record<string, string> = {
    'cpu': 'cpu_placeholder.jpg',
    'cpu-cooler': 'cooler_placeholder.jpg',
    'motherboard': 'motherboard_placeholder.jpg',
    'ram': 'ram_placeholder.jpg',
    'storage': 'storage_placeholder.jpg',
    'graphics-card': 'gpu_placeholder.jpg',
    'power-supply': 'psu_placeholder.jpg',
    'casing': 'casing_placeholder.jpg',
    'monitor': 'monitor_placeholder.jpg',
    'casing-cooler': 'cooler_placeholder.jpg',
    'keyboard': 'keyboard_placeholder.jpg',
    'mouse': 'mouse_placeholder.jpg',
    'speaker': 'speaker_placeholder.jpg',
    'headphone': 'headphone_placeholder.jpg',
    'ups': 'ups_placeholder.jpg',
    'cctv-camera': 'cctv_placeholder.jpg'
  };
  return map[slug] ? '/images/placeholders/' + map[slug] : '/images/placeholders/cpu_placeholder.jpg';
};

export const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pcBuilderBanner, setPcBuilderBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    const q = query(collection(db, 'store_banners'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeBanners = snapshot.docs.map(doc => doc.data()).filter(b => b.isActive);
      const pb = activeBanners.find(b => b.position === 'pc_builder');
      if (pb) setPcBuilderBanner(pb);
    }, () => {});
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc"),
      limit(12),
    );

    const unsubscribeProducts = onSnapshot(q, (querySnapshot) => {
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsData.filter(p => p.showInStore !== false));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    const menusQuery = query(
      collection(db, "menus"),
      orderBy("order", "asc")
    );

    const unsubscribeMenus = onSnapshot(menusQuery, (querySnapshot) => {
      const menusData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NavigationMenu[];
      
      const allItems = menusData.flatMap(menu => {
        const items = [];
        items.push({ name: menu.name, slug: menu.slug, imageUrl: menu.imageUrl, parentSlug: null, isFeatured: menu.isFeatured });
        if (menu.subCategories) {
            menu.subCategories.forEach(sub => {
              items.push({ name: sub.name, slug: sub.slug, imageUrl: sub.imageUrl, parentSlug: menu.slug, isFeatured: sub.isFeatured });
              
              if ((sub as any).subCategories) {
                (sub as any).subCategories.forEach((subSub: any) => {
                  items.push({ name: subSub.name, slug: subSub.slug, imageUrl: subSub.imageUrl, parentSlug: menu.slug + '/' + sub.slug, isFeatured: subSub.isFeatured });
                });
              }
            });
          }
        return items;
      });

      const displayItems = allItems.filter(item => item.isFeatured);
        // Fallback for old setups that don't have isFeatured set yet
        if (displayItems.length === 0) {
          const withImage = allItems.filter(item => item.imageUrl);
          if (withImage.length > 0) {
            displayItems.push(...withImage);
          } else {
            displayItems.push(...allItems.slice(0, 16));
          }
        }

      setCategories(displayItems as any[]);
    }, (error) => {
      console.error("Error fetching menus:", error);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeMenus();
    };
  }, []);

  return (
    <Layout>
      <SEO
        title="Leading Computer Shop, Laptop & Custom PC Builder in BD | CLICK2IT"
        description="Buy original laptops, desktop computers, gaming PC components, monitors, CCTV and gadgets at best price in Bangladesh from CLICK2IT. Fast delivery and warranty."
        keywords="computer shop bd, best tech shop bangladesh, laptop price bd, gaming pc build, pc components dhaka, buy computer online bd, click2it shop"
        canonical="https://click2itbd.com/"
      />
      {/* Hero Section */}
      <HeroBanner />

      {/* Core Business Services */}
      <section className="mb-12 mt-8">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-[#081621] relative after:content-[''] after:absolute after:-bottom-[11px] after:left-0 after:w-16 after:h-1 after:bg-[#F97316]">
            Our Core Services
          </h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { title: "IT Service", icon: <ServerCog size={28} className="text-indigo-500" />, link: "/services", bg: "bg-indigo-50" },
            { title: "Domain/Hosting", icon: <Globe size={28} className="text-blue-500" />, link: "/hosting", bg: "bg-blue-50" },
            { title: "CCTV Service", icon: <Cctv size={28} className="text-red-500" />, link: "/services", bg: "bg-red-50" },
            { title: "Electronics", icon: <Smartphone size={28} className="text-cyan-500" />, link: "/shop", bg: "bg-cyan-50" },
            { title: "PC Build", icon: <Monitor size={28} className="text-orange-500" />, link: "/pc-builder", bg: "bg-orange-50" },
            { title: "Web Dev", icon: <Code size={28} className="text-emerald-500" />, link: "/services", bg: "bg-emerald-50" },
            { title: "Office Setup", icon: <Briefcase size={28} className="text-purple-500" />, link: "/services", bg: "bg-purple-50" },
          ].map((service, index) => (
            <Link key={index} to={service.link} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group">
              <div className={`w-14 h-14 ${service.bg} rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                {service.icon}
              </div>
              <h3 className="font-bold text-slate-800 text-sm text-center">{service.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      

      {/* Categories */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-[#081621] relative after:content-[''] after:absolute after:-bottom-[11px] after:left-0 after:w-16 after:h-1 after:bg-[#F97316]">
            Featured Categories
          </h2>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-10">
          {categories.map((cat) => (
            <Link
              key={cat.id || cat.name}
              to={cat.parentSlug ? `/category/${cat.parentSlug}/${cat.slug}` : `/category/${cat.slug}`}
              className="flex flex-col items-center justify-start gap-3 group cursor-pointer"
            >
              <div className="h-20 w-20 md:h-24 md:w-24 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img
                  src={cat.imageUrl || getPlaceholder(cat.slug)}
                  alt={cat.name}
                  className="max-h-full max-w-full object-contain mix-blend-multiply contrast-125 brightness-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getPlaceholder(cat.slug);
                  }}
                />
              </div>
              <span className="font-medium text-gray-800 text-xs md:text-[14px] text-center leading-tight group-hover:text-orange-500 transition-colors px-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash Sale */}
      {products.length > 0 && <FlashSale products={products} />}

      {/* New Arrivals */}
      <ProductCarousel title="New Arrivals" products={products.filter(p => p.isNewArrival).slice(0, 8).length > 0 ? products.filter(p => p.isNewArrival).slice(0, 8) : products.slice(0, 8)} />

      {/* Promo Bento Grid */}
      <PromoBentoGrid />

      {/* Best Sellers */}
      <ProductCarousel
        title="Best Sellers"
        products={products.filter(p => p.isBestSeller).slice(0, 8).length > 0 ? products.filter(p => p.isBestSeller).slice(0, 8) : products.slice().reverse().slice(0, 8)}
      />

      {/* Promotional Banner */}
      {/* Top Brands */}
      <TopBrands />

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-[#081621] relative after:content-[''] after:absolute after:-bottom-[11px] after:left-0 after:w-16 after:h-1 after:bg-[#F97316]">
            Featured Products
          </h2>
          <Link
            to="/shop"
            className="text-[#F97316] font-bold text-sm hover:underline flex items-center"
          >
            View All <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"
              ></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {products.slice(0, 16).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">
              No products found. Add some in the admin panel!
            </p>
          </div>
        )}
      </section>

      {/* About & SEO Description */}

      {/* New Beautiful PC Builder Banner */}
      <section className="mt-12 md:mt-16 mb-8">
        <Link to={pcBuilderBanner?.targetUrl || "/pc-builder"} className="block relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lg md:shadow-2xl group w-full aspect-[16/9] sm:aspect-[1.85/1] md:aspect-[2.1/1] lg:aspect-[2.4/1]">
          <img 
            src={pcBuilderBanner?.imageUrl || "/pc-builder-banner-v2.jpg"} 
            alt="PC Builder" 
            className="absolute inset-0 w-full h-full object-cover object-left sm:object-center group-hover:scale-[1.02] transition-transform duration-700" 
          />
        </Link>
      </section>
      {/* Features Section (Moved to Bottom) */}
      <section className="mb-10 px-4 md:px-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316] group-hover:scale-110 group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300">
              <Truck size={28} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-0.5">Fast Delivery</h4>
              <p className="text-xs text-slate-500">All over Bangladesh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 group lg:border-l border-slate-100 lg:pl-6">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-0.5">Secure Payment</h4>
              <p className="text-xs text-slate-500">100% secure checkout</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 group lg:border-l border-slate-100 lg:pl-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <Award size={28} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-0.5">Genuine Products</h4>
              <p className="text-xs text-slate-500">Brand warranty</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 group lg:border-l border-slate-100 lg:pl-6">
            <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
              <HeadphonesIcon size={28} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-0.5">24/7 Support</h4>
              <p className="text-xs text-slate-500">Dedicated help desk</p>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
};

