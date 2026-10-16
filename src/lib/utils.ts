import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, settings?: any) {
  const code = settings?.currency || 'BDT'; // Could be 'Tk.', '$' etc, we'll try to use it as prefix/suffix if not a valid ISO code
  const isAfter = settings?.currencyPosition === 'After Amount';
  const decimals = settings?.precision === '0 Digit' ? 0 : 2;
  const tSep = settings?.thousandSeparator;
  const dSep = settings?.decimalSeparator;

  // Let's use standard number format for the raw digits
  let formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // Apply custom separators if provided
  if (tSep === 'Comma (,)' && dSep === 'Comma (,)') {
     // Swap . and , which is common in european, but usually it's dot for thousand
     // This is tricky, let's keep it simple: en-US uses dot for decimal, comma for thousand.
  } else if (dSep === 'Comma (,)') {
     formatted = formatted.replace(/\./g, 'DECIMAL_POINT').replace(/,/g, '.').replace(/DECIMAL_POINT/g, ',');
  }
  
  if (isAfter) {
    return `${formatted} ${code}`;
  }
  return `${code} ${formatted}`;
}


export type WarrantyUnit = 'days' | 'months' | 'years';

/** Convert a value+unit to months (the unit stored on products as warrantyMonths). */
export function warrantyToMonths(value: number, unit: WarrantyUnit = 'months'): number {
  const v = Number(value) || 0;
  if (unit === 'years') return v * 12;
  if (unit === 'days') return v / 30;
  return v;
}

/** Convert stored months back to the number shown for a given unit. */
export function monthsToWarrantyValue(months: number, unit: WarrantyUnit = 'months'): number {
  const m = Number(months) || 0;
  if (unit === 'years') return Math.round((m / 12) * 100) / 100;
  if (unit === 'days') return Math.round(m * 30);
  return Math.round(m * 100) / 100;
}

/** Human readable warranty, e.g. "7 Days", "6 Months", "2 Years". */
export function formatWarranty(months?: number, unit?: WarrantyUnit): string {
  if (!months || months <= 0) return '';
  const u: WarrantyUnit = unit || (months < 1 ? 'days' : months % 12 === 0 && months >= 12 ? 'years' : 'months');
  const val = monthsToWarrantyValue(months, u);
  const label = u === 'days' ? 'Day' : u === 'years' ? 'Year' : 'Month';
  return val + ' ' + label + (val === 1 ? '' : 's');
}

/** Add a warranty period (in months, may be fractional) to a date. */
export function addWarranty(date: Date, months: number): Date {
  const d = new Date(date);
  const whole = Math.floor(months);
  d.setMonth(d.getMonth() + whole);
  const extraDays = Math.round((months - whole) * 30);
  if (extraDays) d.setDate(d.getDate() + extraDays);
  return d;
}
