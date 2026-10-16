import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface VpsCostScale {
  baseVpsPrice: number;
  perCpuCore: number;
  perGbRam: number;
  perGbStorage: number;
  perTbBandwidth: number;
  perIpv4: number;
  osSurcharges: Record<string, number>;
  controlPanelSurcharges: Record<string, number>;
  backupSurcharges: Record<string, number>;
  ddosSurcharges: Record<string, number>;
  locationSurcharges: Record<string, number>;
  supportSurcharges: Record<string, number>;
}

export interface CpanelCostScale {
  baseCpanelPrice: number;
  perGbDisk: number;
  per10GbBandwidth: number;
  perWebsite: number;
  per10Emails: number;
  per5Databases: number;
  litespeedPrice: number;
  cloudlinuxPrice: number;
  imunify360Price: number;
  dedicatedIpPrice: number;
  acronisBackupPrice: number;
}

export interface PackagePricingScales {
  vps: VpsCostScale;
  cpanel: CpanelCostScale;
  discounts: {
    semiAnnualPercent: number;
    annualPercent: number;
    biennialPercent: number;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PRICING_SCALES: PackagePricingScales = {
  vps: {
    baseVpsPrice: 500,
    perCpuCore: 350,
    perGbRam: 180,
    perGbStorage: 15,
    perTbBandwidth: 200,
    perIpv4: 300,
    osSurcharges: {
      ubuntu: 0,
      debian: 0,
      almalinux: 0,
      rocky: 0,
      centos: 0,
      windows2022: 1400,
      windows2019: 1400,
    },
    controlPanelSurcharges: {
      none: 0,
      cpanel_solo: 1750,
      cpanel_admin: 2650,
      cpanel_pro: 3600,
      cpanel_premier: 4800,
      plesk_webadmin: 1100,
      plesk_pro: 1900,
      cyberpanel: 0,
      directadmin: 800,
    },
    backupSurcharges: {
      none: 0,
      weekly: 350,
      daily_cloud: 650,
    },
    ddosSurcharges: {
      standard: 0,
      advanced_1tbps: 450,
      enterprise_3tbps: 1200,
    },
    locationSurcharges: {
      bd_dhaka: 0,
      sg_singapore: 180,
      de_frankfurt: 150,
      us_east: 120,
    },
    supportSurcharges: {
      unmanaged: 0,
      basic: 450,
      managed_vip: 1500,
    },
  },
  cpanel: {
    baseCpanelPrice: 120,
    perGbDisk: 35,
    per10GbBandwidth: 20,
    perWebsite: 30,
    per10Emails: 20,
    per5Databases: 25,
    litespeedPrice: 120,
    cloudlinuxPrice: 180,
    imunify360Price: 220,
    dedicatedIpPrice: 300,
    acronisBackupPrice: 150,
  },
  discounts: {
    semiAnnualPercent: 10,
    annualPercent: 20,
    biennialPercent: 30,
  },
};

export interface VpsCustomSpecs {
  cores: number;
  ramGb: number;
  storageGb: number;
  bandwidthTb: number;
  ips: number;
  os: string;
  controlPanel: string;
  backup: string;
  ddos: string;
  location: string;
  supportLevel: string;
  billingCycle: 'monthly' | 'semi-annually' | 'annually' | 'biennially';
}

export interface CpanelCustomSpecs {
  diskGb: number;
  bandwidthGb: number;
  websites: number;
  emails: number;
  databases: number;
  litespeed: boolean;
  cloudlinux: boolean;
  imunify360: boolean;
  dedicatedIp: boolean;
  acronisBackup: boolean;
  billingCycle: 'monthly' | 'semi-annually' | 'annually' | 'biennially';
}

export interface PriceCalculationResult {
  monthlyRate: number;
  billingCycle: string;
  monthsCount: number;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  breakdown: { item: string; cost: number; desc?: string }[];
}

export function calculateVpsPrice(
  specs: VpsCustomSpecs,
  scales: PackagePricingScales = DEFAULT_PRICING_SCALES
): PriceCalculationResult {
  const vScale = scales.vps || DEFAULT_PRICING_SCALES.vps;
  const breakdown: { item: string; cost: number; desc?: string }[] = [];

  // Base
  const base = Number(vScale.baseVpsPrice) || 0;
  breakdown.push({ item: 'Base KVM Virtualization & Node Overhead', cost: base });

  // CPU
  const cpuCost = (Number(specs.cores) || 1) * (Number(vScale.perCpuCore) || 0);
  breakdown.push({ item: `${specs.cores} vCPU Dedicated Cores`, cost: cpuCost, desc: `৳${vScale.perCpuCore}/core` });

  // RAM
  const ramCost = (Number(specs.ramGb) || 1) * (Number(vScale.perGbRam) || 0);
  breakdown.push({ item: `${specs.ramGb} GB High-Speed DDR4/DDR5 RAM`, cost: ramCost, desc: `৳${vScale.perGbRam}/GB` });

  // Storage
  const storageCost = (Number(specs.storageGb) || 20) * (Number(vScale.perGbStorage) || 0);
  breakdown.push({ item: `${specs.storageGb} GB NVMe PCIe Gen4 Storage`, cost: storageCost, desc: `৳${vScale.perGbStorage}/GB` });

  // Bandwidth
  const bwCost = (Number(specs.bandwidthTb) || 1) * (Number(vScale.perTbBandwidth) || 0);
  breakdown.push({ item: `${specs.bandwidthTb} TB Premium Uplink Traffic`, cost: bwCost, desc: `৳${vScale.perTbBandwidth}/TB` });

  // IPs
  const ipCost = (Number(specs.ips) || 1) * (Number(vScale.perIpv4) || 0);
  breakdown.push({ item: `${specs.ips} Dedicated Static IPv4`, cost: ipCost, desc: `৳${vScale.perIpv4}/IP` });

  // OS
  const osSurcharge = Number(vScale.osSurcharges?.[specs.os] ?? 0);
  if (osSurcharge > 0) {
    breakdown.push({ item: `Operating System: ${specs.os.toUpperCase()} License`, cost: osSurcharge });
  }

  // Control Panel
  const cpSurcharge = Number(vScale.controlPanelSurcharges?.[specs.controlPanel] ?? 0);
  if (cpSurcharge > 0) {
    breakdown.push({ item: `Control Panel: ${specs.controlPanel.replace('_', ' ').toUpperCase()}`, cost: cpSurcharge });
  }

  // Backup
  const backupCost = Number(vScale.backupSurcharges?.[specs.backup] ?? 0);
  if (backupCost > 0) {
    breakdown.push({ item: `Automated Cloud Backup (${specs.backup})`, cost: backupCost });
  }

  // DDoS
  const ddosCost = Number(vScale.ddosSurcharges?.[specs.ddos] ?? 0);
  if (ddosCost > 0) {
    breakdown.push({ item: `Anti-DDoS Shield (${specs.ddos})`, cost: ddosCost });
  }

  // Location
  const locCost = Number(vScale.locationSurcharges?.[specs.location] ?? 0);
  if (locCost > 0) {
    breakdown.push({ item: `Data Center Location (${specs.location})`, cost: locCost });
  }

  // Support
  const supCost = Number(vScale.supportSurcharges?.[specs.supportLevel] ?? 0);
  if (supCost > 0) {
    breakdown.push({ item: `Managed Administration (${specs.supportLevel})`, cost: supCost });
  }

  const monthlyRate = breakdown.reduce((acc, curr) => acc + curr.cost, 0);

  let monthsCount = 1;
  let discountPercent = 0;
  if (specs.billingCycle === 'semi-annually') {
    monthsCount = 6;
    discountPercent = Number(scales.discounts?.semiAnnualPercent) || 10;
  } else if (specs.billingCycle === 'annually') {
    monthsCount = 12;
    discountPercent = Number(scales.discounts?.annualPercent) || 20;
  } else if (specs.billingCycle === 'biennially') {
    monthsCount = 24;
    discountPercent = Number(scales.discounts?.biennialPercent) || 30;
  }

  const subtotal = monthlyRate * monthsCount;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const totalPrice = Math.max(0, subtotal - discountAmount);

  return {
    monthlyRate,
    billingCycle: specs.billingCycle,
    monthsCount,
    discountPercent,
    subtotal,
    discountAmount,
    totalPrice,
    breakdown,
  };
}

export function calculateCpanelPrice(
  specs: CpanelCustomSpecs,
  scales: PackagePricingScales = DEFAULT_PRICING_SCALES
): PriceCalculationResult {
  const cScale = scales.cpanel || DEFAULT_PRICING_SCALES.cpanel;
  const breakdown: { item: string; cost: number; desc?: string }[] = [];

  // Base
  const base = Number(cScale.baseCpanelPrice) || 0;
  breakdown.push({ item: 'Base cPanel Account & WHM Integration', cost: base });

  // Disk Space
  const diskCost = (Number(specs.diskGb) || 1) * (Number(cScale.perGbDisk) || 0);
  breakdown.push({ item: `${specs.diskGb} GB Pure NVMe SSD Storage`, cost: diskCost, desc: `৳${cScale.perGbDisk}/GB` });

  // Bandwidth
  const bwBlocks = Math.ceil((Number(specs.bandwidthGb) || 10) / 10);
  const bwCost = bwBlocks * (Number(cScale.per10GbBandwidth) || 0);
  breakdown.push({ item: `${specs.bandwidthGb} GB Monthly Bandwidth`, cost: bwCost, desc: `৳${cScale.per10GbBandwidth} per 10GB` });

  // Websites / Domains
  const siteCost = (Number(specs.websites) || 1) * (Number(cScale.perWebsite) || 0);
  breakdown.push({ item: `${specs.websites} Hosted Websites / Addon Domains`, cost: siteCost, desc: `৳${cScale.perWebsite}/domain` });

  // Emails
  const emailBlocks = Math.ceil((Number(specs.emails) || 5) / 10);
  const emailCost = emailBlocks * (Number(cScale.per10Emails) || 0);
  breakdown.push({ item: `${specs.emails} Professional Business Email Inboxes`, cost: emailCost, desc: `৳${cScale.per10Emails} per 10 inboxes` });

  // Databases
  const dbBlocks = Math.ceil((Number(specs.databases) || 5) / 5);
  const dbCost = dbBlocks * (Number(cScale.per5Databases) || 0);
  breakdown.push({ item: `${specs.databases} MySQL / MariaDB Databases`, cost: dbCost, desc: `৳${cScale.per5Databases} per 5 DBs` });

  // LiteSpeed
  if (specs.litespeed) {
    breakdown.push({ item: 'LiteSpeed Web Server Enterprise + LSCache Acceleration', cost: Number(cScale.litespeedPrice) || 0 });
  }

  // CloudLinux
  if (specs.cloudlinux) {
    breakdown.push({ item: 'CloudLinux OS Isolated LVE Governor (CPU & RAM Isolation)', cost: Number(cScale.cloudlinuxPrice) || 0 });
  }

  // Imunify360
  if (specs.imunify360) {
    breakdown.push({ item: 'Imunify360 Proactive Security & Real-Time Anti-Malware', cost: Number(cScale.imunify360Price) || 0 });
  }

  // Dedicated IP
  if (specs.dedicatedIp) {
    breakdown.push({ item: 'Dedicated Static IPv4 Address', cost: Number(cScale.dedicatedIpPrice) || 0 });
  }

  // Acronis Backups
  if (specs.acronisBackup) {
    breakdown.push({ item: 'Acronis Cloud Daily Offsite Automated Backups', cost: Number(cScale.acronisBackupPrice) || 0 });
  }

  const monthlyRate = breakdown.reduce((acc, curr) => acc + curr.cost, 0);

  let monthsCount = 1;
  let discountPercent = 0;
  if (specs.billingCycle === 'semi-annually') {
    monthsCount = 6;
    discountPercent = Number(scales.discounts?.semiAnnualPercent) || 10;
  } else if (specs.billingCycle === 'annually') {
    monthsCount = 12;
    discountPercent = Number(scales.discounts?.annualPercent) || 20;
  } else if (specs.billingCycle === 'biennially') {
    monthsCount = 24;
    discountPercent = Number(scales.discounts?.biennialPercent) || 30;
  }

  const subtotal = monthlyRate * monthsCount;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const totalPrice = Math.max(0, subtotal - discountAmount);

  return {
    monthlyRate,
    billingCycle: specs.billingCycle,
    monthsCount,
    discountPercent,
    subtotal,
    discountAmount,
    totalPrice,
    breakdown,
  };
}

export async function loadPricingScales(): Promise<PackagePricingScales> {
  try {
    const snap = await getDoc(doc(db, 'pricing_scales', 'hosting_vps_cost_scale'));
    if (snap.exists()) {
      const data = snap.data() as PackagePricingScales;
      return {
        ...DEFAULT_PRICING_SCALES,
        ...data,
        vps: { ...DEFAULT_PRICING_SCALES.vps, ...(data.vps || {}) },
        cpanel: { ...DEFAULT_PRICING_SCALES.cpanel, ...(data.cpanel || {}) },
        discounts: { ...DEFAULT_PRICING_SCALES.discounts, ...(data.discounts || {}) },
      };
    }
  } catch (err) {
    console.warn('Failed to load pricing scales from Firestore, using default:', err);
  }
  return DEFAULT_PRICING_SCALES;
}

export async function savePricingScales(scales: PackagePricingScales, adminEmail?: string): Promise<boolean> {
  try {
    const payload = {
      ...scales,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail || 'admin',
    };
    await setDoc(doc(db, 'pricing_scales', 'hosting_vps_cost_scale'), payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save pricing scales:', err);
    throw err;
  }
}
