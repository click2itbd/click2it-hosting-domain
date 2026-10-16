import React from 'react';
import { Product } from '../../types';
import { BuilderCategory } from './constants';
import { formatCurrency, cn } from '../../lib/utils';
import { getColorfulIcon } from './ColorfulIcons';
import { Plus, Check, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface BuilderCategoryRowProps {
  category: BuilderCategory;
  selectedProduct?: Product;
  compatibility: { isCompatible: boolean; reason: string };
  onRemove: () => void;
  onChoose: () => void;
  step?: number;
}

/**
 * Card-style component slot (Modern Card Grid design).
 * Kept the filename/export for backwards compatibility.
 */
export const BuilderCategoryRow: React.FC<BuilderCategoryRowProps> = ({
  category,
  selectedProduct,
  compatibility,
  onRemove,
  onChoose,
  step,
}) => {
  const Icon = category.icon;
  const hasError = !!selectedProduct && !compatibility.isCompatible;

  return (
    <motion.div
      id={`builder-step-${category.id}`}
      layout
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'group relative flex flex-col bg-white rounded-3xl p-5 border transition-shadow duration-300',
        'shadow-[0_2px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]',
        hasError
          ? 'border-red-200 bg-red-50/40'
          : selectedProduct
            ? 'border-violet-200 ring-1 ring-violet-100'
            : 'border-slate-200/80'
      )}
    >
      {/* Header: step + name */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {step !== undefined && (
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors',
                selectedProduct && !hasError
                  ? 'bg-emerald-500 text-white'
                  : hasError
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-500'
              )}
            >
              {selectedProduct && !hasError ? <Check size={14} strokeWidth={3} /> : step}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{category.name || category.title}</h3>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {category.required ? 'Required' : 'Optional'}
            </p>
          </div>
        </div>
        {selectedProduct && (
          <button
            onClick={onRemove}
            title="Remove component"
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Image area */}
      <div
        className={cn(
          'relative h-36 rounded-2xl flex items-center justify-center overflow-hidden mb-4 transition-colors',
          selectedProduct ? 'bg-slate-50' : 'bg-slate-50 border-2 border-dashed border-slate-200'
        )}
      >
        {selectedProduct ? (
          <img
            src={selectedProduct.images?.[0] || '/placeholder.png'}
            alt={selectedProduct.name}
            className="max-h-full max-w-full object-contain p-3 mix-blend-multiply"
            referrerPolicy="no-referrer"
          />
        ) : category.placeholderImage ? (
          <img
            src={category.placeholderImage}
            alt={category.title || category.name}
            className="max-h-full max-w-full object-contain p-4 opacity-40 mix-blend-multiply"
          />
        ) : (
          <div className="text-slate-300">{getColorfulIcon(category.id, <Icon size={40} />)}</div>
        )}
      </div>

      {/* Body */}
      <div className="flex-grow mb-4 min-h-[56px]">
        {selectedProduct ? (
          <>
            <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{selectedProduct.name}</p>
            <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(selectedProduct.price)}</p>
            {hasError && (
              <p className="mt-2 text-[11px] text-red-600 font-medium flex items-start gap-1">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {compatibility.reason}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">No {(category.name || category.title || 'part').toLowerCase()} selected yet</p>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onChoose}
        className={cn(
          'w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2',
          selectedProduct
            ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            : 'bg-slate-900 text-white hover:bg-violet-600 shadow-lg shadow-slate-900/10'
        )}
      >
        {!selectedProduct && <Plus size={16} />}
        {selectedProduct ? 'Change' : 'Choose'}
      </button>
    </motion.div>
  );
};
