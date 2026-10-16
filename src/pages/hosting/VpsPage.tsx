import React from 'react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/hosting/PageHeader';
import { HostingPromoBanner } from '../../components/hosting/HostingPromoBanner';
import { SEO } from '../../components/SEO';
import CloudVpsSection from '../hosting-sections/CloudVpsSection';
import { Terminal, Shield, Zap, Cpu, Server, HardDrive, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VpsPage() {
  return (
    <Layout fullWidth>
      <HostingPromoBanner />
      <SEO 
        title="High Performance KVM Cloud VPS Servers"
        description="Deploy ultra-fast KVM Cloud VPS with pure NVMe RAID-10 storage, dedicated IPv4, full root SSH access, and 1Gbps connectivity."
        keywords="cloud vps bd, bdix vps, kvm vps bangladesh, cheap vps dhaka, linux vps, windows vps bd"
      />

      <PageHeader 
        title="High Performance KVM Cloud VPS Servers" 
        subtitle="Dedicated CPU cores, ultra-low latency NVMe storage, dedicated IPv4, and 1Gbps network uplink. Choose your Linux or Windows OS template and launch in minutes." 
      />

      {/* Main VPS Pricing & OS Selector Section */}
      <div className="w-full">
        <CloudVpsSection />
      </div>

      {/* Why Choose Our Cloud VPS Feature Grid */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Terminal size={14} /> Enterprise Infrastructure
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Engineered for Developers & High-Traffic Workloads
            </h2>
            <p className="mt-4 text-base text-gray-600 max-w-2xl mx-auto">
              Guaranteed dedicated compute resources without noisy neighbors. Full control from hypervisor to kernel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50/50 to-white p-6 rounded-2xl border border-purple-100 shadow-xs">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Full Root / Administrator Access</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Complete SSH key or password-based root terminal access. Install any control panel, Docker, databases, or custom stacks.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-2xl border border-blue-100 shadow-xs">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Pure NVMe SSD Storage</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enterprise-grade PCIe Gen4 NVMe disks configured in hardware RAID 10 provide up to 10x faster I/O throughput than SATA SSDs.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/50 to-white p-6 rounded-2xl border border-emerald-100 shadow-xs">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">BDIX & Global Low Latency</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Direct peering with BDIX, Dhaka IX, and international Tier-1 upstreams ensures lightning fast round-trip times nationwide.
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50/50 to-white p-6 rounded-2xl border border-amber-100 shadow-xs">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">KVM Hardware Virtualization</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                True kernel-based virtual machines ensure strict resource isolation so your assigned CPU and RAM are 100% reserved for you.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50/50 to-white p-6 rounded-2xl border border-red-100 shadow-xs">
              <div className="w-12 h-12 bg-red-100 text-red-700 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">DDoS Protection & Firewalls</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enterprise network scrubbing filters volumetric attacks before they hit your instance, keeping your applications online.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50/50 to-white p-6 rounded-2xl border border-indigo-100 shadow-xs">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center mb-4">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">OS Template Ready</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Choose Ubuntu 22.04 / 24.04, Debian 12, AlmaLinux 9, or Windows Server with one-click automated reinstallation options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
