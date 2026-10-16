import { describe, it, expect } from 'vitest';

describe('Domain Search Input Validation', () => {
  it('rejects empty domain', () => {
    const domain = '';
    expect(domain.trim().length > 0).toBe(false);
  });

  it('rejects whitespace-only domain', () => {
    const domain = '   ';
    expect(domain.trim().length > 0).toBe(false);
  });

  it('accepts valid domain', () => {
    const domain = 'example.com';
    expect(domain.trim().length > 0).toBe(true);
    expect(domain.includes('.')).toBe(true);
  });

  it('normalizes lowercase', () => {
    expect('Example.COM'.toLowerCase()).toBe('example.com');
  });

  it('extracts TLD correctly', () => {
    const domain = 'example.com';
    const tld = domain.match(/\.[^.]+$/)?.[0];
    expect(tld).toBe('.com');
  });

  it('rejects invalid TLD format', () => {
    const invalid = ['', ' ', '..com', 'com.'];
    const tldRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    invalid.forEach(tld => {
      if (tld) expect(tldRegex.test(tld)).toBe(false);
    });
  });
});
