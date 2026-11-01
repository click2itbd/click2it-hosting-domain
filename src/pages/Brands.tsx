import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { SEO } from '../components/SEO';
import { Search, ExternalLink, Sparkles, CheckCircle2, Server, ShieldCheck, Globe, Cpu } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { Link } from 'react-router-dom';

interface BrandItem {
  name: string;
  category:
    | 'Control Panels & Automation'
    | 'OS & Virtualization'
    | 'Web Server & Performance'
    | 'Domain & SSL Registries'
    | 'Security & Backups'
    | 'Data Center Infrastructure';
  description: string;
  link: string;
  linkLabel: string;
  badge: string;
  featured?: boolean;
}

const allBrands: BrandItem[] = [
  // Control Panels & Automation
  {
    name: 'cPanel & WHM',
    category: 'Control Panels & Automation',
    description: 'The industry-standard web hosting control panel for effortless domain, email, database, and file management.',
    link: '/hosting',
    linkLabel: 'Explore cPanel Hosting',
    badge: 'Licensed Partner',
    featured: true,
  },
  {
    name: 'Softaculous Auto Installer',
    category: 'Control Panels & Automation',
    description: 'One-click deployment engine for WordPress, WooCommerce, Laravel, Joomla, and 400+ web applications.',
    link: '/hosting',
    linkLabel: 'View Hosting Plans',
    badge: 'Included Free',
    featured: true,
  },
  {
    name: 'Virtualizor / KVM',
    category: 'Control Panels & Automation',
    description: 'Enterprise KVM cloud virtualization panel offering instant OS reinstallation, VNC console, and power controls.',
    link: '/vps',
    linkLabel: 'Explore Cloud VPS',
    badge: 'VPS Engine',
    featured: true,
  },
  {
    name: 'WP Toolkit Deluxe',
    category: 'Control Panels & Automation',
    description: 'Complete WordPress management suite with staging environments, smart updates, cloning, and security hardening.',
    link: '/hosting',
    linkLabel: 'View WordPress Cloud',
    badge: 'WordPress Cloud',
  },

  // OS & Virtualization
  {
    name: 'CloudLinux OS',
    category: 'OS & Virtualization',
    description: 'Enterprise Linux OS designed for shared hosting providers with LVE resource isolation, CageFS, and HardenedPHP.',
    link: '/hosting',
    linkLabel: 'View CloudLinux Plans',
    badge: 'Official Partner',
    featured: true,
  },
  {
    name: 'AlmaLinux & Rocky Linux',
    category: 'OS & Virtualization',
    description: '1:1 binary-compatible enterprise RHEL Linux distributions powering our high-stability cPanel and VPS nodes.',
    link: '/vps',
    linkLabel: 'Deploy Linux VPS',
    badge: 'Enterprise OS',
  },
  {
    name: 'Ubuntu & Debian Server',
    category: 'OS & Virtualization',
    description: 'The most popular Linux server operating systems for modern Docker, Node.js, Python, and cloud-native workloads.',
    link: '/vps',
    linkLabel: 'Deploy Ubuntu VPS',
    badge: 'VPS Ready',
  },

  // Web Server & Performance
  {
    name: 'LiteSpeed Web Server',
    category: 'Web Server & Performance',
    description: 'Drop-in Apache replacement delivering up to 10x faster WordPress performance with built-in LSCache and HTTP/3 QUIC.',
    link: '/hosting',
    linkLabel: 'Experience LiteSpeed',
    badge: 'Turbo Speed',
    featured: true,
  },
  {
    name: 'Cloudflare CDN & DNS',
    category: 'Web Server & Performance',
    description: 'Global Anycast DNS, edge caching, and DDoS mitigation network integrated seamlessly with our hosting platform.',
    link: '/domain',
    linkLabel: 'Manage Domains',
    badge: 'Global Edge',
    featured: true,
  },
  {
    name: 'Redis & Memcached',
    category: 'Web Server & Performance',
    description: 'In-memory object caching engines that dramatically accelerate dynamic database queries for WordPress and WooCommerce.',
    link: '/hosting',
    linkLabel: 'View Turbo Cloud',
    badge: 'Object Cache',
  },

  // Domain & SSL Registries
  {
    name: 'ICANN / Openprovider',
    category: 'Domain & SSL Registries',
    description: 'Accredited global domain registration gateway supporting .com, .net, .org, .xyz, .io, .ai, and 500+ gTLDs.',
    link: '/domain',
    linkLabel: 'Search Domains',
    badge: 'Accredited Gateway',
    featured: true,
  },
  {
    name: 'BTCL (.bd & .বাংলা)',
    category: 'Domain & SSL Registries',
    description: 'Official Bangladeshi country-code top-level domain (.com.bd, .bd, .বাংলা) registration and management support.',
    link: '/domain/bd',
    linkLabel: 'Register .BD Domain',
    badge: 'BD Registry',
    featured: true,
  },
  {
    name: 'Sectigo (Comodo) SSL',
    category: 'Domain & SSL Registries',
    description: 'World-leading commercial Certificate Authority providing PositiveSSL, Wildcard SSL, and EV SSL with warranty protection.',
    link: '/ssl',
    linkLabel: 'View SSL Certificates',
    badge: 'Official CA',
    featured: true,
  },
  {
    name: "Let's Encrypt AutoSSL",
    category: 'Domain & SSL Registries',
    description: 'Automated, zero-cost DV SSL/TLS certificates automatically issued and renewed for every hosted domain.',
    link: '/ssl',
    linkLabel: 'Learn About SSL',
    badge: 'Free Automated',
  },

  // Security & Backups
  {
    name: 'Imunify360 Security',
    category: 'Security & Backups',
    description: 'AI-driven 6-layer web server security suite with real-time malware scanning, WAF firewall, and proactive defense.',
    link: '/hosting',
    linkLabel: 'Protected Hosting',
    badge: 'Active Shield',
    featured: true,
  },
  {
    name: 'JetBackup Enterprise',
    category: 'Security & Backups',
    description: 'Automated off-site daily and weekly backup software allowing one-click self-service restoration from cPanel.',
    link: '/hosting',
    linkLabel: 'View Backup Features',
    badge: 'Data Safety',
    featured: true,
  },
  {
    name: 'KernelCare Live Patching',
    category: 'Security & Backups',
    description: 'Automated zero-downtime Linux kernel security patching without requiring server reboots.',
    link: '/status',
    linkLabel: 'Check 99.9% Uptime',
    badge: 'Zero Reboot',
  },

  // Data Center Infrastructure
  {
    name: 'AMD EPYC™ & Intel® Xeon® Nodes',
    category: 'Data Center Infrastructure',
    description: 'High-frequency enterprise server processors powering our shared cloud clusters and KVM VPS hypervisors.',
    link: '/vps',
    linkLabel: 'Explore VPS Specs',
    badge: 'Tier-3+ Nodes',
    featured: true,
  },
  {
    name: 'Samsung Datacenter NVMe RAID-10',
    category: 'Data Center Infrastructure',
    description: 'Enterprise PCIe Gen4 NVMe solid-state storage arrays delivering ultra-low I/O latency and maximum data durability.',
    link: '/pricing',
    linkLabel: 'Compare Storage Plans',
    badge: 'Pure NVMe',
  },
];

