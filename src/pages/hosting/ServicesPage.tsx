import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Zap, 
  Database, 
  Cloud,
  MousePointerClick,
  Globe,
  Rocket,
  ArrowRight,
  Server,
  Cpu,
  Lock,
  Headphones,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/hosting/PageHeader';
import ServicesGrid from '../hosting-sections/ServicesGrid';
import { SEO } from '../../components/SEO';
import { useSettings } from '../../context/SettingsContext';

const techStack = [
  { name: 'LiteSpeed Web Server', desc: 'Up to 10x faster page loading speeds than Apache with native LSCache acceleration.', icon: Zap, color: 'text-amber-500 bg-amber-50' },
  { name: 'CloudLinux OS + CageFS', desc: 'Guaranteed resource isolation preventing rogue accounts from impacting your site performance.', icon: Server, color: 'text-blue-500 bg-blue-50' },
  { name: 'cPanel & WHM Control Panel', desc: 'Industry-standard graphical dashboard for effortless file, database, DNS, and email management.', icon: Globe, color: 'text-purple-500 bg-purple-50' },
  { name: 'Pure Enterprise NVMe SSD', desc: 'Blazing fast RAID-10 storage arrays with ultra-low latency read/write speeds.', icon: Database, color: 'text-emerald-500 bg-emerald-50' },
  { name: 'Imunify360 & DDoS Shield', desc: 'Automated malware scanning, web application firewall (WAF), and real-time defense.', icon: Shield, color: 'text-red-500 bg-red-50' },
  { name: 'Multi-Language Runtimes', desc: 'Support for PHP (7.4 - 8.3), Node.js, Python, Ruby, and Git version control integration.', icon: Cpu, color: 'text-indigo-500 bg-indigo-50' },
];

const comparisonRows = [
  { feature: 'Target Audience', shared: 'Personal, Blogs, Portfolios', cloud: 'High-Traffic Sites, WooCommerce', vps: 'Agencies, Developers, SaaS' },
  { feature: 'Storage Technology', shared: 'Enterprise NVMe SSD', cloud: 'High-IOPS Pure NVMe', cloudVps: 'Dedicated NVMe Storage' },
  { feature: 'Control Panel', shared: 'cPanel / Webmail', cloud: 'cPanel + LiteSpeed Cache', vps: 'Full Root Access / cPanel' },
  { feature: 'SSL Certificate', shared: 'Free AutoSSL (Unlimited)', cloud: 'Free Wildcard AutoSSL', vps: 'Free SSL Included' },
  { feature: 'Automated Backups', shared: 'Daily Automated', cloud: 'Daily & Weekly Snapshots', vps: 'Full Server Snapshots' },
  { feature: 'Uptime SLA', shared: '99.9% Guaranteed', cloud: '99.99% Cloud Failover', vps: '99.99% Enterprise SLA' },
  { feature: 'Bandwidth', shared: 'Unmetered High-Speed', cloud: 'Unmetered Gigabit', vps: 'Dedicated 1Gbps Port' },
];

const serviceFaqs = [
  {
    q: 'Can I easily upgrade my hosting plan as my website grows?',
    a: 'Yes, absolutely. You can upgrade from Starter to Business or Cloud VPS instantly at any time from your account dashboard with zero downtime.'
  },
  {
    q: 'Do you offer free website migration from another hosting provider?',
    a: 'Yes! Our technical team provides 100% free cPanel-to-cPanel website and database migration with zero downtime.'
  },
  {
    q: 'Are email accounts included with web hosting plans?',
    a: 'Yes, all hosting packages include custom domain business email accounts (e.g. info@yourdomain.com) with Webmail, IMAP, and POP3 support.'
  },
  {
    q: 'How fast is a new hosting account activated?',
    a: 'Hosting accounts are provisioned instantly through our automated WHM integration as soon as your payment is verified.'
  },
];

const ServicesPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <Layout fullWidth>
      <SEO 
        title={`Web Hosting, Cloud VPS & Domain Infrastructure Services - ${settings.brandName}`} 
        description={`Discover high-speed cPanel shared hosting, NVMe cloud servers, reseller hosting, and managed domains at ${settings.brandName} with 99.9% uptime and BDIX connectivity.`} 
        keywords="web hosting services, cloud infrastructure bd, cpanel hosting dhaka, reseller hosting bangladesh, bdix web hosting"
        canonical="https://click2itbd.com/services"
      />

      <PageHeader 
        title="Enterprise-Grade Web Hosting & Cloud Services" 
        subtitle="Ultra-fast LiteSpeed NVMe servers, cPanel automation, free SSL certificates, and 99.9% uptime guaranteed. Everything you need to scale online." 
      />

      {/* Main Container - STRICT WHITE BACKGROUND */}
      <div className="bg-white text-gray-800">

        {/* 3 Simple Steps Section */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles size={14} /> Quick Onboarding
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                3 Simple Steps to Get Your Website Live
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Launch your business or personal website in minutes with automated provisioning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MousePointerClick className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">1. Choose a Plan</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Select from affordable shared hosting, high-traffic WordPress cloud, or powerful VPS servers designed for your specific scale.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">2. Register / Connect Domain</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Search and register your custom `.com`, `.net`, `.org` or `.bd` domain name with free DNS tools and WHOIS privacy protection.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Rocket className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">3. Instant Automated Setup</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your cPanel control panel is provisioned immediately upon payment with one-click WordPress installer ready to go.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid Section (Clean Light Cards) */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Our Hosting & Infrastructure Solutions
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Engineered for maximum reliability, speed, and security across all workloads.
              </p>
            </div>
            
            <ServicesGrid onNavigate={navigate} theme="light" />
          </div>
        </section>

        {/* Technology Stack & Specs (White Background) */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-3">
                <Zap size={14} /> Advanced Infrastructure
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Powered by World-Class Server Technology
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                We combine industry-leading software and high-performance hardware for unmatched uptime and site speed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {techStack.map((tech) => {
                const Icon = tech.icon;
                return (
                  <div key={tech.name} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${tech.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tech.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{tech.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Plan Comparison Table (White Background) */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Compare Hosting Package Types
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Find the perfect tier for your technical requirements and traffic expectations.
              </p>
            </div>

            <div className="overflow-x-auto bg-white rounded-3xl border border-gray-200 shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-900 font-bold">
                    <th className="p-4 sm:p-5">Feature</th>
                    <th className="p-4 sm:p-5">Shared NVMe Hosting</th>
                    <th className="p-4 sm:p-5 text-blue-600">WordPress Cloud</th>
                    <th className="p-4 sm:p-5">Cloud VPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-5 font-semibold text-gray-900">{row.feature}</td>
                      <td className="p-4 sm:p-5">{row.shared}</td>
                      <td className="p-4 sm:p-5 font-medium text-blue-600">{row.cloud}</td>
                      <td className="p-4 sm:p-5">{row.vps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-center mt-8">
              <Link 
                to="/pricing" 
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
              >
                View Full Pricing & Plans <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Premium Features Included Highlights */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Included in Every Hosting Account
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                No hidden costs. Enterprise features standard with every active package.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">99.9% Uptime SLA</h3>
                <p className="text-xs text-gray-600 leading-relaxed">High-availability redundant data centers keep your site online 24/7/365.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Free Lifetime SSL</h3>
                <p className="text-xs text-gray-600 leading-relaxed">Automated HTTPS encryption for all domains and subdomains.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Daily Automated Backups</h3>
                <p className="text-xs text-gray-600 leading-relaxed">One-click restore from automated off-site backup snapshots.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">24/7 Expert Support</h3>
                <p className="text-xs text-gray-600 leading-relaxed">Direct support via ticket, hotline, and WhatsApp for quick resolution.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services FAQ Accordion */}
        <section className="py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-600">Got questions about our services? We've got answers.</p>
            </div>

            <div className="space-y-4">
              {serviceFaqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={`border rounded-2xl overflow-hidden transition-colors ${
                    activeFaq === index ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  >
                    <span className={`font-semibold text-base ${activeFaq === index ? 'text-blue-900' : 'text-gray-900'}`}>
                      {faq.q}
                    </span>
                    {activeFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {activeFaq === index && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clean White CTA Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 md:p-10 lg:p-14 text-center shadow-lg relative overflow-hidden">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Ready to Boost Your Website Speed & Security?
              </h2>
              <p className="text-blue-100 text-base max-w-2xl mx-auto mb-8">
                Choose the hosting package that fits your needs. 30-day money-back guarantee with instant activation.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/pricing"
                  className="px-8 py-3.5 bg-white text-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all shadow-md"
                >
                  Choose a Hosting Plan
                </Link>
                <Link
                  to="/domain"
                  className="px-8 py-3.5 bg-blue-700/80 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm border border-blue-400/30 transition-all"
                >
                  Register a Domain
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default ServicesPage;
