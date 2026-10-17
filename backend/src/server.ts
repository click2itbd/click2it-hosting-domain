import 'dotenv/config';
import './services/networkDns.js';
import { createApp } from './app.js';
import { config, validateEnvironment } from './config/index.js';
import { setupExpiryReminders } from './jobs/expiryReminders.js';

validateEnvironment();

const app = createApp();

const rawPort = process.env.BACKEND_PORT || process.env.PORT;
const PORT = (rawPort && rawPort !== '8080' && rawPort !== '3000') 
  ? rawPort 
  : (config.port || 4001);

const server = app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
  
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
    console.error(`[Server Error] Port ${PORT} is already in use by another process.`);
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
