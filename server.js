import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  try {
    const { createApp } = await import('./backend/dist/app.js');
    const app = createApp();

    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const rawPort = process.env.PORT;
    const port = rawPort ? (isNaN(Number(rawPort)) ? rawPort : parseInt(rawPort, 10)) : 3000;

    const server = typeof port === 'string'
      ? app.listen(port, () => console.log(`[Click2IT] Server listening on socket ${port}`))
      : app.listen(port, '0.0.0.0', () => console.log(`[Click2IT] Server listening on http://0.0.0.0:${port}`));

    server.on('error', (err) => {
      console.error('[Server Error]', err);
    });

    const shutdown = () => {
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    const errMsg = `[${new Date().toISOString()}] Server Startup Error: ${err?.stack || err}\n`;
    console.error(errMsg);
    try {
      fs.writeFileSync(path.join(process.cwd(), 'startup-error.log'), errMsg, { flag: 'a' });
    } catch {}
  }
}

start();
