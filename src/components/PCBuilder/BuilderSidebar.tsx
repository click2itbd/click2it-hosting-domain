import React from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { ShoppingCart, Save, Share2, Printer, Zap, AlertTriangle, ShieldCheck, Mail, FileDown, Gamepad2, BrainCircuit, Star } from 'lucide-react';
import { calculateEstimatedWattage, getOverallCompatibility } from './utils';
import { CompatibilityEngine } from './CompatibilityEngine';
import { FPSPredictor } from './FPSPredictor';
import { BottleneckCalculator } from './BottleneckCalculator';

interface BuilderSidebarProps {
  selectedComponents: Record<string, Product>;
  includeAssembly?: boolean;
  onToggleAssembly?: () => void;
  onAddToCart: () => void;
  onSaveBuild: () => void;
  onPrintBuild: () => void;
  onDownloadPDF: () => void;
  onEmailBuild: () => void;
  onPublishBuild: () => void;
}

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({ 
  selectedComponents,
  includeAssembly = false,
  onToggleAssembly,
  onAddToCart,
  onSaveBuild,
  onPrintBuild,
    onDownloadPDF,
  onEmailBuild,
  onPublishBuild
}) => {
  const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
  const basePrice = selectedList.reduce((sum, p) => sum + p.price, 0);
  const assemblyFee = includeAssembly ? 1500 : 0;
  const totalPrice = basePrice + assemblyFee;
  const estimatedWattage = calculateEstimatedWattage(selectedComponents);
  const compatibility = getOverallCompatibility(selectedComponents);
  const aiAnalysis = CompatibilityEngine.evaluateScore(selectedComponents);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.07)] p-6 relative overflow-hidden">
      
      <h3 className="text-xl font-black tracking-tight text-slate-900 mb-6">Build Summary</h3>
      
      <div className="space-y-4 mb-6">
        {/* Compatibility Report */}
          {/* Hide if perfectly compatible */}
        {selectedList.length > 1 && (!compatibility.isCompatible || compatibility.warnings.length > 0) && (
          <div className={`p-4 rounded-xl border ${compatibility.isCompatible ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              {compatibility.isCompatible ? (
                <ShieldCheck className="text-emerald-500" size={18} />
              ) : (
                <AlertTriangle className="text-red-500" size={18} />
              )}
              <span className={`font-bold text-sm ${compatibility.isCompatible ? 'text-emerald-700' : 'text-red-700'}`}>
                {compatibility.isCompatible ? 'System is Compatible' : 'Compatibility Issues Found'}
              </span>
            </div>
            {compatibility.errors.map((err, i) => (
              <p key={`err-${i}`} className="text-xs text-red-600 mt-1">• {err}</p>
            ))}
            {compatibility.warnings.map((warn, i) => (
              <p key={`warn-${i}`} className="text-xs text-amber-600 mt-1">• {warn}</p>
            ))}
            {compatibility.isCompatible && compatibility.warnings.length === 0 && (
              <p className="text-xs text-emerald-600">All selected parts will work together perfectly.</p>
            )}
          </div>
        )}

        
          {/* AI Build Score */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit size={64} className="text-violet-400" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-violet-700 flex items-center gap-2">
                  <BrainCircuit size={16} /> AI Build Rating
                </h4>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-violet-100 shadow-sm">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="font-black text-slate-900">{aiAnalysis.score.toFixed(1)}<span className="text-slate-500 text-xs">/10</span></span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {aiAnalysis.text}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div>
            <p className="text-sm text-slate-500 font-medium">Estimated Wattage</p>
            <div className="flex items-center gap-2 mt-1">
              <Zap className="text-amber-500" size={18} />
              <span className="font-bold text-slate-900">{estimatedWattage}W</span>
            </div>
          </div>
        </div>

                <div className="border-t border-slate-200 pt-6 space-y-3">
          {onToggleAssembly && (
            <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={includeAssembly} onChange={onToggleAssembly} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Add Professional Assembly</p>
                  <p className="text-xs text-slate-500">Cable management & OS installation</p>
                </div>
              </div>
              <span className="font-bold text-slate-900">৳1,500</span>
            </label>
          )}
          <div className="flex justify-between items-end pt-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Price</p>
            <p className="text-3xl font-black text-slate-900">
              {formatCurrency(totalPrice)}
            </p>
          </div>
        </div>
      
      <FPSPredictor cpu={selectedComponents['Processor']} gpu={selectedComponents['Graphics Card']} />
      <BottleneckCalculator cpu={selectedComponents['Processor']} gpu={selectedComponents['Graphics Card']} />

      </div>

      <div className="space-y-3">
        <button
          onClick={onAddToCart}
          className="w-full bg-slate-900 hover:bg-violet-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <ShoppingCart size={20} className="relative z-10" />
          <span className="relative z-10 text-lg">Add to Cart</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onSaveBuild}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <Save size={16} />
            Save
          </button>
          <button 
            onClick={onPrintBuild}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <Printer size={16} />
            Print
          </button>
          <button 
            onClick={onDownloadPDF}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <FileDown size={16} />
            PDF
          </button>
          <button 
            onClick={onEmailBuild}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <Mail size={16} />
            Email
          </button>
        </div>
        
        <button 
          onClick={onPublishBuild}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 text-violet-700 rounded-2xl hover:bg-violet-100 transition-colors font-bold text-sm"
        >
          <Share2 size={16} />
          Publish to Community
        </button>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <button 
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors font-bold text-sm border border-slate-200"
            onClick={() => {
              const ids = Object.entries(selectedComponents)
                .filter(([_, product]) => product)
                .map(([cat, product]) => `${cat}:${product?.id}`)
                .join(',');
              const shareUrl = `${window.location.origin}/pc-build?build=${btoa(ids)}`;
              navigator.clipboard.writeText(shareUrl);
              alert('Build link copied to clipboard!');
            }}
          >
            <Share2 size={16} />
            Copy Link
          </button>

          <button 
            className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 text-[#128C7E] rounded-2xl hover:bg-[#25D366]/20 transition-colors font-bold text-sm border border-[#25D366]/30"
            onClick={() => {
              const selectedList = Object.values(selectedComponents).filter(Boolean);
              if (selectedList.length === 0) return alert('Add components first!');
              const totalPrice = selectedList.reduce((sum, p) => sum + (p.discountPrice || p.price), 0);
              let msg = '*My Dream PC Build*\n\n';
              Object.entries(selectedComponents).forEach(([cat, p]) => {
                if (p) msg += `*${cat}*: ${p.name}\n`;
              });
              msg += `\n*Total Est.*: ৳${totalPrice}\n\n`;
              const ids = Object.entries(selectedComponents).filter(([_, product]) => product).map(([cat, product]) => `${cat}:${product?.id}`).join(',');
              const shareUrl = `${window.location.origin}/pc-build?build=${btoa(ids)}`;
              msg += `Link: ${shareUrl}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            }}
          >
            <Share2 size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selected Parts ({selectedList.length})</h4>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {selectedList.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No parts selected yet.</p>
          ) : (
            selectedList.map((product, idx) => (
              <div key={idx} className="flex justify-between items-start gap-3">
                <p className="text-sm font-medium text-slate-700 line-clamp-2 flex-grow">{product.name}</p>
                <p className="text-sm font-bold text-slate-900 shrink-0">{formatCurrency(product.price)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 relative group">
        
        <div className="relative bg-slate-50 rounded-2xl border border-slate-100">
          <FPSPredictor 
            cpu={selectedComponents['cpu']} 
            gpu={selectedComponents['graphics-card']} 
          />
        </div>
      </div>
    </div>
  );
};
