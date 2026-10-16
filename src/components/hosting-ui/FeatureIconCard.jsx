import React from 'react';

export default function FeatureIconCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--c2i-line)] p-6 text-center hover:shadow-md hover:-translate-y-1 transition-all">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c2i-red)]/10 text-[var(--c2i-red)]">
        {Icon && <Icon size={24} />}
      </div>
      <h3 className="font-display font-bold text-[var(--c2i-ink)]">{title}</h3>
      {desc && (
        <p className="mt-2 text-sm text-[var(--c2i-ink-soft)]">{desc}</p>
      )}
    </div>
  );
}
