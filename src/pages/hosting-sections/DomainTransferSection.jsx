import React from 'react';
import { CheckCircle2, ArrowRight, Globe, ShieldCheck } from 'lucide-react';
import GlassPanel from '../../components/hosting-ui/GlassPanel';

export default function DomainTransferSection() {
  return (
    <section className="py-12 md:py-20 bg-[var(--c2i-ink)] text-white">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Transfer Your Domain</h2>
            <p className="text-gray-300 mb-8 text-lg">Move your existing domain to us and enjoy seamless management, free DNS, and competitive renewal pricing.</p>
            <ul className="space-y-4 mb-8">
              {['Free Domain Transfer', 'No Downtime During Transfer', 'Free DNS Management', '1 Year Extension'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-[var(--c2i-red)]" size={20} />
                  <span className="text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => document.getElementById('domain-search')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[var(--c2i-red)] hover:bg-[var(--c2i-red-deep)] text-white px-8 py-3 rounded-lg font-bold transition-all inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c2i-ink)]"
            >
              Transfer Domain <ArrowRight size={18} />
            </button>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="w-full max-w-md">
              <GlassPanel>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  <div className="flex-1 mx-2">
                    <div className="bg-white/10 rounded-md px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2">
                      <ShieldCheck size={12} className="text-[var(--c2i-red)]" />
                      https://yourdomain.com
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Average transfer time</p>
                      <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>24-48 hrs</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-[var(--c2i-red)]/20 flex items-center justify-center text-[var(--c2i-red)]">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                      <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>100%</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Uptime</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                      <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Free</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">DNS</p>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
