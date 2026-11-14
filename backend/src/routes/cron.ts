import express, { Request, Response } from 'express';
import { processExpiryReminders } from '../jobs/expiryReminders.js';
import { getAdminAuth, isUserAdmin } from '../firebase/admin.js';

export const cronRouter = express.Router();

function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.EXPRESS_API_KEY || 'click2it_cron_secret';
  
  // 1. Check header X-CRON-KEY or X-API-KEY
  const headerKey = req.headers['x-cron-key'] || req.headers['x-api-key'];
  if (headerKey && (headerKey === cronSecret || headerKey === process.env.EXPRESS_API_KEY)) {
    return true;
  }

  // 2. Check query param: ?key=... or ?secret=...
  const queryKey = req.query.key || req.query.secret;
  if (queryKey && (queryKey === cronSecret || queryKey === process.env.EXPRESS_API_KEY)) {
    return true;
  }

  // 3. Check Authorization header: Bearer <cronSecret>
  const authHeader = (req.headers.authorization || '') as string;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === cronSecret || token === process.env.EXPRESS_API_KEY) {
      return true;
    }
  }

  return false;
}

/**
 * GET/POST /api/cron/status
 * Health check endpoint for external cron ping services
 */
cronRouter.all('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'click2it-cron-worker',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET/POST /api/cron/process-reminders
 * Executes the daily domain and hosting expiry reminders check.
 * 
 * Can be called via cPanel Cron Jobs / curl:
 * curl -s "https://click2it.bd/api/cron/process-reminders?key=YOUR_CRON_SECRET"
 */
cronRouter.all('/process-reminders', async (req: Request, res: Response) => {
  // 1. Check if authorized via Cron secret or API key
  if (isAuthorizedCronRequest(req)) {
    try {
      const startTime = Date.now();
      const stats = await processExpiryReminders();
      const durationMs = Date.now() - startTime;
      return res.json({
        success: true,
        message: 'Expiry reminders processed successfully via cron trigger.',
        durationMs,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[CRON API] process-reminders failed:', error);
      return res.status(500).json({ success: false, error: error.message || 'Cron job execution failed' });
    }
  }

  // 2. Alternatively, allow authenticated Admin to trigger it from dashboard
  const authHeader = (req.headers.authorization || '') as string;
  if (authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.slice(7).trim();
      const adminAuth = getAdminAuth();
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const isAdmin = await isUserAdmin(decoded.uid, decoded.email);
        if (isAdmin) {
          const startTime = Date.now();
          const stats = await processExpiryReminders();
          const durationMs = Date.now() - startTime;
          return res.json({
            success: true,
            message: 'Expiry reminders processed successfully by Admin.',
            durationMs,
            stats,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch {
      // not an admin token, fall through
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Invalid or missing cron key. Pass ?key=YOUR_CRON_SECRET or X-CRON-KEY header.'
  });
});

/**
 * GET/POST /api/cron/backup/daily
 * Daily off-site disaster recovery database backup snapshot
 * 
 * Can be triggered via cPanel cron at midnight:
 * 0 0 * * * curl -s "https://click2it.bd/api/cron/backup/daily?key=YOUR_CRON_SECRET"
 */
cronRouter.all('/backup/daily', async (req: Request, res: Response) => {
  if (isAuthorizedCronRequest(req)) {
    try {
      const { createDatabaseBackup } = await import('../services/backupService.js');
      const result = await createDatabaseBackup('Daily Midnight Cron');
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }
      return res.json({
        success: true,
        message: 'Daily automated database backup snapshot generated successfully.',
        metadata: result.metadata,
      });
    } catch (error: any) {
      console.error('[CRON API] Daily backup failed:', error);
      return res.status(500).json({ success: false, error: error?.message || 'Daily backup failed' });
    }
  }

  const authHeader = (req.headers.authorization || '') as string;
  if (authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.slice(7).trim();
      const adminAuth = getAdminAuth();
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const isAdmin = await isUserAdmin(decoded.uid, decoded.email);
        if (isAdmin) {
          const { createDatabaseBackup } = await import('../services/backupService.js');
          const result = await createDatabaseBackup('Admin Manual Trigger');
          return res.json({
            success: true,
            message: 'Database backup snapshot generated by Admin.',
            metadata: result.metadata,
          });
        }
      }
    } catch {}
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Invalid or missing cron key. Pass ?key=YOUR_CRON_SECRET or X-CRON-KEY header.'
  });
});
