import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Clock, Zap, ShieldCheck } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../ProductCard';
import { formatCurrency } from '../../lib/utils';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// --- Top Brands ---
export const TopBrands = () => {
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'store_brands'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeBrands = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; isActive?: boolean }))
        .filter(b => b.isActive !== false);
      setBrands(activeBrands);
    });
    return () => unsubscribe();
  }, []);

  const defaultBrands = [
    { name: 'Intel', logo: '/images/brands/intel.svg' },
    { name: 'AMD', logo: '/images/brands/amd.svg' },
    { name: 'Asus', logo: '/images/brands/asus.svg' },
    { name: 'MSI', logo: '/images/brands/msi.svg' },
    { name: 'Gigabyte', logo: '/images/brands/gigabyte.svg' },
    { name: 'KingSpec', logo: '/images/brands/kingspec.svg' },
    { name: 'Value-Top', logo: '/images/brands/valuetop.svg' },
    { name: 'Logitech', logo: '/images/brands/logitech.svg' }
  ];

  const displayBrands = brands.length > 0 ? brands : defaultBrands;

  const fallbackSvg = (text: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 50'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='bold' font-size='24' fill='%23333'%3E${text}%3C/text%3E%3C/svg%3E`;
  
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Star className="text-[#F97316]" /> Top Brands
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
        {displayBrands.map((brand, idx) => (
          <div key={brand.id || idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group grayscale hover:grayscale-0">
            <img src={brand.logo} alt={brand.name} onError={(e) => { e.currentTarget.src = fallbackSvg(brand.name); }} className="h-12 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" title={brand.name} />
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Flash Sale ---
export const FlashSale = ({ products }: { products: Product[] }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [config, setConfig] = useState<any>({ enabled: false, title: 'Flash Sale', endTime: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'store_banners', 'ecommerce_flash_sale'));
        if (snap.exists()) {
          setConfig(snap.data());
        }
      } catch (e) {
        console.error('Failed to fetch flash sale config', e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!config.endTime) return;
    const endDate = new Date(config.endTime).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate - now;
      
      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [config.endTime]);

  if (!config.enabled) return null;

  const flashProducts = products.filter(p => p.isFlashSale);
  
  if (flashProducts.length === 0) return null;

  return (
    <section className="mb-12 bg-gradient-to-r from-[#081621] to-[#142270] rounded-2xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden mt-8">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 relative z-10 gap-2 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-400 font-bold mb-2">
            <Zap size={20} className="fill-orange-400" />
            <span>LIMITED TIME OFFER</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black">{config.title || 'Flash Sale'}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">Ends in:</span>
          <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-center border border-white/10">
              <span className="block text-xl font-bold text-orange-400">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase text-gray-400">Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-center border border-white/10">
              <span className="block text-xl font-bold text-orange-400">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase text-gray-400">Hrs</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-center border border-white/10">
              <span className="block text-xl font-bold text-orange-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase text-gray-400">Min</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-center border border-white/10">
              <span className="block text-xl font-bold text-orange-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase text-gray-400">Sec</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 relative z-10">
        {flashProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl text-[#081621] p-1 transform transition-transform hover:-translate-y-1">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Product Carousel ---
export const ProductCarousel = ({ title, products }: { title: string, products: Product[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-[#081621] relative after:content-[''] after:absolute after:-bottom-[11px] after:left-0 after:w-16 after:h-1 after:bg-[#F97316]">
          {title}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 hover:bg-[#F97316] hover:text-white hover:border-[#F97316] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 hover:bg-[#F97316] hover:text-white hover:border-[#F97316] transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-4 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map(product => (
          <div key={product.id} className="min-w-[160px] max-w-[160px] sm:min-w-[280px] sm:max-w-[280px] shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Promo Bento Grid ---
export const PromoBentoGrid = () => {
  const [promoBanners, setPromoBanners] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'store_banners'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((b: any) => b.isActive);
        const leftPromo = activeDocs.find((b: any) => b.position === 'promo_banner_left' || (b.position === 'promo_banner' && b.order === 0));
        const rightPromo = activeDocs.find((b: any) => b.position === 'promo_banner_right' || (b.position === 'promo_banner' && b.order === 1));
        
        const combinedPromos = [];
        if (leftPromo) combinedPromos.push(leftPromo);
        if (rightPromo) combinedPromos.push(rightPromo);
        
        setPromoBanners(combinedPromos);
    });
    return () => unsubscribe();
  }, []);

  const banner1 = promoBanners[0];
  const banner2 = promoBanners[1];

  return (
    <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
      <Link to={banner1?.targetUrl || "/category/laptop"} className="md:col-span-2 relative rounded-2xl overflow-hidden group h-[250px] bg-gradient-to-r from-gray-900 to-gray-800">
        <img src={banner1?.imageUrl || "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1000&auto=format&fit=crop"} alt={banner1?.title || "Laptops"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        
      </Link>
      
      <Link to={banner2?.targetUrl || "/category/accessories"} className="md:col-span-1 relative rounded-2xl overflow-hidden group h-[250px] bg-gradient-to-br from-blue-900 to-indigo-900">
        <img src={banner2?.imageUrl || "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1000&auto=format&fit=crop"} alt={banner2?.title || "Accessories"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        
      </Link>
    </section>
  );
};

// --- Testimonials ---
export const Testimonials = () => {
  const reviews = [
    { name: 'Rahim Uddin', role: 'Gamer', comment: 'Built my dream PC from Click2IT. The cable management was flawless and delivery was super fast!', rating: 5 },
    { name: 'Sanjida Akter', role: 'Freelancer', comment: 'Bought a Macbook Pro for my design work. Best price in the market and very professional behavior.', rating: 5 },
    { name: 'Tanvir Hasan', role: 'Software Engineer', comment: 'Their after-sales support is unmatched. Had an issue with my RAM, they replaced it within 2 days.', rating: 5 }
  ];

  return (
    <section className="mb-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-[#081621] mb-4">What Our Customers Say</h2>
        <p className="text-gray-600">Thousands of happy customers across Bangladesh</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-1 text-orange-400 mb-4">
              {[...Array(review.rating)].map((_, i) => <Star key={i} size={18} className="fill-orange-400" />)}
            </div>
            <p className="text-gray-600 mb-6 italic">"{review.comment}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#081621]">
                {review.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-[#081621] text-sm">{review.name}</h4>
                <p className="text-xs text-gray-500">{review.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
