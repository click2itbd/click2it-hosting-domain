import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Security Source Audit', () => {
  it('AuthContext does not contain hardcoded admin email', () => {
    const content = readFileSync('src/context/AuthContext.tsx', 'utf-8');
    expect(content).not.toContain('click2itbd@gmail.com');
  });

  it('AdminDashboard does not contain hardcoded admin email', () => {
    const content = readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
    expect(content).not.toContain('click2itbd@gmail.com');
  });

  it('firebaseAuth middleware does not rely on hardcoded admin email', () => {
    const content = readFileSync('backend/src/middleware/firebaseAuth.ts', 'utf-8');
    expect(content).not.toContain('click2itbd@gmail.com');
  });

  it('users collection role field is used for admin checks', () => {
    const content = readFileSync('backend/src/middleware/firebaseAuth.ts', 'utf-8');
    expect(content).toContain('role');
    expect(content).not.toContain('email ===');
  });
});
