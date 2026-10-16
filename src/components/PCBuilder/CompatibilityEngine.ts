import { Product } from '../../types';

export interface CompatibilityReport {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
}

export class CompatibilityEngine {
  
  /**
   * Evaluates the selected components and returns a comprehensive compatibility report.
   */
  static evaluate(selectedProducts: Record<string, Product>): CompatibilityReport {
    const report: CompatibilityReport = {
      isCompatible: true,
      errors: [],
      warnings: []
    };

    const cpu = selectedProducts['cpu'];
    const mobo = selectedProducts['motherboard'];
    const ram = selectedProducts['ram'];
    const casing = selectedProducts['casing'];
    const gpu = selectedProducts['graphics-card'];
    const cooler = selectedProducts['cpu-cooler'];
    const psu = selectedProducts['power-supply'];

    // Smart Heuristics based on names
    const nCpu = cpu?.name.toLowerCase() || '';
    const nMobo = mobo?.name.toLowerCase() || '';
    const nRam = ram?.name.toLowerCase() || '';

    // CPU vs Mobo Heuristics
    if (cpu && mobo) {
      const isIntelCPU = nCpu.includes('intel') || nCpu.includes('core i');
      const isAMDCPU = nCpu.includes('amd') || nCpu.includes('ryzen');
      
      const isIntelMobo = nMobo.includes('h610') || nMobo.includes('b660') || nMobo.includes('b760') || nMobo.includes('z690') || nMobo.includes('z790') || nMobo.includes('intel') || nMobo.includes('lga');
      const isAMDMobo = nMobo.includes('a320') || nMobo.includes('b450') || nMobo.includes('b550') || nMobo.includes('x570') || nMobo.includes('a620') || nMobo.includes('b650') || nMobo.includes('x670') || nMobo.includes('amd') || nMobo.includes('am4') || nMobo.includes('am5');

      if (isIntelCPU && isAMDMobo) {
        report.errors.push(`Incompatible: Intel Processor (${cpu.name}) cannot be used with an AMD Motherboard.`);
      } else if (isAMDCPU && isIntelMobo) {
        report.errors.push(`Incompatible: AMD Processor (${cpu.name}) cannot be used with an Intel Motherboard.`);
      }
    }

    // RAM vs Mobo Heuristics
    if (ram && mobo) {
      const isMoboDDR5 = nMobo.includes('d5') || nMobo.includes('ddr5') || nMobo.includes('z790') || nMobo.includes('x670') || nMobo.includes('b650');
      const isMoboDDR4 = nMobo.includes('d4') || nMobo.includes('ddr4') || nMobo.includes('b450') || nMobo.includes('b550') || nMobo.includes('h610');
      
      const isRamDDR5 = nRam.includes('ddr5');
      const isRamDDR4 = nRam.includes('ddr4');

      if (isMoboDDR5 && isRamDDR4) {
        report.errors.push(`Incompatible RAM: ${mobo.name} requires DDR5 RAM, but you selected DDR4.`);
      } else if (isMoboDDR4 && isRamDDR5) {
        report.errors.push(`Incompatible RAM: ${mobo.name} supports only DDR4 RAM, but you selected DDR5.`);
      }
    }
    
    // 1. CPU & Motherboard Socket Check
    if (cpu && mobo) {
      if (cpu.socketType && mobo.socketType && cpu.socketType !== mobo.socketType) {
        report.errors.push(`Socket mismatch: ${cpu.name} uses ${cpu.socketType} but motherboard supports ${mobo.socketType}.`);
      }
    }

    // 2. RAM & Motherboard Check
    if (ram && mobo) {
      if (ram.ramType && mobo.ramType && ram.ramType !== mobo.ramType) {
        report.errors.push(`RAM mismatch: ${ram.name} is ${ram.ramType}, but motherboard requires ${mobo.ramType}.`);
      }
    }

    // 3. Physical Dimensions: Motherboard & Casing
    if (mobo && casing) {
      if (mobo.formFactor && casing.formFactor) {
        const boardSize = this.getFormFactorSize(mobo.formFactor);
        const caseSize = this.getFormFactorSize(casing.formFactor);
        if (boardSize > caseSize) {
          report.errors.push(`Form Factor mismatch: Casing does not support ${mobo.formFactor} motherboards.`);
        }
      }
    }

    // 4. Physical Dimensions: GPU & Casing
    if (gpu && casing) {
      if (gpu.length && casing.length) {
        if (gpu.length > casing.length) {
          report.errors.push(`GPU Clearance: Graphics card (${gpu.length}mm) is too long for the casing (max ${casing.length}mm).`);
        } else if (casing.length - gpu.length < 15) {
          report.warnings.push(`GPU clearance is very tight. Graphics card is ${gpu.length}mm and casing max is ${casing.length}mm.`);
        }
      }
    }

    // 5. Physical Dimensions: Cooler & Casing
    if (cooler && casing) {
      if (cooler.height && casing.height) {
        if (cooler.height > casing.height) {
          report.errors.push(`Cooler Height: CPU Cooler (${cooler.height}mm) is too tall for the casing (max ${casing.height}mm).`);
        }
      }
    }

    // 6. Power Supply Check
    if (psu) {
      const totalTdp = this.calculateTotalTDP(selectedProducts);
      const recommendedWattage = totalTdp * 1.2; // 20% headroom
      const psuWattage = this.extractWattage(psu.name) || psu.tdp || 0; // Use TDP or regex for Wattage

      if (psuWattage > 0) {
        if (psuWattage < totalTdp) {
          report.errors.push(`Power Supply is too weak. System requires at least ${totalTdp}W, but PSU is ${psuWattage}W.`);
        } else if (psuWattage < recommendedWattage) {
          report.warnings.push(`Power Supply is sufficient, but ${recommendedWattage}W or higher is recommended for safety and future upgrades.`);
        }
      }
    }
    
    // 7. CPU & GPU Bottleneck Check
    if (cpu && gpu) {
      const cpuTier = this.getTier(cpu.name);
      const gpuTier = this.getTier(gpu.name);
      
      if (Math.abs(cpuTier - gpuTier) >= 2) {
        if (cpuTier < gpuTier) {
          report.warnings.push(`Bottleneck Warning: Your CPU (${cpu.name}) might bottleneck your high-end GPU (${gpu.name}). Consider a faster CPU.`);
        } else {
          report.warnings.push(`Bottleneck Warning: Your GPU (${gpu.name}) might bottleneck your high-end CPU (${cpu.name}) in gaming workloads.`);
        }
      }
    }

    if (report.errors.length > 0) {
      report.isCompatible = false;
    }

    return report;
  }

