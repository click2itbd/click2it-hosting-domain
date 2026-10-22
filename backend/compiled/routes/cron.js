import express from 'express';
import { processExpiryReminders } from '../jobs/expiryReminders.js';
import { getAdminAuth, isUserAdmin } from '../firebase/admin.js';
export const cronRouter = express.Router();
function isAuthorizedCronRequest(req) {
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
    const authHeader = (req.headers.authorization || '');
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
cronRouter.all('/status', (req, res) => {
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
cronRouter.all('/process-reminders', async (req, res) => {
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
        }
        catch (error) {
            console.error('[CRON API] process-reminders failed:', error);
            return res.status(500).json({ success: false, error: error.message || 'Cron job execution failed' });
        }
    }
    // 2. Alternatively, allow authenticated Admin to trigger it from dashboard
    const authHeader = (req.headers.authorization || '');
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
        }
        catch {
            // not an admin token, fall through
        }
    }
    return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing cron key. Pass ?key=YOUR_CRON_SECRET or X-CRON-KEY header.'
    });
});
