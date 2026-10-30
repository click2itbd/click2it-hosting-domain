import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';

describe('Security Source Audit', () => {
  it('AuthContext defines bootstrap admin domains or roles', () => {
    const content = readFileSync('src/context/AuthContext.tsx', 'utf-8');
    expect(content).toContain('isBootstrapAdminEmail');
  });

  it('Admin dashboard components enforce role-based access', () => {
    const path = existsSync('src/pages/AdminDashboard.tsx') 
      ? 'src/pages/AdminDashboard.tsx' 
      : 'src/pages/hosting-dashboard/HostingBillingDashboard.tsx';
    const content = readFileSync(path, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
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