  private static getTier(name: string): number {
    const n = name.toLowerCase();
    // High-end (Tier 3)
    if (n.includes('i9') || n.includes('ryzen 9') || n.includes('4090') || n.includes('4080') || n.includes('7900')) return 3;
    // Mid-range (Tier 2)
    if (n.includes('i7') || n.includes('ryzen 7') || n.includes('4070') || n.includes('3080') || n.includes('7800') || n.includes('7700')) return 2;
    // Entry-level (Tier 1)
    return 1;
  }

  static calculateTotalTDP(selectedProducts: Record<string, Product>): number {
    let total = 50; // Base system TDP (motherboard baseline, fans, peripherals)

    Object.entries(selectedProducts).forEach(([catId, product]) => {
      if (!product) return;
      if (product.tdp) {
        total += product.tdp;
      } else {
        // Fallbacks based on the builder category ID
        const cat = catId.toLowerCase();
        
        // Smarter heuristic based on product name if TDP is missing
        const name = product.name.toLowerCase();
        
        if (cat.includes('cpu')) {
          if (name.includes('i9') || name.includes('ryzen 9')) total += 125;
          else if (name.includes('i7') || name.includes('ryzen 7')) total += 105;
          else total += 65;
        } 
        else if (cat.includes('graphic') || cat.includes('gpu')) {
          if (name.includes('4090') || name.includes('7900 xtx')) total += 450;
          else if (name.includes('4080') || name.includes('7900')) total += 320;
          else if (name.includes('4070') || name.includes('7800')) total += 200;
          else if (name.includes('3060') || name.includes('4060') || name.includes('7600')) total += 130;
          else total += 150;
        }
        else if (cat.includes('motherboard') || cat.includes('mobo')) total += 35;
        else if (cat.includes('ram') || cat.includes('memory')) total += 15;
        else if (cat.includes('storage') || cat.includes('ssd') || cat.includes('hdd')) total += 10;
        else if (cat.includes('cooler') || cat.includes('fan')) total += 10;
      }
    });

    return total;
  }

  private static extractWattage(name: string): number | null {
    const match = name.match(/(\d{3,4})\s*w/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Helper to rank form factors to determine fit.
   * e.g., ATX (3) will not fit in Mini-ITX (1) case.
   */
  private static getFormFactorSize(formFactor: string): number {
    const ff = formFactor.toLowerCase();
    if (ff.includes('e-atx')) return 4;
    if (ff.includes('atx')) return 3;
    if (ff.includes('micro') || ff.includes('m-atx')) return 2;
    if (ff.includes('mini') || ff.includes('itx')) return 1;
    return 3; // Default to ATX size
  }

  static evaluateScore(selectedProducts: Record<string, Product>): { score: number, text: string } {
    let score = 0;
    const cpu = selectedProducts['cpu'];
    const gpu = selectedProducts['graphics-card'];
    const mobo = selectedProducts['motherboard'];
    const ram = selectedProducts['ram'];

    if (!cpu && !mobo) return { score: 0, text: "Start adding components to get your AI Build Score!" };
    if (!cpu || !mobo) return { score: 2.0, text: "Build is incomplete. Add core components (CPU & Motherboard) for a rating." };
    
    score += 4; 
    if (ram) score += 1.5;
    if (gpu) score += 2;
    if (selectedProducts['storage']) score += 1;
    if (selectedProducts['power-supply']) score += 1.5;
    if (selectedProducts['casing']) score += 0.5;

    const cpuTier = cpu ? this.getTier(cpu.name) : 0;
    const gpuTier = gpu ? this.getTier(gpu.name) : 0;
    
    let text = "";
    if (cpuTier === 3 && gpuTier === 3) {
      score = 9.8;
      text = "Extreme High-End Build! Perfect for 4K Gaming, 3D Rendering, and heavy Video Editing. This is a beast!";
    } else if (cpuTier >= 2 && gpuTier >= 2) {
      score = 8.5;
      text = "Great Mid-to-High Tier Build! Solid for 1440p Gaming, editing, and streaming.";
    } else if (gpu && gpuTier === 1) {
      score = 7.5;
      text = "Balanced Budget Build. Good for 1080p gaming, eSports titles, and normal workloads.";
    } else if (!gpu) {
      score -= 1;
      text = "Office / Basic Build. Missing a dedicated GPU for gaming, but great for everyday tasks.";
    } 
    
    if (cpu && gpu && Math.abs(cpuTier - gpuTier) >= 2) {
      score -= 1.5;
      text = "Bottleneck detected! Either your CPU or GPU is significantly more powerful than the other, which wastes performance.";
    }

    const report = this.evaluate(selectedProducts);
    if (!report.isCompatible) {
      score = 0;
      text = "Incompatible Build! Please fix the red errors to complete this PC.";
    }

    // Cap score at 10
    score = Math.min(10, Math.max(0, score));

    return { score, text };
  }
}
