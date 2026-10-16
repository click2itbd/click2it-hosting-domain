import React from 'react';
import { Layout } from '../components/Layout';
import { SEO } from '../components/SEO';
import { useSettings } from '../context/SettingsContext';
import { ShoppingCart, Server, Cpu, CheckCircle2, Users, Shield } from 'lucide-react';

export default function AboutUs() {
  const { settings } = useSettings();
  const brandName = settings?.brandName || 'Click2IT BD';

  return (
    <Layout>
      <SEO 
        title={`About Us - ${brandName}`} 
        description={`${brandName} is your ultimate destination for Tech Shopping, Custom PC Building, and premium Hosting & Domain services.`} 
      />
      
      {/* Hero Section */}
      <div className="bg-[#081621] text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="container mx-auto px-2 sm:px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Welcome to <span className="text-[#F97316]">{brandName}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We are a one-stop digital technology hub in Bangladesh, providing an integrated ecosystem of hardware retail, custom PC assembly, and web infrastructure solutions.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-16">
        
        {/* Core Services Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Services</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">We specialize in three main pillars to power your digital and technological needs, offering unparalleled quality and support across the board.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Shop */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShoppingCart size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Tech Shop</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Explore our vast collection of authentic tech gadgets, laptops, monitors, CCTV cameras, and smart accessories. We source directly from top global brands to ensure you get 100% genuine products with official warranties.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Genuine Hardware & Accessories</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Gadgets & Smart Devices</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Fast Nationwide Delivery</li>
            </ul>
          </div>

          {/* PC Build */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-orange-50 text-[#F97316] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Cpu size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">PC Builder</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Whether you are an enthusiast gamer, a professional video editor, or need an enterprise workstation, our custom PC building service has you covered. Use our intuitive PC Builder tool to assemble your dream machine.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> Custom Gaming & Workstation PCs</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> Expert Assembly & Cable Management</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#F97316]" /> Extensive Compatibility Checks</li>
            </ul>
          </div>

          {/* Hosting / Domain */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Server size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Domain & Hosting</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Launch your ideas online with our enterprise-grade web infrastructure. We offer blazing-fast NVMe SSD hosting, VPS servers, and domain registration services to keep your business running 24/7 without interruptions.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> Premium NVMe Web Hosting</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> Global Domain Registration</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-500" /> 99.9% Uptime Guarantee</li>
            </ul>
          </div>
        </div>

        {/* Story / About Section */}
        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 overflow-hidden relative border border-gray-100">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Why {brandName}?</h2>
            <p className="text-gray-600 leading-relaxed mb-8 text-lg">
              We started with a simple vision: to eliminate the hassle of finding reliable tech hardware and dependable web hosting by bringing them together under one roof. Today, {brandName} is trusted by thousands of individuals and businesses who rely on us for their daily tech components, custom PC rigs, and online presence.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 text-left mt-12">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Shield size={24} className="text-[#F97316]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Uncompromising Quality</h4>
                  <p className="text-gray-500 mt-2">From testing our PC builds rigorously before shipping, to maintaining Tier-3 data center standards for our hosting, quality is our priority.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Users size={24} className="text-[#F97316]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Expert Support Team</h4>
                  <p className="text-gray-500 mt-2">Our support staff consists of hardware specialists and system administrators ready to assist you with both your physical PC issues and server problems.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
