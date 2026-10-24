import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  if (fs.existsSync(path.join(__dirname, 'compiled', 'server.js'))) {
    await import('./compiled/server.js');
  } else if (fs.existsSync(path.join(__dirname, 'dist', 'server.js'))) {
    await import('./dist/server.js');
  } else {
    throw new Error(`Server entry point not found in ${__dirname}/compiled or ${__dirname}/dist`);
  }
  fs.writeFileSync(path.join(__dirname, 'startup-error.log'), `[${new Date().toISOString()}] Backend started successfully.\n`, { flag: 'a' });
} catch (error) {
  const errMsg = `[${new Date().toISOString()}] Startup Crash Error: ${error?.stack || error?.message || error}\n`;
  console.error(errMsg);
  try {
    fs.writeFileSync(path.join(__dirname, 'startup-error.log'), errMsg, { flag: 'a' });
  } catch {}
}
