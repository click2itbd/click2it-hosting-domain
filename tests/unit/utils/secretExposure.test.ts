import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');

describe('Frontend Source Secret Scan', () => {
  const frontendFiles = [
    'src',
    'index.html',
    'vite.config.ts',
  ];

  const secretPatterns = [
    { pattern: /GEMINI_API_KEY/i, name: 'GEMINI_API_KEY' },
    { pattern: /VITE_GEMINI_API_KEY/i, name: 'VITE_GEMINI_API_KEY' },
    { pattern: /OPENPROVIDER_PASSWORD/i, name: 'OPENPROVIDER_PASSWORD' },
    { pattern: /openproviderPassword/i, name: 'openproviderPassword' },
    { pattern: /WHM_API_TOKEN/i, name: 'WHM_API_TOKEN' },
    { pattern: /hostingApiKey/i, name: 'hostingApiKey' },
    { pattern: /SMTP_PASSWORD/i, name: 'SMTP_PASSWORD' },
    { pattern: /SMTP_USER/i, name: 'SMTP_USER' },
    { pattern: /RESEND_API_KEY/i, name: 'RESEND_API_KEY' },
    { pattern: /bkashAppKey/i, name: 'bkashAppKey' },
    { pattern: /bkashAppSecret/i, name: 'bkashAppSecret' },
    { pattern: /client_secret/i, name: 'client_secret' },
    { pattern: /process\.env\.(GEMINI|OPENPROVIDER|WHM|SMTP|RESEND|BKASH)/i, name: 'process.env secret' },
    { pattern: /import.*GoogleGenAI/i, name: 'GoogleGenAI import' },
  ];

  function scanDirectory(dir: string, files: string[]): string[] {
    let matches: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      if (entry.isDirectory()) {
        matches = matches.concat(scanDirectory(fullPath, files));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html'].includes(ext) || entry.name === '.env') {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const { pattern, name } of secretPatterns) {
            if (pattern.test(content)) {
              const relativePath = path.relative(projectRoot, fullPath);
              matches.push(`${name} found in ${relativePath}`);
            }
          }
        }
      }
    }
    return matches;
  }

  it('frontend source must not contain secret environment variables', () => {
    const srcDir = path.join(projectRoot, 'src');
    const matches = scanDirectory(srcDir, []);
    const allowedFiles = [
      'Settings.tsx',
      'types.ts',
    ];
    const filtered = matches.filter(m => {
      const filePart = m.split(' in ')[1] || '';
      return !allowedFiles.some(f => filePart.endsWith(f));
    });
    expect(filtered).toEqual([]);
  });

  it('vite.config.ts must not expose GEMINI_API_KEY via define', () => {
    const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
    const content = fs.readFileSync(viteConfigPath, 'utf-8');
    expect(content).not.toMatch(/define.*GEMINI_API_KEY/i);
    expect(content).not.toMatch(/process\.env\.GEMINI_API_KEY/i);
  });

  it('frontend must not import GoogleGenAI directly', () => {
    const srcDir = path.join(projectRoot, 'src');
    const matches = scanDirectory(srcDir, []);
    const googleGenAIImports = matches.filter(m => m.includes('GoogleGenAI import'));
    expect(googleGenAIImports).toEqual([]);
  });
});

describe('Server Source Secret Scan', () => {
  const secretPatterns = [
    { pattern: /console\.log\([^)]*\bapiKey\b[^)]*\)/i, name: 'console.log with apiKey' },
    { pattern: /console\.error\([^)]*\bapiKey\b[^)]*\)/i, name: 'console.error with apiKey' },
    { pattern: /console\.log\([^)]*\bapiData\b[^)]*\)/i, name: 'console.log with apiData' },
    { pattern: /console\.error\([^)]*\bapiData\b[^)]*\)/i, name: 'console.error with apiData' },
    { pattern: /console\.log\([^)]*\brawText\b[^)]*\)/i, name: 'console.log with rawText' },
    { pattern: /console\.error\([^)]*\brawText\b[^)]*\)/i, name: 'console.error with rawText' },
    { pattern: /console\.log\([^)]*\baccessToken\b[^)]*\)/i, name: 'console.log with accessToken' },
    { pattern: /console\.error\([^)]*\baccessToken\b[^)]*\)/i, name: 'console.error with accessToken' },
    { pattern: /console\.log\([^)]*\bid_token\b[^)]*\)/i, name: 'console.log with id_token' },
    { pattern: /console\.error\([^)]*\bid_token\b[^)]*\)/i, name: 'console.error with id_token' },
  ];

  it('server source must not log raw tokens or secrets', () => {
    const serverFiles = ['backend/src', 'functions'];
    let matches: string[] = [];
    for (const file of serverFiles) {
      const fullPath = path.join(projectRoot, file);
      if (!fs.existsSync(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(fullPath, entry.name);
          if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
            const lines = fs.readFileSync(entryPath, 'utf-8').split('\n');
            for (const line of lines) {
              for (const { pattern, name } of secretPatterns) {
                if (pattern.test(line)) {
                  matches.push(`${name} found in ${path.relative(projectRoot, entryPath)}`);
                }
              }
            }
          }
        }
      } else if (stat.isFile() && /\.(ts|js)$/.test(file)) {
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        for (const line of lines) {
          for (const { pattern, name } of secretPatterns) {
            if (pattern.test(line)) {
              matches.push(`${name} found in ${file}`);
            }
          }
        }
      }
    }
    const safeLogs = [
      'Token configured: yes, length:',
      'WHM_API_TOKEN_EXISTS',
    ];
    const filtered = matches.filter(m => !safeLogs.some(safe => m.includes(safe)));
    expect(filtered).toEqual([]);
  });
});

