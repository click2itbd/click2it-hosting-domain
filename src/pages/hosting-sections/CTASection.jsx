import React from 'react';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function CTASection({ onNavigate }) {
  return (
    <section className="relative overflow-hidden py-12 md:py-20 text-white" style={{ background: 'var(--c2i-gradient-red)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-2 sm:px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to launch?</h2>
        <p className="text-lg text-red-100 mb-8 max-w-2xl mx-auto">Search your domain and pick a hosting plan. Go live in minutes.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => document.getElementById('domain-search')?.scrollIntoView({ behavior: 'smooth' })}
            size="lg"
          >
            <SearchIcon size={18} /> Search Domain
          </Button>
          <Button
            onClick={() => onNavigate('/hosting')}
            variant="outline"
            size="lg"
            className="!border-white !text-white hover:!bg-white hover:!text-[var(--c2i-red)]"
          >
            View Hosting Plans <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </section>
  );
}
