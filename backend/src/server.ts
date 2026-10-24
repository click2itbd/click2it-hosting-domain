import 'dotenv/config';
import './services/networkDns.js';
import { createApp } from './app.js';
import { config, validateEnvironment } from './config/index.js';
import { setupExpiryReminders } from './jobs/expiryReminders.js';

declare const PhusionPassenger: any;

if (typeof PhusionPassenger !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

validateEnvironment();

const app = createApp();

const isPassenger = typeof (globalThis as any).PhusionPassenger !== 'undefined' || process.env.PORT === 'passenger';
const tcpPort = parseInt(process.env.BACKEND_PORT || (process.env.PORT !== 'passenger' ? (process.env.PORT || '') : '') || String(config.port || 4001), 10) || 4001;

let server: any;

if (isPassenger) {
  // Bind to Phusion Passenger socket
  server = app.listen('passenger', () => {
    console.log('Backend API running under Phusion Passenger');
    
    // Initialize Background Jobs
    try {
      setupExpiryReminders();
    } catch (cronErr) {
      console.error('Failed to setup expiry reminders cron:', cronErr);
    }
  });

  // ALSO bind to TCP port 4001 on localhost so Apache/LiteSpeed .htaccess mod_proxy can forward to it!
  try {
    const tcpServer = app.listen(tcpPort, '127.0.0.1', () => {
      console.log(`Backend API also listening on http://127.0.0.1:${tcpPort} for reverse proxy`);
    });
    tcpServer.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        console.log(`[TCP Server] Port ${tcpPort} is already bound, reusing existing socket.`);
      } else {
        console.error(`[TCP Server Error] ${err?.message || err}`);
      }
    });
  } catch (err: any) {
    console.warn(`[TCP Server] Could not bind port ${tcpPort}:`, err?.message || err);
  }
} else {
  // Standalone mode (PM2 / Node / Dev)
  server = app.listen(tcpPort, () => {
    console.log(`Backend API running on port ${tcpPort}`);
    
    // Initialize Background Jobs
    try {
      setupExpiryReminders();
    } catch (cronErr) {
      console.error('Failed to setup expiry reminders cron:', cronErr);
    }
  });
}

server.on('error', (err: any) => {
  console.error(`[Server Error] ${err?.message || err}`);
  if (err?.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port or socket is already in use by another process.`);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Backend server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Backend server closed');
    process.exit(0);
  });
});

export default app;
