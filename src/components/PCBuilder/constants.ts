import { LucideIcon, Cpu, Fan, CircuitBoard, Microchip, HardDrive, Monitor, Keyboard, Mouse, Headphones, Wifi, Battery, BatteryCharging, Speaker, CaseLower } from 'lucide-react';

export interface BuilderCategory {
  id: string;
  title?: string;
  name?: string;
  icon: LucideIcon;
  required?: boolean;
  placeholderImage?: string;
}

export const coreCategories: BuilderCategory[] = [
  { id: 'cpu', name: 'Processor (CPU)', icon: Cpu, required: true, placeholderImage: '/images/placeholders/cpu_placeholder.jpg' },
  { id: 'cpu-cooler', name: 'CPU Cooler', icon: Fan, required: false, placeholderImage: '/images/placeholders/cooler_placeholder.jpg' },
  { id: 'motherboard', name: 'Motherboard', icon: CircuitBoard, required: true, placeholderImage: '/images/placeholders/motherboard_placeholder.jpg' },
  { id: 'ram', name: 'Memory (RAM)', icon: Microchip, required: true, placeholderImage: '/images/placeholders/ram_placeholder.jpg' },
  { id: 'storage', name: 'Storage (SSD/HDD)', icon: HardDrive, required: true, placeholderImage: '/images/placeholders/storage_placeholder.jpg' },
  { id: 'graphics-card', name: 'Graphics Card', icon: Monitor, required: false, placeholderImage: '/images/placeholders/gpu_placeholder.jpg' },
  { id: 'power-supply', name: 'Power Supply', icon: Battery, required: true, placeholderImage: '/images/placeholders/psu_placeholder.jpg' },
  { id: 'casing', name: 'Casing', icon: CaseLower, required: true, placeholderImage: '/images/placeholders/casing_placeholder.jpg' },
];

export const peripheralCategories: BuilderCategory[] = [
  { id: 'monitor', name: 'Monitor', icon: Monitor, placeholderImage: '/images/placeholders/monitor_placeholder.jpg' },
  { id: 'casing_cooler', name: 'Casing Cooler', icon: Fan, placeholderImage: '/images/placeholders/cooler_placeholder.jpg' },
  { id: 'keyboard', name: 'Keyboard', icon: Keyboard, placeholderImage: '/images/placeholders/keyboard_placeholder.jpg' },
  { id: 'mouse', name: 'Mouse', icon: Mouse, placeholderImage: '/images/placeholders/mouse_placeholder.jpg' },
  { id: 'speaker', name: 'Speaker', icon: Speaker, placeholderImage: '/images/placeholders/speaker_placeholder.jpg' },
  { id: 'headphone', name: 'Headphone', icon: Headphones, placeholderImage: '/images/placeholders/headphone_placeholder.jpg' },
  { id: 'wifi', name: 'Wifi Adapter', icon: Wifi, placeholderImage: '/images/placeholders/storage_placeholder.jpg' }, // fallback
  { id: 'ups', name: 'UPS', icon: BatteryCharging, placeholderImage: '/images/placeholders/psu_placeholder.jpg' }, // fallback
];
