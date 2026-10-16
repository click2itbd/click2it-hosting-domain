import { describe, it, expect } from 'vitest';

function calculateCustomerPriceBdt({
  registerPriceUsd,
  domainMarkupPercent = 0,
  usdToBdtRate = 0,
}: {
  registerPriceUsd: number;
  domainMarkupPercent?: number;
  usdToBdtRate?: number;
}) {
  if (registerPriceUsd < 0) throw new Error('Price cannot be negative');
  if (domainMarkupPercent < 0) throw new Error('Markup cannot be negative');
  if (usdToBdtRate <= 0) throw new Error('Exchange rate must be positive');
  const retailUsd = registerPriceUsd * (1 + domainMarkupPercent / 100);
  return Math.round(retailUsd * usdToBdtRate);
}

describe('Domain Pricing Formula', () => {
  it('10 USD + 15% markup + 121 rate = 1392 BDT', () => {
    expect(calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: 15,
      usdToBdtRate: 121,
    })).toBe(1392);
  });

  it('zero markup returns exact converted price', () => {
    expect(calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: 0,
      usdToBdtRate: 121,
    })).toBe(1210);
  });

  it('decimal exchange rate rounds correctly', () => {
    expect(calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: 10,
      usdToBdtRate: 121.5,
    })).toBe(1337);
  });

  it('decimal registrar quote rounds correctly', () => {
    expect(calculateCustomerPriceBdt({
      registerPriceUsd: 9.99,
      domainMarkupPercent: 15,
      usdToBdtRate: 121,
    })).toBe(1390);
  });

  it('zero price returns zero', () => {
    expect(calculateCustomerPriceBdt({
      registerPriceUsd: 0,
      domainMarkupPercent: 15,
      usdToBdtRate: 121,
    })).toBe(0);
  });

  it('negative price throws', () => {
    expect(() => calculateCustomerPriceBdt({
      registerPriceUsd: -10,
      domainMarkupPercent: 15,
      usdToBdtRate: 121,
    })).toThrow('Price cannot be negative');
  });

  it('negative markup throws', () => {
    expect(() => calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: -5,
      usdToBdtRate: 121,
    })).toThrow('Markup cannot be negative');
  });

  it('zero exchange rate throws', () => {
    expect(() => calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: 15,
      usdToBdtRate: 0,
    })).toThrow('Exchange rate must be positive');
  });

  it('missing configuration uses defaults safely', () => {
    expect(() => calculateCustomerPriceBdt({
      registerPriceUsd: 10,
      domainMarkupPercent: 0,
      usdToBdtRate: 0,
    })).toThrow('Exchange rate must be positive');
  });
});
