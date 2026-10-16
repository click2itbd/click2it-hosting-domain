import fs from 'fs';
import path from 'path';

try {
  await import('./dist/server.js');
  fs.writeFileSync(path.join(process.cwd(), 'startup-error.log'), `[${new Date().toISOString()}] Backend started successfully.\n`, { flag: 'a' });
} catch (error) {
  const errMsg = `[${new Date().toISOString()}] Startup Crash Error: ${error?.stack || error?.message || error}\n`;
  console.error(errMsg);
  try {
    fs.writeFileSync(path.join(process.cwd(), 'startup-error.log'), errMsg, { flag: 'a' });
  } catch {}
}
