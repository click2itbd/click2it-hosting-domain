import React from 'react';
import { SectionHeading } from '../../components/ui/SectionHeading';

const stats = [
  { label: 'Up-Time Guarantee', value: 99, suffix: '%' },
  { label: 'CPU', value: 85, suffix: '%' },
  { label: 'RAM', value: 90, suffix: '%' },
  { label: 'SSD Storage', value: null, suffix: 'NVMe' },
  { label: 'Memory', value: 88, suffix: '%' },
];

export default function ServerStatsSection() {
  return (
    <section className="bg-white border-y border-[var(--c2i-line)]">
      <div className="container mx-auto px-2 sm:px-4 py-16 md:py-24">
        <SectionHeading
          eyebrow="Infrastructure"
          title="Our Server Statistics"
          subtitle="Enterprise-grade hardware powering your applications with reliability and speed."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ label, value, suffix }, idx) => (
            <div
              key={idx}
              className="bg-[var(--c2i-paper)] rounded-xl p-6 border border-[var(--c2i-line)]"
            >
              <p className="text-sm font-medium text-[var(--c2i-ink-soft)] mb-3">
                {label}
              </p>

              {value !== null ? (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div
                      className="bg-[var(--c2i-red)] rounded-full h-2"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-[var(--c2i-ink)]">
                      {value}
                    </span>
                    <span className="text-sm font-medium text-[var(--c2i-ink-soft)]">
                      {suffix}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-display text-[var(--c2i-ink)]">
                    {suffix}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-[var(--c2i-red)]/10 text-[var(--c2i-red)] px-2 py-1 rounded-full">
                    Fast
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
