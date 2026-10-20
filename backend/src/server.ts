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
const listenTarget: any = isPassenger ? 'passenger' : (process.env.PORT || process.env.BACKEND_PORT || config.port || 4001);

const server = app.listen(listenTarget, () => {
  console.log(`Backend API running ${isPassenger ? "under Phusion Passenger" : `on port ${listenTarget}`}`);
  
  // Initialize Background Jobs
  try {
    setupExpiryReminders();
  } catch (cronErr) {
    console.error('Failed to setup expiry reminders cron:', cronErr);
  }
});

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
