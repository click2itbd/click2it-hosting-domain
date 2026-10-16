import React from 'react';
import { SectionHeading } from '../../components/ui/SectionHeading';

const DEFAULT_TESTIMONIALS = [
  {
    id: 't1',
    name: 'Rahim Uddin',
    role: 'Owner',
    company: 'Rahim Electronics',
    quote: 'Click2IT helped us move our shop online seamlessly. The hosting is fast, and their support team is always available when we need them.',
  },
  {
    id: 't2',
    name: 'Nasreen Akter',
    role: 'Freelance Designer',
    company: 'Self-employed',
    quote: 'I was looking for reliable hosting for my client projects. Click2IT gave me blazing speed and the best uptime I have experienced locally.',
  },
  {
    id: 't3',
    name: 'Habibur Rahman',
    role: 'Founder',
    company: 'Habib Traders',
    quote: 'From domain registration to live hosting, everything was smooth. The LiteSpeed servers make our catalog load instantly for customers.',
  },
  {
    id: 't4',
    name: 'Tahmina Yesmin',
    role: 'Marketing Manager',
    company: 'LocalBrand BD',
    quote: 'The team helped us migrate without downtime. Their pricing is transparent and the control panel is easy for our whole staff to use.',
  },
];

export default function TestimonialsSection({ testimonials = DEFAULT_TESTIMONIALS }) {
  const items = testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;

  return (
    <section className="relative overflow-hidden py-16 md:py-24" style={{ backgroundColor: 'var(--c2i-paper)' }}>
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, var(--c2i-success-soft) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c2i-success-soft) 0%, transparent 45%)',
      }} />

      <div className="relative z-10 container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <SectionHeading
            eyebrow="Testimonials"
            title="What Our Clients Say"
            subtitle="Real stories from businesses, freelancers, and shop owners who trust Click2IT."
          />
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible pb-4 md:pb-0">
          {items.map((item) => {
            const initial = item.name?.charAt(0)?.toUpperCase() || 'C';
            return (
              <div
                key={item.id}
                className="snap-start shrink-0 w-[85vw] sm:w-auto bg-white rounded-xl border border-[var(--c2i-line)] p-6 shadow-[var(--c2i-shadow-sm)] hover:shadow-[var(--c2i-shadow-md)] transition-all"
              >
                <div className="relative mb-6">
                  <span className="absolute -top-2 -left-1 text-6xl leading-none select-none" style={{ color: 'var(--c2i-line)' }}>
                    &ldquo;
                  </span>
                  <p className="relative text-sm italic text-[var(--c2i-ink-soft)] leading-relaxed">
                    {item.quote}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--c2i-red)]/10 text-[var(--c2i-red)] font-bold">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--c2i-ink)]">{item.name}</p>
                    <p className="truncate text-xs text-[var(--c2i-ink-soft)]">
                      {item.role}{item.company ? ` · ${item.company}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