describe('.env Security', () => {
  it('.env.example must not contain real secrets', () => {
    const envExamplePath = path.join(projectRoot, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      expect(content).not.toMatch(/^RESEND_API_KEY=(re_|)[A-Za-z0-9]{20,}$/m);
      expect(content).not.toMatch(/^WHM_API_TOKEN=[A-Za-z0-9]{20,}$/m);
      expect(content).not.toMatch(/^GEMINI_API_KEY=[A-Za-z0-9._\-]{20,}$/m);
      expect(content).not.toMatch(/^OPENPROVIDER_PASSWORD=[A-Za-z0-9]{20,}$/m);
      expect(content).not.toMatch(/^SMTP_PASSWORD=.{8,}$/m);
    }
  });

  it('.env.production.example must not contain real secrets', () => {
    const envProdPath = path.join(projectRoot, '.env.production.example');
    if (fs.existsSync(envProdPath)) {
      const content = fs.readFileSync(envProdPath, 'utf-8');
      expect(content).not.toMatch(/^RESEND_API_KEY=(re_|)[A-Za-z0-9]{20,}$/m);
      expect(content).not.toMatch(/^GEMINI_API_KEY=(?!your_)[A-Za-z0-9._\-]{20,}$/m);
      expect(content).not.toMatch(/^WHATSAPP_ACCESS_TOKEN=(?!your_)[A-Za-z0-9]{20,}$/m);
    }
  });
});

describe('Admin API Sanitization', () => {
  it('admin api-config response must not contain partial secrets', () => {
    const adminRoutePath = path.join(projectRoot, 'backend/src/routes/admin.ts');
    const content = fs.readFileSync(adminRoutePath, 'utf-8');
    expect(content).not.toMatch(/••••••••••••••••/);
    expect(content).not.toMatch(/slice\(-4\)/);
  });

  it('Firebase adminApiConfig must not return partial secrets', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).not.toMatch(/••••••••••••••••/);
    expect(content).not.toMatch(/slice\(-4\)/);
  });
});

describe('Console Logging Security', () => {
  it('manageDomain must not log received data or context', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).not.toMatch(/RECEIVED DATA.*data/i);
    expect(content).not.toMatch(/RECEIVED CONTEXT.*context/i);
  });

  it('bKash functions must not log raw API responses', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).not.toMatch(/console\.(error|log)\([^,]*apiData[^)]*\)/i);
    expect(content).not.toMatch(/console\.(error|log)\([^,]*rawText[^)]*\)/i);
  });
});

describe('Phase 2 Critical Code Repair', () => {
  it('OpenproviderDomainProvider.ts must exist and implement IDomainProvider', () => {
    const providerPath = path.join(projectRoot, 'backend/src/providers/domain/OpenproviderDomainProvider.ts');
    expect(fs.existsSync(providerPath)).toBe(true);
    const content = fs.readFileSync(providerPath, 'utf-8');
    expect(content).toMatch(/class OpenproviderDomainProvider implements IDomainProvider/);
    expect(content).toMatch(/checkAvailability/);
    expect(content).toMatch(/getSuggestions/);
    expect(content).toMatch(/registerDomain/);
    expect(content).toMatch(/renewDomain/);
    expect(content).toMatch(/getWhois/);
  });

  it('sendWelcomeEmail Firebase function must exist', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toMatch(/exports\.sendWelcomeEmail = functions\.https\.onCall/);
  });

  it('functions/index.js must not contain duplicate bKash function definitions', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    const matches = content.match(/async function getBkashCredentials\(db\)/g);
    expect(matches).toHaveLength(1);
    const tokenMatches = content.match(/async function getBkashAccessToken\(db\)/g);
    expect(tokenMatches).toHaveLength(1);
    const baseUrlMatches = content.match(/function getBkashBaseUrl\(isSandbox\)/g);
    expect(baseUrlMatches).toHaveLength(1);
  });

  it('paymentWebhook must not delete orders on failure', () => {
    const functionsPath = path.join(projectRoot, 'functions/index.js');
    const content = fs.readFileSync(functionsPath, 'utf-8');
    const webhookSection = content.substring(content.indexOf('exports.paymentWebhook'), content.indexOf('exports.openproviderSearchProxy'));
    expect(webhookSection).not.toMatch(/targetRef\.delete\(\)/);
    expect(webhookSection).not.toMatch(/collection\("orders"\)\.doc\(orderId\)\.delete\(\)/);
    expect(webhookSection).toMatch(/provisioningStatus: 'cancelled'/);
  });

  it('providerFactory must use OpenproviderDomainProvider', () => {
    const factoryPath = path.join(projectRoot, 'backend/src/providers/providerFactory.ts');
    const content = fs.readFileSync(factoryPath, 'utf-8');
    expect(content).toMatch(/import\s+\{?\s*OpenproviderDomainProvider\s*\}?\s*from\s*['"]\.\/domain\/OpenproviderDomainProvider(?:\.js)?['"]/);
    expect(content).toMatch(/new\s+OpenproviderDomainProvider\(/);
  });
});
