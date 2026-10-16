import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function MiddleBannerSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-[var(--c2i-blue-dark)] text-white">
      <div className="absolute inset-0 opacity-10 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'url(/assets/map_watermark.png)' }} />
      <div className="container mx-auto px-2 sm:px-4 relative z-10 text-center">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-widest uppercase text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Click<span className="text-[var(--c2i-orange)]">2</span>IT
          </h2>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto text-base leading-loose mb-10">
          Empowering businesses worldwide with reliable, fast, and secure web hosting solutions.
          We are committed to giving you the best hosting experience with 99.9% uptime guarantee.
        </p>
        <div className="flex items-center justify-center gap-6">
          {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
            <a key={i} href="#" className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 hover:border-white transition-all duration-300">
              <Icon size={20} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
