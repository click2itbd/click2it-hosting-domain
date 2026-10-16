import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { collection, query, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

import HeroSection from './hosting-sections/HeroSection';
import WhyChooseUsSection from './hosting-sections/WhyChooseUsSection';
import DomainPricingSection from './hosting-sections/DomainPricingSection';
import HostingPlansSection from './hosting-sections/HostingPlansSection';
import WordPressCloudSection from './hosting-sections/WordPressCloudSection';
import CloudVpsSection from './hosting-sections/CloudVpsSection';
import CloudLinuxLicenseSection from './hosting-sections/CloudLinuxLicenseSection';
import ServicesGrid from './hosting-sections/ServicesGrid';
import MiddleBannerSection from './hosting-sections/MiddleBannerSection';
import SecureServiceSection from './hosting-sections/SecureServiceSection';
import SecureDomainSection from './hosting-sections/SecureDomainSection';
import LatestNewsSection from './hosting-sections/LatestNewsSection';
import ReviewSection from './hosting-sections/ReviewSection';

export default function Hosting() {
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [bundleDiscount, setBundleDiscount] = useState(0);
  const navigate = useNavigate();
  const { items } = useCart();
  const { canAccessAdmin } = useAuth();

  const hasDomainInCart = items.some(item => item.category === 'Hosting & Domains' && item.id.startsWith('domain_'));

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'hostingServices'), orderBy('order', 'asc'), limit(50));
        const snap = await getDocs(q);
        setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => s.isActive));
      } catch (e) {
        console.error('Error fetching services', e);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'hostingPlans'), orderBy('order', 'asc'), limit(100));
        const snap = await getDocs(q);
        setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error('Error fetching plans', e);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchBundleDiscount = async () => {
      try {
        const docRef = doc(db, 'settings', 'hostingApiConfig');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setBundleDiscount(data?.bundleDiscountPercent || 0);
        }
      } catch (e) {
        console.error('Error fetching bundle discount', e);
      }
    };
    fetchBundleDiscount();
  }, []);

  return (
    <Layout fullWidth>
      <SEO 
        title="High-Speed NVMe Web Hosting, VPS & Domain in Bangladesh | Click2IT"
        description="Fast, reliable NVMe cPanel web hosting, WordPress cloud, KVM VPS servers and domain registration in Bangladesh with 99.9% uptime, BDIX speed and 24/7 support."
        keywords="web hosting bangladesh, cpanel hosting bd, nvme hosting, buy domain bd, cheap vps bd, best hosting provider bangladesh, wordpress cloud bd"
      />
      {/* 1. Hero — dark blue bg, domain search, 3D server graphic */}
      <HeroSection hasDomainInCart={hasDomainInCart} bundleDiscount={bundleDiscount} />

      {/* 2. Why Choose Us — 3 white cards */}
      <WhyChooseUsSection />

      {/* 3. Domain Pricing — TLD cards */}
      <DomainPricingSection />

      {/* 4. Shared NVMe cPanel Hosting (Student, Starter, Standard, Professional, Premium) */}
      <HostingPlansSection
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        onNavigate={navigate}
      />

      {/* 5. Turbo / Managed WordPress & WooCommerce Cloud Hosting */}
      <WordPressCloudSection />

      {/* 6. High Performance KVM Cloud VPS & Dedicated Servers */}
      <CloudVpsSection />

      {/* 7. CloudLinux OS License Pricing & Comparison */}
      <CloudLinuxLicenseSection />

      {/* 8. Our Services — 3x2 grid */}
      <ServicesGrid
        services={services}
        onNavigate={navigate}
        canAccessAdmin={canAccessAdmin}
      />

      {/* 8. Middle Banner — Click2IT brand section */}
      <MiddleBannerSection />

      {/* 9. Secure Service — text left, image right */}
      <SecureServiceSection />

      {/* 10. Secure Domain — image left, text right */}
      <SecureDomainSection />

      {/* 11. Customer Reviews */}
      <ReviewSection />

      {/* 12. Latest News — 4 cards */}
      <LatestNewsSection />
    </Layout>
  );
}
