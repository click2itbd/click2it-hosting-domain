import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');
const cpanelDir = path.join(process.cwd(), 'cpanel_build');

// 1. Create unhashed aliases inside dist/assets so .htaccess fallback rules work seamlessly
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  for (const file of files) {
    // Match <name>-<hash>.js or <name>-<hash>.css
    const match = file.match(/^([A-Za-z0-9_.-]+)-[A-Za-z0-9_-]{8}\.(js|css)$/);
    if (match) {
      const baseName = `${match[1]}.${match[2]}`;
      const srcPath = path.join(assetsDir, file);
      const destPath = path.join(assetsDir, baseName);
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch {
        // ignore copy warning
      }
    }
  }
}

// 2. Mirror dist to cpanel_build
fs.rmSync(cpanelDir, { recursive: true, force: true });
fs.cpSync(distDir, cpanelDir, { recursive: true });
console.log('✅ Synced dist/ -> cpanel_build/ with unhashed asset fallbacks.');
