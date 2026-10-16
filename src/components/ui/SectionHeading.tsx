import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ eyebrow, title, subtitle, className, align = 'center' }) => {
  return (
    <div className={cn('mb-12', align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <span className="inline-block text-xs font-bold uppercase tracking-wider text-[var(--c2i-red)] mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-[var(--c2i-ink)] mb-4">{title}</h2>
      {subtitle && <p className="text-[var(--c2i-ink-soft)] max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
};
