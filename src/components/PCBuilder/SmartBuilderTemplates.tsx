import React, { useState } from 'react';
import { Product } from '../../types';
import { Gamepad2, Video, Briefcase, Radio, Zap, Sparkles } from 'lucide-react';
import { getCompatibility } from './utils';
import { toast } from 'react-hot-toast';

interface SmartBuilderTemplatesProps {
  products: Product[];
  onApplyBuild: (build: Record<string, Product>) => void;
}

export const SmartBuilderTemplates: React.FC<SmartBuilderTemplatesProps> = ({ products, onApplyBuild }) => {
  const [budget, setBudget] = useState<number>(80000);
  const [activeTemplate, setActiveTemplate] = useState<string>('gaming');

  const templates = [
    { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
    { id: 'editing', name: 'Editing', icon: Video },
    { id: 'office', name: 'Office', icon: Briefcase },
    { id: 'streaming', name: 'Streaming', icon: Radio },
  ];

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/\D/g, ''));
    if (!isNaN(val)) setBudget(val);
    else setBudget(0);
  };

  const generateBuild = () => {
    const build: Record<string, Product> = {};
    const allocations = {
      gaming: { cpu: 0.20, motherboard: 0.15, ram: 0.10, 'graphics-card': 0.35, storage: 0.08, 'power-supply': 0.07, casing: 0.05 },
      editing: { cpu: 0.30, motherboard: 0.15, ram: 0.15, 'graphics-card': 0.20, storage: 0.10, 'power-supply': 0.05, casing: 0.05 },
      office: { cpu: 0.40, motherboard: 0.20, ram: 0.15, storage: 0.15, 'power-supply': 0.05, casing: 0.05 },
      streaming: { cpu: 0.25, motherboard: 0.15, ram: 0.15, 'graphics-card': 0.30, storage: 0.05, 'power-supply': 0.05, casing: 0.05 },
    };

    const targetAllocations = allocations[activeTemplate as keyof typeof allocations];
    let currentCost = 0;

    Object.entries(targetAllocations).forEach(([category, percentage]) => {
      const categoryBudget = budget * percentage;
      const normalize = (str: string) => (str || '').toLowerCase().replace(/[- ]/g, '');
      const catIdNorm = normalize(category);
      const categoryProducts = products.filter(p => {
        const pCatNorm = normalize(p.category);
        const pNameNorm = normalize(p.name);
        
        let matches = pCatNorm.includes(catIdNorm) || pNameNorm.includes(catIdNorm);
        if (catIdNorm === 'graphicscard' && (pCatNorm.includes('gpu') || pNameNorm.includes('gpu') || pCatNorm.includes('graphics') || pNameNorm.includes('graphics'))) matches = true;
        if (catIdNorm === 'powersupply' && (pCatNorm.includes('psu') || pNameNorm.includes('psu') || pCatNorm.includes('power') || pNameNorm.includes('power'))) matches = true;
        if (catIdNorm === 'cpu' && (pCatNorm.includes('processor') || pNameNorm.includes('processor'))) matches = true;
        if (catIdNorm === 'ram' && (pCatNorm.includes('memory') || pNameNorm.includes('memory'))) matches = true;
        if (catIdNorm === 'storage' && (pCatNorm.includes('ssd') || pNameNorm.includes('ssd') || pCatNorm.includes('hdd') || pNameNorm.includes('hdd'))) matches = true;
        if (catIdNorm === 'casing' && (pCatNorm.includes('case') || pNameNorm.includes('case'))) matches = true;
        return matches;
      });
      
      const affordableProducts = categoryProducts
        .filter(p => p.price <= categoryBudget)
        .sort((a, b) => b.price - a.price);

      if (affordableProducts.length > 0) {
        for (const product of affordableProducts) {
          const comp = getCompatibility(category, product, build);
          if (comp.isCompatible) {
            build[category] = product;
            currentCost += product.price;
            break;
          }
        }
      }
    });

    if (Object.keys(build).length === 0) {
      toast.error("Couldn't find compatible parts for this budget. Try increasing it.");
      return;
    }

    onApplyBuild(build);
    toast.success(`Generated ${activeTemplate} build for BDT ${currentCost.toLocaleString()}!`);
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 500);
  };

  return (
    <div className="bg-slate-100 rounded-2xl border border-slate-200 p-6 mb-10 shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-violet-600 p-1.5 rounded-lg">
          <Zap className="text-slate-900" size={18} fill="currentColor" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Smart Build Generator</h2>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
        
        {/* Budget Input & Slider */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-500">Target Budget (BDT)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">BDT</span>
            <input 
              type="text" 
              value={budget.toLocaleString()} 
              onChange={handleBudgetChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-slate-900 font-bold focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <input 
            type="range" 
            min="20000" 
            max="300000" 
            step="5000"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>20K</span>
            <span>300K+</span>
          </div>
        </div>

        {/* Use Case Selection */}
        <div className="w-full lg:w-[45%] flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-500">Primary Use Case</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates.map(t => {
              const Icon = t.icon;
              const isActive = activeTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                    isActive 
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400' 
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-600 hover:text-slate-700'
                  }`}
                >
                  <Icon size={20} className="mb-2" />
                  <span className="text-xs font-bold">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Action */}
        <div className="w-full lg:w-auto lg:flex-1 flex flex-col justify-end lg:h-[84px]">
          <button 
            onClick={generateBuild}
            className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap px-6 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-95"
          >
            <Sparkles size={18} className="shrink-0" />
            Generate Build
          </button>
        </div>

      </div>
    </div>
  );
};
