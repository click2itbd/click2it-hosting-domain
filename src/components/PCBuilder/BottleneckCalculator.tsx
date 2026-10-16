import React from 'react';
import { Product } from '../../types';
import { AlertTriangle, Activity } from 'lucide-react';

interface BottleneckCalculatorProps {
  cpu?: Product;
  gpu?: Product;
}

export const BottleneckCalculator: React.FC<BottleneckCalculatorProps> = ({ cpu, gpu }) => {
  if (!cpu || !gpu) return null;

  // Simple bottleneck logic based on product names
  // In a real app, this would use benchmark scores
  const getScore = (name: string, isCpu: boolean) => {
    const n = name.toLowerCase();
    let score = 50; // base score
    
    if (isCpu) {
      if (n.includes('i9') || n.includes('ryzen 9')) score = 100;
      else if (n.includes('i7') || n.includes('ryzen 7')) score = 80;
      else if (n.includes('i5') || n.includes('ryzen 5')) score = 60;
      else if (n.includes('i3') || n.includes('ryzen 3')) score = 40;
    } else {
      if (n.includes('4090') || n.includes('rx 7900')) score = 100;
      else if (n.includes('4080') || n.includes('7800')) score = 90;
      else if (n.includes('4070') || n.includes('7700')) score = 80;
      else if (n.includes('4060') || n.includes('3060') || n.includes('7600') || n.includes('6600')) score = 60;
      else if (n.includes('3050') || n.includes('1650') || n.includes('6500')) score = 40;
    }
    
    return score;
  };

  const cpuScore = getScore(cpu.name, true);
  const gpuScore = getScore(gpu.name, false);
  
  // Calculate bottleneck percentage
  const ratio = cpuScore / gpuScore;
  let bottleneckPercent = 0;
  let bottleneckComponent = '';
  
  if (ratio > 1.25) {
    bottleneckPercent = Math.min(100, Math.floor(((ratio - 1) / ratio) * 100));
    bottleneckComponent = 'GPU';
  } else if (ratio < 0.75) {
    const invertedRatio = gpuScore / cpuScore;
    bottleneckPercent = Math.min(100, Math.floor(((invertedRatio - 1) / invertedRatio) * 100));
    bottleneckComponent = 'CPU';
  }

  if (bottleneckPercent < 5) return null; // Balanced build, don't show warning

  return (
    <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="text-orange-500" size={16} />
        <h4 className="text-sm font-bold text-orange-800">Bottleneck Warning</h4>
      </div>
      
      <p className="text-xs text-orange-700 leading-tight mb-3">
        Your <span className="font-bold">{bottleneckComponent}</span> is significantly weaker than your other components. This will create a <span className="font-bold text-red-600">{bottleneckPercent}%</span> bottleneck at 1080p gaming.
      </p>
      
      <div className="flex items-center gap-2 text-xs font-medium text-orange-800 bg-orange-100/50 p-2 rounded-lg">
        <Activity size={14} className="text-orange-600" />
        <span>Consider upgrading your {bottleneckComponent} for better performance.</span>
      </div>
    </div>
  );
};
