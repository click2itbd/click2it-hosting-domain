import React from 'react';
import { Layout } from '../components/Layout';
import { SEO } from '../components/SEO';
import { useSettings } from '../context/SettingsContext';
import { Globe, Server, Cpu, CheckCircle2, Users, Shield } from 'lucide-react';

export default function AboutUs() {
  const { settings } = useSettings();
  const brandName = settings?.brandName || 'Click2IT BD';

  return (
    <Layout>
      <SEO 
        title={`About Us - ${brandName}`} 
        description={`${brandName} is your trusted partner for High-Speed NVMe Web Hosting, Domain Registration, WordPress Cloud, and KVM VPS Servers in Bangladesh.`} 
      />
      
      {/* Hero Section */}
      <div className="bg-[#081621] text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="container mx-auto px-2 sm:px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Welcome to <span className="text-[#F97316]">{brandName}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We are a premier web hosting, domain registration, and cloud infrastructure provider in Bangladesh—powering websites, startups, e-commerce stores, and enterprise applications 24/7.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-16">
        
        {/* Core Services Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Infrastructure Pillars</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">We specialize in three core cloud and domain solutions engineered for maximum speed, security, and 99.9% uptime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Domain Registration */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Domain Registration</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Register your ideal brand identity across 500+ global extensions (.com, .net, .org, .xyz, .io, .ai) as well as official BTCL .bd and .বাংলা country-code domains with full DNS control.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Instant Global gTLD Registration</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Official .BD &amp; .বাংলা Domain Support</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Theft Protection &amp; DNS Management</li>
            </ul>
          </div>

          {/* NVMe Web & WordPress Hosting */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Server size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">NVMe Web &amp; WP Cloud</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Launch and scale websites effortlessly on our LiteSpeed-powered NVMe SSD cPanel hosting and Turbo WordPress Cloud servers, isolated by CloudLinux OS and Imunify360 security.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> Pure NVMe SSD RAID-10 Storage</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> Official cPanel &amp; LiteSpeed Web Server</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> Free AutoSSL &amp; Automated Backups</li>
            </ul>
          </div>

          {/* Cloud VPS & Dedicated Servers */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-orange-50 text-[#F97316] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Cpu size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Cloud VPS &amp; Dedicated</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              For high-traffic applications, SaaS platforms, and agencies, our KVM Cloud VPS and Dedicated Servers deliver guaranteed CPU/RAM resources, full root SSH access, and dedicated IPv4.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> KVM Hardware Virtualization</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> Custom Resource Builder Available</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> 99.9% SLA Uptime Guarantee</li>
            </ul>
          </div>
        </div>

        {/* Story / About Section */}
        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 overflow-hidden relative border border-gray-100">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Why Choose {brandName}?</h2>
            <p className="text-gray-600 leading-relaxed mb-8 text-lg">
              We built {brandName} with a clear mission: to make enterprise-grade cloud hosting, fast domain registration, and responsive local support accessible and affordable for every developer, entrepreneur, and business in Bangladesh.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 text-left mt-12">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Shield size={24} className="text-[#F97316]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Tier-3+ Infrastructure &amp; Genuine Licenses</h4>
                  <p className="text-gray-500 mt-2">Every hosting node is powered by enterprise NVMe storage and authentic cPanel, CloudLinux, LiteSpeed, and Imunify360 licenses for uncompromising reliability.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Users size={24} className="text-[#F97316]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">24/7 System Admin &amp; Support Team</h4>
                  <p className="text-gray-500 mt-2">Our support engineers and Linux system administrators are available around the clock via ticket, live chat, and WhatsApp to assist with migrations, DNS, and server optimization.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
