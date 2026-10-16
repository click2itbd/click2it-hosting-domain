import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../types';
import { X, Sparkles, Loader2, Gamepad2, MonitorPlay, Briefcase, Cpu, Check, CheckCircle2 } from 'lucide-react';
import { getCompatibility } from './utils';
import { formatCurrency, cn } from '../../lib/utils';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onApplyBuild: (build: Record<string, Product>) => void;
}

type Step = 'budget' | 'usecase' | 'platform' | 'generating' | 'result';

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  products,
  onApplyBuild
}) => {
  const [step, setStep] = useState<Step>('budget');
  const [budget, setBudget] = useState<number>(80000);
  const [useCase, setUseCase] = useState<'gaming' | 'editing' | 'office'>('gaming');
  const [platform, setPlatform] = useState<'intel' | 'amd' | 'any'>('any');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedBuild, setSuggestedBuild] = useState<{
    components: Record<string, Product>;
    explanation: string;
    total: number;
  } | null>(null);

  const generateAIResponse = async () => {
    setStep('generating');
    setIsProcessing(true);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const allocations: any = {
        gaming: { cpu: 0.20, motherboard: 0.15, ram: 0.10, 'graphics-card': 0.35, storage: 0.08, 'power-supply': 0.07, casing: 0.05 },
        editing: { cpu: 0.30, motherboard: 0.15, ram: 0.20, 'graphics-card': 0.20, storage: 0.10, 'power-supply': 0.05, casing: 0.05 },
        office: { cpu: 0.40, motherboard: 0.20, ram: 0.15, storage: 0.15, 'power-supply': 0.05, casing: 0.05 }
      };

      const targetAllocations = allocations[useCase];
      const build: Record<string, Product> = {};
      let currentCost = 0;
      const normalize = (str: string) => (str || '').toLowerCase().replace(/[- ]/g, '');

      Object.entries(targetAllocations).forEach(([category, percentage]) => {
        const categoryBudget = budget * (percentage as number);
        const catIdNorm = normalize(category);
        
        const categoryProducts = products.filter(p => {
          const pCatNorm = normalize(p.category);
          const pNameNorm = normalize(p.name);
          let matches = pCatNorm.includes(catIdNorm) || pNameNorm.includes(catIdNorm);
          
          if (catIdNorm === 'graphicscard' && (pCatNorm.includes('gpu') || pNameNorm.includes('gpu') || pCatNorm.includes('graphics'))) matches = true;
          if (catIdNorm === 'powersupply' && (pCatNorm.includes('psu') || pNameNorm.includes('psu') || pCatNorm.includes('power'))) matches = true;
          if (catIdNorm === 'cpu' && (pCatNorm.includes('processor') || pNameNorm.includes('processor'))) matches = true;
          if (catIdNorm === 'ram' && (pCatNorm.includes('memory') || pNameNorm.includes('memory'))) matches = true;
          if (catIdNorm === 'storage' && (pCatNorm.includes('ssd') || pNameNorm.includes('ssd') || pCatNorm.includes('hdd'))) matches = true;
          if (catIdNorm === 'casing' && (pCatNorm.includes('case') || pNameNorm.includes('case'))) matches = true;
          
          // Platform filtering for CPU and Motherboard
          if (platform !== 'any' && matches) {
            if (catIdNorm === 'cpu' || catIdNorm === 'processor' || catIdNorm === 'motherboard') {
              if (platform === 'intel' && !pNameNorm.includes('intel') && !p.socketType?.toLowerCase().includes('lga')) return false;
              if (platform === 'amd' && !pNameNorm.includes('amd') && !pNameNorm.includes('ryzen') && !p.socketType?.toLowerCase().includes('am')) return false;
            }
          }
          
          return matches && p.stock > 0;
        });

        const affordableProducts = categoryProducts
          .filter(p => p.price <= categoryBudget * 1.3) // Allow slightly over budget for better matching
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
        } else if (categoryProducts.length > 0) {
           // Fallback if none under budget: get the cheapest compatible one
           const cheapest = categoryProducts.sort((a,b) => a.price - b.price);
           for (const product of cheapest) {
            const comp = getCompatibility(category, product, build);
            if (comp.isCompatible) {
              build[category] = product;
              currentCost += product.price;
              break;
            }
          }
        }
      });

      let explanation = '';
      if (useCase === 'gaming') {
        explanation = `Based on your ${formatCurrency(budget)} budget, I prioritized a powerful graphics card for high frame rates, paired with a balanced ${platform !== 'any' ? platform.toUpperCase() : ''} CPU to prevent bottlenecks.`;
      } else if (useCase === 'editing') {
        explanation = `For content creation under ${formatCurrency(budget)}, I selected a multi-core ${platform !== 'any' ? platform.toUpperCase() : ''} CPU and extra RAM for smooth timeline scrubbing and faster rendering.`;
      } else {
        explanation = `This ${formatCurrency(budget)} office build focuses on reliability and fast storage for snappy boot times and smooth multitasking.`;
      }

      setSuggestedBuild({
        components: build,
        explanation,
        total: currentCost
      });
      setStep('result');
    } catch (error) {
      console.error(error);
      setStep('budget');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (suggestedBuild) {
      onApplyBuild(suggestedBuild.components);
      setTimeout(() => {
        onClose();
        setStep('budget');
        setSuggestedBuild(null);
      }, 300);
    }
  };

  if (!isOpen) return null;

  const quickBudgets = [40000, 60000, 80000, 100000, 150000, 200000];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Auto-Builder</h2>
              <p className="text-sm text-slate-500 mt-0.5">Let our smart engine design your perfect PC</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            
            {step === 'budget' && (
              <motion.div key="budget" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-2xl font-black text-slate-900 mb-6">What is your target budget?</h3>
                
                <div className="mb-8">
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-4 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
                    <span className="text-slate-400 font-bold pl-4 text-xl">৳</span>
                    <input 
                      type="number"
                      value={budget || ''}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="bg-transparent border-none outline-none text-3xl font-black text-slate-900 w-full py-2"
                      placeholder="80000"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickBudgets.map(val => (
                      <button
                        key={val}
                        onClick={() => setBudget(val)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                          budget === val ? "bg-violet-600 text-white border-violet-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        {formatCurrency(val)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setStep('usecase')}
                    disabled={!budget || budget < 10000}
                    className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'usecase' && (
              <motion.div key="usecase" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-2xl font-black text-slate-900 mb-6">What will you use it for?</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'gaming', label: 'Gaming', icon: Gamepad2, desc: 'High FPS & Graphics' },
                    { id: 'editing', label: 'Content Creation', icon: MonitorPlay, desc: 'Video Editing & 3D' },
                    { id: 'office', label: 'Office / Study', icon: Briefcase, desc: 'Multitasking & Web' }
                  ].map(uc => (
                    <button
                      key={uc.id}
                      onClick={() => setUseCase(uc.id as any)}
                      className={cn(
                        "flex flex-col items-center p-6 rounded-3xl border-2 transition-all text-center group",
                        useCase === uc.id 
                          ? "border-violet-500 bg-violet-50/50 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                        useCase === uc.id ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400 group-hover:text-violet-500"
                      )}>
                        <uc.icon size={24} />
                      </div>
                      <span className="font-bold text-slate-900 mb-1">{uc.label}</span>
                      <span className="text-xs text-slate-500 font-medium">{uc.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between mt-8">
                  <button onClick={() => setStep('budget')} className="px-6 py-3.5 text-slate-500 font-bold hover:text-slate-900">Back</button>
                  <button
                    onClick={() => setStep('platform')}
                    className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-violet-600 transition-colors"
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'platform' && (
              <motion.div key="platform" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-2xl font-black text-slate-900 mb-6">Any CPU preference?</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'intel', label: 'Intel', icon: Cpu },
                    { id: 'amd', label: 'AMD Ryzen', icon: Cpu },
                    { id: 'any', label: 'No Preference', icon: Sparkles }
                  ].map(pf => (
                    <button
                      key={pf.id}
                      onClick={() => setPlatform(pf.id as any)}
                      className={cn(
                        "flex flex-col items-center p-6 rounded-3xl border-2 transition-all text-center group",
                        platform === pf.id 
                          ? "border-violet-500 bg-violet-50/50 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                        platform === pf.id ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400 group-hover:text-violet-500"
                      )}>
                        <pf.icon size={24} />
                      </div>
                      <span className="font-bold text-slate-900">{pf.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between mt-8">
                  <button onClick={() => setStep('usecase')} className="px-6 py-3.5 text-slate-500 font-bold hover:text-slate-900">Back</button>
                  <button
                    onClick={generateAIResponse}
                    className="px-8 py-3.5 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-lg shadow-violet-500/20"
                  >
                    <Sparkles size={18} /> Generate Build
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                  <div className="w-20 h-20 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center justify-center relative z-10">
                    <Loader2 size={32} className="text-violet-600 animate-spin" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Analyzing combinations...</h3>
                <p className="text-slate-500 font-medium">Finding the perfect parts for your budget</p>
              </motion.div>
            )}

            {step === 'result' && suggestedBuild && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    <h3 className="font-black text-emerald-900">Build Generated Successfully!</h3>
                  </div>
                  <p className="text-emerald-700 text-sm font-medium leading-relaxed">{suggestedBuild.explanation}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-8">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Suggested Parts</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                    {Object.entries(suggestedBuild.components).map(([cat, product]) => (
                      <div key={cat} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <img src={product.images?.[0] || '/placeholder.png'} className="w-12 h-12 object-contain mix-blend-multiply" />
                        <div>
                          <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">{cat.replace('-', ' ')}</p>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-end">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Est. Total</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrency(suggestedBuild.total)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={() => setStep('budget')} className="px-6 py-3.5 text-slate-500 font-bold hover:text-slate-900 flex items-center gap-2">
                    <Sparkles size={16} /> Try Again
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-violet-600 transition-colors shadow-lg shadow-slate-900/10"
                  >
                    Apply to Builder
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
