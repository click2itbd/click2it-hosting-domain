import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Button } from '../../components/ui/Button';

export default function FAQSection({ items }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow="Support"
              title="Pre-Sale Questions"
              subtitle="Quick answers to common questions before you buy."
              align="left"
            />

            <div className="mt-6 bg-[var(--c2i-paper)] border border-[var(--c2i-line)] rounded-xl p-5">
              <p className="text-sm text-[var(--c2i-ink-soft)] mb-4">
                Still have questions? Our team replies within minutes.
              </p>
              <Button variant="primary" size="sm" className="w-full">
                Talk with an expert
              </Button>
            </div>
          </div>

          <div className="max-w-none">
            <div className="divide-y divide-[var(--c2i-line)]">
              {items.map((faq, i) => (
                <div key={i} className="min-h-[72px] hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-5 px-1 text-left font-bold text-[var(--c2i-ink)] hover:text-[var(--c2i-red)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c2i-red)] focus-visible:ring-inset active:scale-[0.99]"
                    style={{ transition: 'transform 0.2s ease' }}
                  >
                    <span className="text-base md:text-lg pr-4">{faq.q}</span>
                    <span className="shrink-0 text-[var(--c2i-ink-soft)] transition-transform duration-200" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ChevronDown size={20} />
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-1 pb-5 text-[var(--c2i-ink-soft)] text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
