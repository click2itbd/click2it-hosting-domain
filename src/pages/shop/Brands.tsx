import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';
import { Search, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Link } from 'react-router-dom';

interface BrandItem {
  name: string;
  category: 'Hardware' | 'Components' | 'Networking' | 'Hosting & Cloud' | 'Peripherals';
  description: string;
  featured?: boolean;
}

const allBrands: BrandItem[] = [
  // Hosting & Cloud
  { name: 'cPanel / WHM', category: 'Hosting & Cloud', description: 'Industry-standard web hosting management automation control panel.', featured: true },
  { name: 'CloudLinux', category: 'Hosting & Cloud', description: 'Enterprise Linux OS for shared web hosting with resource isolation.', featured: true },
  { name: 'Openprovider', category: 'Hosting & Cloud', description: 'ICANN-accredited domain registrar providing wholesale TLD registration.', featured: true },
  { name: 'LiteSpeed Web Server', category: 'Hosting & Cloud', description: 'High-performance, ultra-fast web server technology for WordPress sites.', featured: true },
  
  // Hardware & Laptops
  { name: 'Dell', category: 'Hardware', description: 'Inspiron, Vostro, Latitude laptops, enterprise OptiPlex desktops and PowerEdge servers.', featured: true },
  { name: 'HP', category: 'Hardware', description: 'Pavilion, ProBook, EliteBook, Victus, and OMEN gaming computing systems.', featured: true },
  { name: 'Lenovo', category: 'Hardware', description: 'ThinkPad, IdeaPad, Legion laptops and business workstations.', featured: true },
  { name: 'ASUS', category: 'Hardware', description: 'ROG, TUF Gaming, ZenBook, and VivoBook high-performance laptops.', featured: true },
  { name: 'Acer', category: 'Hardware', description: 'Aspire, Swift, Predator, and Nitro computing hardware solutions.' },
  { name: 'Apple', category: 'Hardware', description: 'MacBook Pro, MacBook Air, Mac mini, and iMac systems powered by Apple Silicon.' },

  // Components & Processors
  { name: 'Intel', category: 'Components', description: 'Core i3, i5, i7, i9 and Xeon server microprocessors.', featured: true },
  { name: 'AMD', category: 'Components', description: 'Ryzen 3, 5, 7, 9 processors and Radeon graphics cards.', featured: true },
  { name: 'NVIDIA', category: 'Components', description: 'GeForce RTX gaming graphics and enterprise AI computing GPUs.', featured: true },
  { name: 'Gigabyte / AORUS', category: 'Components', description: 'Motherboards, graphics cards, and gaming components.' },
  { name: 'MSI', category: 'Components', description: 'Gaming motherboards, graphics cards, and high-performance monitors.' },
  { name: 'Corsair', category: 'Components', description: 'DDR4/DDR5 gaming RAM, power supplies, liquid coolers, and PC cases.' },
  { name: 'Kingston', category: 'Components', description: 'Fury DDR4/DDR5 desktop RAM and NVMe PCIe solid-state drives.' },
  { name: 'Western Digital (WD)', category: 'Components', description: 'WD Blue, Black, Green, and Red NAS hard drives and NVMe SSDs.' },
  { name: 'Samsung', category: 'Components', description: 'EVO & PRO PCIe 4.0/5.0 NVMe SSDs and high-refresh gaming displays.' },

  // Networking
  { name: 'TP-Link', category: 'Networking', description: 'Archer Wi-Fi 6 routers, gigabit switches, and smart home networking.', featured: true },
  { name: 'MikroTik', category: 'Networking', description: 'RouterBOARDs, Cloud Core routers, and ISP-grade networking devices.', featured: true },
  { name: 'Cisco', category: 'Networking', description: 'Enterprise switches, firewalls, and industrial networking infrastructure.' },
  { name: 'D-Link', category: 'Networking', description: 'Wireless access points, gigabit Ethernet switches, and modems.' },
  { name: 'Tenda', category: 'Networking', description: 'Dual-band mesh Wi-Fi systems and affordable home wireless routers.' },

  // Peripherals
  { name: 'Logitech', category: 'Peripherals', description: 'Wireless keyboards, MX Master mice, gaming headsets, and webcams.', featured: true },
  { name: 'Razer', category: 'Peripherals', description: 'Chroma RGB mechanical keyboards, precision mice, and streaming gear.' },
  { name: 'A4Tech / Bloody', category: 'Peripherals', description: 'Affordable office & gaming keyboards, optical mice, and web cameras.' },
  { name: 'Fantech', category: 'Peripherals', description: 'Gaming peripherals, RGB headsets, microphones, and mouse pads.' },
];

export const Brands = () => {
  const { settings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Hosting & Cloud', 'Hardware', 'Components', 'Networking', 'Peripherals'];

  const filteredBrands = allBrands.filter((brand) => {
    const matchesCategory = selectedCategory === 'All' || brand.category === selectedCategory;
    const matchesSearch = brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          brand.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout fullWidth>
      <SEO 
        title={`Authorized Brands & Technology Partners - ${settings.brandName}`} 
        description={`Explore genuine hardware brands, computer peripherals, and cloud technology partners available at ${settings.brandName}.`} 
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white py-14 md:py-18">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Official Authorized Partners
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Top Global Tech & Cloud Brands
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8">
            We partner directly with leading worldwide IT hardware manufacturers and cloud infrastructure providers to guarantee 100% genuine products with official manufacturer warranty.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search brands (e.g. Dell, cPanel, Intel, ASUS, TP-Link)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm backdrop-blur-md"
            />
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBrands.map((brand) => (
              <div 
                key={brand.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wide">
                      {brand.category}
                    </span>
                    {brand.featured && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <CheckCircle2 size={12} /> Official
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                    {brand.name}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {brand.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <Link 
                    to={brand.category === 'Hosting & Cloud' ? '/services' : `/shop?search=${encodeURIComponent(brand.name)}`}
                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:underline"
                  >
                    View Products <ExternalLink size={12} />
                  </Link>
                  <span className="text-gray-400">100% Genuine</span>
                </div>
              </div>
            ))}
          </div>

          {filteredBrands.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 max-w-md mx-auto">
              <p className="text-gray-500 font-medium">No brands found matching "{searchQuery}"</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 text-sm text-blue-600 font-bold hover:underline"
              >
                Clear Search Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Brands;
