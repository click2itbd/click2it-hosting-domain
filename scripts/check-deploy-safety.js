import fs from 'fs';
import path from 'path';

const envLocalPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.log('✅ Safe to deploy — DEV_BYPASS is off (.env.local not found)');
  process.exit(0);
}

const content = fs.readFileSync(envLocalPath, 'utf8');
const match = content.match(/^VITE_DEV_BYPASS=(.+)$/m);

if (match && match[1].trim() === 'true') {
  console.error('\n⚠️  VITE_DEV_BYPASS is true — do NOT deploy this build to production.');
  console.error('   The admin panel will be publicly open without authentication.\n');
  process.exit(1);
}

console.log('✅ Safe to deploy — DEV_BYPASS is off');
process.exit(0);
