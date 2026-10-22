import { Request } from 'express';

interface SentryConfig {
  dsn: string;
  publicKey: string;
  host: string;
  projectId: string;
}

let sentryConfig: SentryConfig | null = null;

function parseDsn(dsnStr?: string): SentryConfig | null {
  const dsn = (dsnStr || process.env.SENTRY_DSN || '').trim();
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const projectId = pathParts[0];
    if (publicKey && host && projectId) {
      return { dsn, publicKey, host, projectId };
    }
  } catch {
    console.warn('[Sentry] Invalid SENTRY_DSN format');
  }
  return null;
}

/**
 * Initialize backend Sentry APM configuration from environment variables
 */
export function initSentry(dsn?: string) {
  sentryConfig = parseDsn(dsn);
  if (sentryConfig) {
    console.log(`[Sentry APM] Initialized for project ${sentryConfig.projectId} on ${sentryConfig.host}`);
  }
}

/**
 * Capture backend exceptions and transmit them to Sentry APM
 */
export async function captureBackendException(err: any, req?: Request): Promise<void> {
  if (!sentryConfig) {
    sentryConfig = parseDsn();
  }
  if (!sentryConfig) {
    // SENTRY_DSN not configured, skip silently
    return;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const errorMessage = err?.message || String(err);
    const errorStack = err?.stack || '';

    const payload = {
      event_id: eventId,
      timestamp,
      platform: 'node',
      level: 'error',
      logger: 'express',
      environment: process.env.NODE_ENV || 'production',
      exception: {
        values: [
          {
            type: err?.name || 'Error',
            value: errorMessage,
            stacktrace: {
              frames: (errorStack.split('\n').slice(1) || []).map((line: string) => ({
                function: line.trim(),
                raw: line.trim()
              }))
            }
          }
        ]
      },
      request: req ? {
        url: `${req.protocol}://${req.get('host')}${req.originalUrl || req.url}`,
        method: req.method,
        headers: {
          'user-agent': req.headers['user-agent'] || '',
          'host': req.headers['host'] || '',
        },
        env: {
          REMOTE_ADDR: req.ip || req.socket?.remoteAddress || ''
        }
      } : undefined,
      tags: {
        requestId: (req as any)?.requestId || 'unknown',
        nodeVersion: process.version
      },
      user: (req as any)?.user ? {
        id: (req as any).user.uid,
        email: (req as any).user.email
      } : undefined
    };

    const endpoint = `https://${sentryConfig.host}/api/${sentryConfig.projectId}/store/`;
    const authHeader = `Sentry sentry_version=7, sentry_client=click2it-backend/1.0.0, sentry_key=${sentryConfig.publicKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).catch(() => {
      // Non-blocking catch
    }).finally(() => {
      clearTimeout(timeout);
    });
  } catch {
    // Sentry delivery failure should never crash the app
  }
}
