import React from 'react';

export const ColorfulIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'cpu': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#607D8B" />
      <rect x="16" y="16" width="32" height="32" rx="2" fill="#455A64" />
      <circle cx="32" cy="32" r="8" fill="#37474F" />
      {/* Pins */}
      {[...Array(5)].map((_, i) => <rect key={`t-${i}`} x={16 + i * 7} y="4" width="4" height="4" fill="#FFB300" />)}
      {[...Array(5)].map((_, i) => <rect key={`b-${i}`} x={16 + i * 7} y="56" width="4" height="4" fill="#FFB300" />)}
      {[...Array(5)].map((_, i) => <rect key={`l-${i}`} x="4" y={16 + i * 7} width="4" height="4" fill="#FFB300" />)}
      {[...Array(5)].map((_, i) => <rect key={`r-${i}`} x="56" y={16 + i * 7} width="4" height="4" fill="#FFB300" />)}
    </svg>
  ),
  'cpu-cooler': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#E3F2FD" />
      <circle cx="32" cy="32" r="24" fill="#BBDEFB" />
      <circle cx="32" cy="32" r="6" fill="#1976D2" />
      <path d="M32 26 C40 10 50 10 56 20 L32 32 Z" fill="#2196F3" />
      <path d="M32 38 C40 54 50 54 56 44 L32 32 Z" fill="#2196F3" />
      <path d="M32 32 L8 20 C14 10 24 10 32 26 Z" fill="#2196F3" />
      <path d="M32 32 L8 44 C14 54 24 54 32 38 Z" fill="#2196F3" />
    </svg>
  ),
  'motherboard': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="2" fill="#4CAF50" />
      <rect x="16" y="24" width="16" height="16" fill="#388E3C" />
      <rect x="36" y="16" width="12" height="32" fill="#2E7D32" />
      <rect x="12" y="44" width="20" height="6" fill="#1B5E20" />
      <rect x="38" y="18" width="8" height="2" fill="#FFCA28" />
      <rect x="38" y="22" width="8" height="2" fill="#FFCA28" />
      <rect x="38" y="26" width="8" height="2" fill="#FFCA28" />
      <rect x="18" y="12" width="6" height="6" fill="#B0BEC5" />
    </svg>
  ),
  'ram': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="24" width="56" height="16" rx="2" fill="#43A047" />
      <rect x="8" y="28" width="8" height="8" fill="#1B5E20" />
      <rect x="20" y="28" width="8" height="8" fill="#1B5E20" />
      <rect x="36" y="28" width="8" height="8" fill="#1B5E20" />
      <rect x="48" y="28" width="8" height="8" fill="#1B5E20" />
      {[...Array(10)].map((_, i) => <rect key={i} x={6 + i * 5.4} y="40" width="3" height="4" fill="#FFCA28" />)}
    </svg>
  ),
  'storage': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="16" width="40" height="32" rx="4" fill="#78909C" />
      <rect x="16" y="20" width="32" height="24" rx="2" fill="#CFD8DC" />
      <circle cx="32" cy="32" r="8" fill="#90A4AE" />
      <circle cx="32" cy="32" r="3" fill="#ECEFF1" />
      <rect x="12" y="24" width="4" height="16" fill="#FFCA28" />
    </svg>
  ),
  'graphics-card': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="48" height="20" rx="2" fill="#546E7A" />
      <rect x="12" y="20" width="4" height="24" fill="#B0BEC5" />
      <circle cx="44" cy="34" r="7" fill="#37474F" />
      <circle cx="44" cy="34" r="3" fill="#263238" />
      <rect x="16" y="28" width="16" height="12" rx="1" fill="#455A64" />
      <rect x="20" y="44" width="24" height="4" fill="#FFCA28" />
    </svg>
  ),
  'power-supply': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="16" width="40" height="32" rx="2" fill="#37474F" />
      <circle cx="32" cy="32" r="12" fill="#263238" />
      <circle cx="32" cy="32" r="10" stroke="#546E7A" strokeWidth="1" fill="none" />
      <path d="M 32 22 L 32 42 M 22 32 L 42 32" stroke="#546E7A" strokeWidth="2" />
      <rect x="46" y="24" width="10" height="16" fill="#FFCA28" />
    </svg>
  ),
  'casing': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="8" width="24" height="48" rx="2" fill="#263238" />
      <rect x="24" y="12" width="16" height="24" fill="#1A232E" />
      <circle cx="32" cy="48" r="4" fill="#4CAF50" />
      <rect x="24" y="42" width="16" height="2" fill="#37474F" />
      <rect x="24" y="38" width="16" height="2" fill="#37474F" />
    </svg>
  ),
  'monitor': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="48" height="32" rx="2" fill="#37474F" />
      <rect x="12" y="16" width="40" height="24" fill="#64B5F6" />
      <rect x="28" y="44" width="8" height="8" fill="#546E7A" />
      <rect x="20" y="52" width="24" height="4" rx="2" fill="#455A64" />
    </svg>
  ),
  'casing_cooler': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="40" height="40" rx="4" fill="#37474F" />
      <circle cx="32" cy="32" r="16" fill="#263238" />
      <circle cx="32" cy="32" r="6" fill="#546E7A" />
      <path d="M32 20 C36 12 44 12 48 24 L32 32 Z" fill="#90A4AE" />
      <path d="M32 44 C28 52 20 52 16 40 L32 32 Z" fill="#90A4AE" />
      <path d="M44 32 C52 28 52 20 40 16 L32 32 Z" fill="#90A4AE" />
      <path d="M20 32 C12 36 12 44 24 48 L32 32 Z" fill="#90A4AE" />
    </svg>
  ),
  'keyboard': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="48" height="16" rx="2" fill="#CFD8DC" />
      {[...Array(5)].map((_, i) => <rect key={`r1-${i}`} x={12 + i * 8} y="28" width="6" height="4" fill="#90A4AE" />)}
      {[...Array(4)].map((_, i) => <rect key={`r2-${i}`} x={16 + i * 8} y="34" width="6" height="4" fill="#90A4AE" />)}
    </svg>
  ),
  'mouse': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="16" width="16" height="32" rx="8" fill="#37474F" />
      <path d="M24 32 Q32 36 40 32" stroke="#546E7A" strokeWidth="2" fill="none" />
      <rect x="31" y="20" width="2" height="6" rx="1" fill="#4CAF50" />
    </svg>
  ),
  'speaker': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="12" width="24" height="40" rx="2" fill="#455A64" />
      <circle cx="32" cy="24" r="6" fill="#263238" />
      <circle cx="32" cy="40" r="10" fill="#263238" />
      <circle cx="32" cy="40" r="4" fill="#1A232E" />
    </svg>
  ),
  'headphone': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M 16 32 C 16 16 48 16 48 32" stroke="#37474F" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="12" y="32" width="8" height="16" rx="4" fill="#E53935" />
      <rect x="44" y="32" width="8" height="16" rx="4" fill="#E53935" />
    </svg>
  ),
  'wifi': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="40" width="8" height="16" rx="1" fill="#78909C" />
      <path d="M 24 32 C 28 28 36 28 40 32" stroke="#4CAF50" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 20 26 C 26 20 38 20 44 26" stroke="#4CAF50" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 16 20 C 24 12 40 12 48 20" stroke="#4CAF50" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  'ups': ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="24" width="32" height="24" rx="2" fill="#37474F" />
      <rect x="22" y="20" width="6" height="4" fill="#B0BEC5" />
      <rect x="36" y="20" width="6" height="4" fill="#E53935" />
      <path d="M 32 30 L 28 38 L 32 38 L 32 44 L 36 36 L 32 36 Z" fill="#FFCA28" />
    </svg>
  ),
};

export const getColorfulIcon = (id: string, fallback: React.ReactNode) => {
  const IconComponent = ColorfulIcons[id];
  if (IconComponent) {
    return <IconComponent />;
  }
  return fallback;
};
