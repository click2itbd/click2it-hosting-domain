import React from 'react';
import { X, Folder } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200", maxWidth)}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const isActive = status === 'active' || status === 'published' || status === 'completed';
  const isPending = status === 'pending' || status === 'draft';
  
  let color = 'bg-slate-100 text-slate-600 border-slate-200';
  if (isActive) color = 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (isPending) color = 'bg-amber-50 text-amber-600 border-amber-200';

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm', color)}>
      {status}
    </span>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl">
      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-slate-300">
        <Folder size={32} />
      </div>
      <p className="font-medium text-sm">{message}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
  );
}

export function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition">Prev</button>
      <span className="text-sm font-bold text-slate-800">Page {page} of {Math.max(1, totalPages)}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition">Next</button>
    </div>
  );
}
