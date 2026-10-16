import React from 'react';
import FeatureIconCard from '../../components/hosting-ui/FeatureIconCard';
import { Zap, Headphones, ShieldCheck, Gauge, HardDrive, Globe, Server } from 'lucide-react';
import { SectionHeading } from '../../components/ui/SectionHeading';

const HEADLINE_FEATURES = [
  {
    icon: Zap,
    title: 'Powerful Hardware',
    desc: 'Enterprise-grade SSD RAID-10 arrays for maximum throughput and reliability.',
  },
  {
    icon: Headphones,
    title: '24/7x365 Support',
    desc: 'Round-the-clock expert team ready to help you via chat, ticket, or phone.',
  },
  {
    icon: ShieldCheck,
    title: 'DDoS Protection',
    desc: 'Up to 30 Gbps mitigation with 95%+ of common attacks blocked automatically.',
  },
  {
    icon: Gauge,
    title: '10x Faster Speed',
    desc: 'LiteSpeed webserver with LSCache delivering dramatically faster page loads than Apache.',
  },
];

const DETAILED_FEATURES = [
  { icon: Zap, title: 'Lightning Fast', desc: 'NVMe SSD storage with Litespeed cache for blazing speed.' },
  { icon: ShieldCheck, title: 'Free SSL', desc: 'Auto-installed SSL certificate on every hosting account.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Expert support team ready to help you anytime.' },
  { icon: HardDrive, title: 'Daily Backup', desc: 'Automated daily backups to keep your data safe.' },
  { icon: Globe, title: 'Free CDN', desc: 'Global content delivery for faster load times.' },
  { icon: Server, title: '99.9% Uptime', desc: 'Guaranteed uptime with redundant infrastructure.' },
];

export default function PackageFeaturesSection() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="container mx-auto px-2 sm:px-4">
        <SectionHeading
          eyebrow="Why Us"
          title="Package Features"
          subtitle="Everything you need to launch, scale, and succeed online — built into every plan."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {HEADLINE_FEATURES.map(({ icon, title, desc }, idx) => (
            <FeatureIconCard key={idx} icon={icon} title={title} desc={desc} />
          ))}
        </div>

        <div className="text-center mb-10">
          <h3 className="text-lg font-bold text-[var(--c2i-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            More Reasons to Choose Us
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {DETAILED_FEATURES.map((feature, i) => (
            <div key={i} className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-[var(--c2i-red)]/10 flex items-center justify-center text-[var(--c2i-red)]">
                <feature.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--c2i-ink)] mb-1">{feature.title}</h3>
                <p className="text-[var(--c2i-ink-soft)] text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
