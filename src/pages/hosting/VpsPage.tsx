import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { HostingPromoBanner } from '../../components/hosting/HostingPromoBanner';
import { SEO } from '../../components/SEO';
import CloudVpsSection from '../hosting-sections/CloudVpsSection';
import {
  Terminal,
  Shield,
  Zap,
  Cpu,
  Server,
  HardDrive,
  ArrowRight,
  Activity,
  Globe,
  Layers,
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

const VPS_FAQS = [
  {
    question: 'Do I get full root SSH or Windows Administrator RDP access?',
    answer:
      'Yes. Every Linux VPS comes with full root SSH access (port 22, password and SSH key authentication), and every Windows Server VPS includes full Administrator Remote Desktop (RDP) access so you can install any software, Docker container, or custom kernel module.'
  },
  {
    question: 'Can I upgrade CPU, RAM, or NVMe storage later without losing data?',
    answer:
      'Yes. Because our infrastructure runs on enterprise KVM virtualization, you can scale your instance vertically to a higher tier at any time from your Client Area. Your files, databases, and dedicated IPv4 address remain completely intact.'
  },
  {
    question: 'Is BDIX connectivity included with all Cloud VPS plans?',
    answer:
      'Yes. All our VPS nodes feature direct peering with BDIX and major Bangladesh ISPs alongside Tier-1 international transit, delivering sub-2ms local latency for visitors across Bangladesh.'
  },
  {
    question: 'Which control panels can I install on my VPS?',
    answer:
      'You can install cPanel/WHM, DirectAdmin, CyberPanel (OpenLiteSpeed), CloudPanel, aaPanel, Plesk, HestiaCP, or run bare Docker / Kubernetes stacks. Our engineering team can also pre-install your preferred panel upon request.'
  },
  {
    question: 'How are backups and snapshots handled?',
    answer:
      'Automated off-node backups run on schedule so your data is protected against accidental deletion or faulty updates. You also get out-of-band HTML5 VNC console access to troubleshoot boot or firewall lockouts anytime.'
  }
];

const SUPPORTED_STACKS = [
  { name: 'Docker & Compose', category: 'Container Runtime' },
  { name: 'cPanel / WHM', category: 'Hosting Panel' },
  { name: 'CyberPanel + LiteSpeed', category: 'High-Speed WP' },
  { name: 'CloudPanel / aaPanel', category: 'Lightweight Panel' },
  { name: 'Node.js / PM2 / Bun', category: 'App Runtime' },
  { name: 'PostgreSQL / Redis', category: 'Database Engine' },
  { name: 'Nginx / Caddy Reverse Proxy', category: 'Web Server' },
  { name: 'WireGuard / OpenVPN', category: 'Private Tunnel' }
];

export default function VpsPage() {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'terminal' | 'benchmarks'>('terminal');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Layout fullWidth>
      <HostingPromoBanner />
      <SEO
        title="Cloud VPS Hosting Bangladesh - High Performance KVM NVMe VPS | Click2IT"
        description="Deploy enterprise KVM Cloud VPS servers with pure NVMe RAID-10 storage, dedicated IPv4, 1Gbps BDIX uplink, full root SSH & Windows RDP access, and guaranteed CPU/RAM resources."
        keywords="vps, cloud vps, vps hosting, cheap vps, buy vps, kvm vps, linux vps, windows vps, bdix vps bangladesh, vps server"
        canonical="https://click2it.bd/vps"
      />

      {/* 1. Human-Crafted Split Infrastructure Hero Section */}
      <section className="relative bg-[#070e22] pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden border-b border-slate-800">
        {/* Subtle technical blueprint grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
            backgroundSize: '44px 44px'
          }}
        />
        {/* Ambient directional light */}
        <div
          className="absolute -top-24 left-1/4 w-[650px] h-[380px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.22) 0%, transparent 70%)',
            filter: 'blur(45px)'
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Editorial Copy & Hardware Metrics */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-slate-300 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>KVM HYPERVISOR CLUSTER • BDIX &amp; GLOBAL ROUTING</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-[1.12]">
                Bare-Metal Speed.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
                  Cloud VPS Flexibility.
                </span>
              </h1>

              <p className="mt-5 text-slate-300/90 text-base sm:text-lg leading-relaxed max-w-2xl">
                Dedicated KVM compute instances powered by enterprise AMD EPYC™ processors, hardware RAID-10 Gen4 NVMe storage, and dedicated IPv4 addresses. Zero noisy neighbors—launch your Linux or Windows Server in under 55 seconds.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('cloud-vps')}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <span>Configure &amp; Deploy Instance</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('vps-specs')}
                  className="px-5 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-all cursor-pointer"
                >
                  View Architecture &amp; Specs
                </button>
              </div>

              {/* 4-Column Tabular Hardware Metrics */}
              <div className="mt-10 pt-8 border-t border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">
                    &lt; 55s
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Instance Provisioning</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-400">
                    1.4 ms
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">BDIX Dhaka Latency</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-sky-400">
                    4.8 GB/s
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Gen4 NVMe Read I/O</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">
                    10 Gbps
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Redundant Port Speed</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive SSH Terminal & Telemetry Window */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0b132b] border border-slate-700/80 shadow-2xl overflow-hidden">
                {/* Window Title Bar with Interactive Tabs */}
                <div className="px-4 py-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs font-mono text-slate-400 truncate">
                      root@kvm-node-dac01:~
                    </span>
                  </div>

                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveConsoleTab('terminal')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        activeConsoleTab === 'terminal'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SSH Console
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConsoleTab('benchmarks')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        activeConsoleTab === 'benchmarks'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      I/O Benchmark
                    </button>
                  </div>
                </div>

                {/* Tab 1: Realistic SSH Provisioning & Sysbench Output */}
                {activeConsoleTab === 'terminal' ? (
                  <div className="p-5 font-mono text-xs leading-relaxed text-slate-300 space-y-2.5 min-h-[290px]">
                    <div className="text-slate-400">
                      <span className="text-emerald-400">root@kvm-node-dac01</span>:
                      <span className="text-sky-400">~</span># c2i-cloud status --instance vps-prod
                    </div>
                    <div className="pl-3 border-l-2 border-slate-700 space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-500">Hypervisor :</span>{' '}
                        <span className="text-white font-semibold">KVM / QEMU Hardware Isolation</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Processor  :</span>{' '}
                        <span className="text-sky-300">AMD EPYC™ 7763 (Dedicated vCPU)</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Storage    :</span>{' '}
                        <span className="text-emerald-300">Enterprise PCIe 4.0 NVMe RAID-10</span>
                      </div>
                      <div>
                        <span className="text-slate-500">IPv4 Route :</span>{' '}
                        <span className="text-white">Dedicated Static IPv4 + BDIX Peering</span>
                      </div>
                    </div>

                    <div className="pt-1 text-slate-400">
                      <span className="text-emerald-400">root@kvm-node-dac01</span>:
                      <span className="text-sky-400">~</span># fio --name=nvme-test --rw=randread --bs=4k
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sequential Read:</span>
                        <span className="text-emerald-400 font-bold">4,850 MB/s (428k IOPS)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">BDIX Local Ping:</span>
                        <span className="text-sky-400 font-bold">1.42 ms (0% packet loss)</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Instance Ready for SSH / RDP Connection
                      </span>
                      <span className="text-slate-500">uptime 99.99%</span>
                    </div>
                  </div>
                ) : (
                  /* Tab 2: Visual Disk & Network Benchmark Bars */
                  <div className="p-5 space-y-4 min-h-[290px] text-xs">
                    <div>
                      <div className="flex justify-between text-slate-200 font-semibold mb-1">
                        <span>Click2IT PCIe Gen4 NVMe VPS</span>
                        <span className="font-mono text-emerald-400">4,850 MB/s</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full w-[94%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Standard Cloud SATA SSD VPS</span>
                        <span className="font-mono">540 MB/s</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-600 rounded-full w-[16%]" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                        Network Round-Trip Latency
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 font-mono">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">Dhaka BDIX IX</div>
                          <div className="text-sm font-bold text-emerald-400 mt-0.5">1.4 ms</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">Singapore SG1</div>
                          <div className="text-sm font-bold text-sky-400 mt-0.5">32.8 ms</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main VPS OS Image & Instance Configurator (without duplicate title) */}
      <div className="w-full">
        <CloudVpsSection hideHeader />
      </div>

      {/* 3. Cohesive Architectural Bento Grid (Replaces generic rainbow boxes) */}
      <section id="vps-specs" className="py-20 bg-white border-t border-slate-200/80 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Activity size={13} className="text-blue-600" />
              Hardware &amp; Network Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Production Workloads, Not Oversold Containers
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Every virtual machine runs on dedicated kernel-based virtualization with guaranteed ECC memory, enterprise NVMe arrays, and redundant 10Gbps network uplinks.
            </p>
          </div>

          {/* Top 3 Architectural Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-7 border border-slate-200/90 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  True KVM Hardware Virtualization
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Unlike OpenVZ or LXC containers, KVM allocates dedicated CPU threads, private kernel space, and isolated DDR4 ECC memory so other tenants never slow down your server.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>HYPERVISOR</span>
                <span className="font-bold text-slate-900">100% Dedicated RAM/vCPU</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 sm:p-7 border border-slate-200/90 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  PCIe Gen4 NVMe in RAID-10
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  High-IOPS enterprise NVMe drives mirrored in hardware RAID-10 deliver up to 10x faster database queries and disk read/write speeds compared to standard SATA SSDs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>THROUGHPUT</span>
                <span className="font-bold text-blue-700">Up to 425,000+ IOPS</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 sm:p-7 border border-slate-200/90 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  10Gbps BDIX &amp; Global Transit
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Direct peering with BDIX, Dhaka IX, and multiple international Tier-1 carriers guarantees instant page loads inside Bangladesh and low latency worldwide.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>LOCAL LATENCY</span>
                <span className="font-bold text-emerald-700">&lt; 2.0 ms BDIX Peering</span>
              </div>
            </div>
          </div>

          {/* Bottom 2 Wide Bento Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Wide Stack Compatibility Card */}
            <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-2">
                  <Layers size={14} /> Full Stack Freedom
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Run Any Control Panel, Runtime, or Custom Stack
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  With full root SSH and Administrator RDP access, you have complete freedom over your software environment—from cPanel &amp; CyberPanel to production Docker clusters.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SUPPORTED_STACKS.map((stack) => (
                  <div
                    key={stack.name}
                    className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3"
                  >
                    <div className="text-xs font-bold text-white leading-tight">{stack.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {stack.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Out-of-Band Management Card */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                  <Shield size={14} className="text-emerald-600" /> Resilience &amp; Control
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Always-On DDoS Protection &amp; VNC Recovery
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  Inline network scrubbing drops volumetric SYN/UDP floods before they reach your instance, while out-of-band VNC console access ensures you never get locked out.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Lock size={14} className="text-blue-600" /> Automated L3/L4 DDoS Filtering
                  </span>
                  <span className="font-mono font-bold text-emerald-600">Included Free</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Terminal size={14} className="text-blue-600" /> HTML5 Emergency VNC Console
                  </span>
                  <span className="font-mono font-bold text-emerald-600">Included Free</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Globe size={14} className="text-blue-600" /> Clean Dedicated IPv4 (rDNS Ready)
                  </span>
                  <span className="font-mono font-bold text-emerald-600">Included Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VPS Technical FAQ Section */}
      <section className="py-16 md:py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <HelpCircle size={13} className="text-blue-600" /> Technical FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions About KVM VPS
            </h2>
          </div>

          <div className="space-y-3">
            {VPS_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-xl border transition-all duration-150 overflow-hidden ${
                    isOpen ? 'border-slate-900 shadow-sm' : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
