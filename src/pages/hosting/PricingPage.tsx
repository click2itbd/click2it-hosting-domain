import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/hosting/PageHeader';
import { HostingPromoBanner } from '../../components/hosting/HostingPromoBanner';
import { SEO } from '../../components/SEO';
import HostingPlansSection from '../hosting-sections/HostingPlansSection';
import WordPressCloudSection from '../hosting-sections/WordPressCloudSection';
import CloudVpsSection from '../hosting-sections/CloudVpsSection';
import ComparePlansSection from '../hosting-sections/ComparePlansSection';
import CustomHostingBuilder from '../hosting-sections/CustomHostingBuilder';
import CloudLinuxLicenseSection from '../hosting-sections/CloudLinuxLicenseSection';
import { Shield, Check, X, ChevronDown } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Smooth scroll to hash when loaded
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  const faqs = [
    {
      question: "Can I upgrade my plan later?",
      answer: "Yes, you can easily upgrade or downgrade your hosting plan at any time from your control panel. Prorated charges will apply."
    },
    {
      question: "Is there a setup fee?",
      answer: "No, we do not charge any setup fees for any of our hosting plans. You only pay for the hosting itself."
    },
    {
      question: "Do you offer a money-back guarantee?",
      answer: "Yes, we offer a 30-day no-questions-asked money-back guarantee on all our shared and cloud hosting plans."
    },
    {
      question: "Will you help me migrate my site?",
      answer: "Absolutely! Our team provides 100% free, zero-downtime website migration from your previous host within the first 30 days of signing up."
    },
    {
      question: "Do you offer free SSL?",
      answer: "Yes, all our hosting plans come with a free SSL certificate installed automatically."
    }
  ];

  return (
    <Layout fullWidth>
      <HostingPromoBanner />
      <SEO 
        title="Web Hosting Plans & Pricing in Bangladesh | NVMe cPanel & VPS"
        description="Affordable and transparent web hosting plans in Bangladesh. NVMe cPanel hosting, WordPress cloud, and KVM VPS servers with 99.9% uptime and 24/7 expert support."
        keywords="hosting price in bangladesh, cheap web hosting bd, cpanel hosting package, best hosting company bangladesh, vps pricing bd"
        canonical="https://click2it.bd/pricing"
      />

      <PageHeader 
        title="High Performance Hosting & Server Plans" 
        subtitle="Transparent, reliable pricing engineered for high-speed performance, 99.9% uptime, and 24/7 expert support." 
      />

      {/* 1. Shared NVMe cPanel Hosting Plans */}
      <div className="w-full">
        <HostingPlansSection billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} onNavigate={navigate} />
      </div>

      {/* 2. BDIX Turbo / Managed WordPress Cloud */}
      <div className="w-full">
        <WordPressCloudSection />
      </div>

      {/* 3. High Performance KVM Cloud VPS */}
      <div className="w-full">
        <CloudVpsSection />
      </div>

      {/* 4. CloudLinux OS License Pricing & Compare */}
      <div id="cloudlinux-license" className="w-full scroll-mt-20">
        <CloudLinuxLicenseSection />
      </div>

      {/* 5. Interactive Custom Package Builder */}
      <div className="w-full">
        <CustomHostingBuilder />
      </div>

      {/* 5. Detailed Feature Comparison */}
      <div id="compare-plans" className="scroll-mt-20">
        <ComparePlansSection />
      </div>

      {/* 30-Day Money-Back Guarantee */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-sm">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">30-Day Money-Back Guarantee</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              We're so confident you'll love our hosting platform that we offer a completely risk-free trial. 
              If you're not fully satisfied within the first 30 days, we'll refund your money in full.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-gray-600">Everything you need to know about our hosting plans.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${openFaq === index ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${openFaq === index ? 'transform rotate-180 text-blue-500' : ''}`} 
                />
              </button>
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </Layout>
  );
}