export const Brands = () => {
  const { settings } = useSettings();
  const brandName = settings?.brandName || 'Click2IT BD';
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'All',
    'Control Panels & Automation',
    'OS & Virtualization',
    'Web Server & Performance',
    'Domain & SSL Registries',
    'Security & Backups',
    'Data Center Infrastructure',
  ];

  const filteredBrands = allBrands.filter((brand) => {
    const matchesCategory = selectedCategory === 'All' || brand.category === selectedCategory;
    const matchesSearch =
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout fullWidth>
      <SEO
        title={`Technology Partners & Cloud Infrastructure Brands - ${brandName}`}
        description={`Explore the enterprise web hosting, domain registry, SSL, security, and cloud server technology partners powering ${brandName}.`}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-black text-white py-14 md:py-20">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Enterprise Hosting &amp; Domain Ecosystem
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Our Cloud, Hosting &amp; Domain Technology Brands
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8">
            We partner exclusively with industry-leading cloud software vendors, ICANN-accredited domain registries, and Tier-3+ server infrastructure providers to guarantee 99.9% uptime and blazing-fast website speed.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search hosting & domain technologies (e.g. cPanel, CloudLinux, LiteSpeed, BTCL, Imunify360)..."
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
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBrands.map((brand) => (
              <div
                key={brand.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                      {brand.category}
                    </span>
                    {brand.featured && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                        <CheckCircle2 size={12} /> {brand.badge}
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
                    to={brand.link}
                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:underline"
                  >
                    {brand.linkLabel} <ExternalLink size={12} />
                  </Link>
                  <span className="text-gray-400 font-medium">100% Genuine License</span>
                </div>
              </div>
            ))}
          </div>

          {filteredBrands.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 max-w-md mx-auto">
              <p className="text-gray-500 font-medium">No technology brands found matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 text-sm text-blue-600 font-bold hover:underline"
              >
                Clear Search Filters
              </button>
            </div>
          )}

          {/* Bottom Infrastructure Guarantee Strip */}
          <div className="mt-14 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                <Server size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">100% Original Server Licenses</h4>
                <p className="text-xs text-gray-500 mt-1">
                  All our cPanel, CloudLinux, LiteSpeed, and Imunify360 deployments run on official verified licenses—never nulled or cracked software.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                <Globe size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Direct Registry Connectivity</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Instant API integration with ICANN-accredited registrars and official BTCL .bd domain channels for full domain ownership control.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Enterprise SLA &amp; Security</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Backed by RAID-10 NVMe storage, automated off-site JetBackup snapshots, and 24/7 system administrator monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Brands;
