import React from 'react';
import { Product } from '../../types';
import { Target, MonitorPlay, Zap } from 'lucide-react';

interface FPSPredictorProps {
  cpu?: Product;
  gpu?: Product;
}

export const FPSPredictor: React.FC<FPSPredictorProps> = ({ cpu, gpu }) => {
  if (!cpu || !gpu) return null;

  // Simple heuristic based prediction for demonstration.
  // In a real-world app, this would query a database of benchmark data.
  const calculateFPS = (game: string) => {
    let baseFPS = 60;
    
    // CPU factor
    const cpuName = cpu.name.toLowerCase();
    if (cpuName.includes('i9') || cpuName.includes('ryzen 9')) baseFPS += 60;
    else if (cpuName.includes('i7') || cpuName.includes('ryzen 7')) baseFPS += 40;
    else if (cpuName.includes('i5') || cpuName.includes('ryzen 5')) baseFPS += 20;

    // GPU factor
    const gpuName = gpu.name.toLowerCase();
    if (gpuName.includes('4090') || gpuName.includes('rx 7900')) baseFPS += 150;
    else if (gpuName.includes('4080') || gpuName.includes('4070')) baseFPS += 100;
    else if (gpuName.includes('3060') || gpuName.includes('4060')) baseFPS += 60;

    // Game multipliers
    if (game === 'Valorant') return Math.floor(baseFPS * 2.5);
    if (game === 'Cyberpunk 2077') return Math.floor(baseFPS * 0.4);
    if (game === 'GTA V') return Math.floor(baseFPS * 1.2);
    
    return baseFPS;
  };

  const games = ['Valorant', 'Cyberpunk 2077', 'GTA V'];

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-indigo-500" size={16} />
        <h4 className="text-sm font-bold text-slate-800">Gaming Performance (Est.)</h4>
      </div>
      
      <div className="space-y-4">
        {games.map(game => {
          const fps = calculateFPS(game);
          const maxFps = game === 'Valorant' ? 500 : game === 'GTA V' ? 200 : 120;
          const percentage = Math.min(100, Math.max(5, (fps / maxFps) * 100));
          const colorClass = game === 'Valorant' ? 'from-green-500 to-green-400' : game === 'GTA V' ? 'from-blue-500 to-blue-400' : 'from-purple-500 to-purple-400';
          const textClass = game === 'Valorant' ? 'text-green-600' : game === 'GTA V' ? 'text-blue-600' : 'text-purple-600';
          
          return (
            <div key={game} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonitorPlay size={12} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">{game} <span className="text-slate-400 font-normal">(1080p High)</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${textClass}`}>{fps}</span>
                  <span className="text-[10px] text-slate-500 font-medium">FPS</span>
                </div>
              </div>
              <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                <div className={`bg-gradient-to-r ${colorClass} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-start gap-2">
        <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-tight">
          Estimates are based on selected CPU & GPU combinations and may vary depending on RAM, resolution, and cooling.
        </p>
      </div>
    </div>
  );
};
