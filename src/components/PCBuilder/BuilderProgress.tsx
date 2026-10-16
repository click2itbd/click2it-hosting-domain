import React from 'react';
import { Check } from 'lucide-react';
import { Product } from '../../types';
import { BuilderCategory } from './constants';
import { cn } from '../../lib/utils';

interface BuilderProgressProps {
  categories: BuilderCategory[];
  selectedComponents: Record<string, Product>;
}

/** Step-by-step wizard progress bar. Click a step to jump to its card. */
export const BuilderProgress: React.FC<BuilderProgressProps> = ({ categories, selectedComponents }) => {
  const required = categories.filter(c => c.required);
  const doneRequired = required.filter(c => selectedComponents[c.id]).length;
  const percent = required.length ? Math.round((doneRequired / required.length) * 100) : 0;
  const currentIdx = categories.findIndex(c => !selectedComponents[c.id]);

  const jump = (id: string) => {
    document.getElementById(`builder-step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_16px_rgba(15,23,42,0.05)] p-5 mb-8 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Your build progress</h2>
          <p className="text-xs text-slate-500">
            {doneRequired} of {required.length} required parts selected
          </p>
        </div>
        <span className="text-2xl font-black text-slate-900">{percent}%</span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {categories.map((cat, idx) => {
          const done = !!selectedComponents[cat.id];
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={cat.id}
              onClick={() => jump(cat.id)}
              className={cn(
                'flex items-center gap-2 shrink-0 pl-1.5 pr-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors',
                done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isCurrent
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center text-[10px]',
                  done ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {done ? <Check size={11} strokeWidth={3} /> : idx + 1}
              </span>
              {cat.name || cat.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};
