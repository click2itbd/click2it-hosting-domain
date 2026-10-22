import { getAdminDb } from '../firebase/admin.js';

export interface SecurityLogParams {
  userId: string;
  action: 'LOGIN' | 'NAMESERVER_CHANGE' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_CHANGE' | 'PROFILE_UPDATE' | 'SSO_LOGIN';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  metadata?: Record<string, any>;
}

/**
 * Parses user agent string to extract human-friendly device & browser info
 */
export function parseDeviceFromUserAgent(ua?: string): string {
  if (!ua) return 'Unknown Device';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return `${os} • ${browser}`;
}

/**
 * Extracts and cleans IP address from request headers or socket
 */
export function extractClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    const first = forwarded.split(',')[0].trim();
    return cleanIp(first);
  }
  if (req.headers?.['x-real-ip']) {
    return cleanIp(String(req.headers['x-real-ip']).trim());
  }
  return cleanIp(req.ip || req.socket?.remoteAddress || '127.0.0.1');
}

function cleanIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  if (ip === '::1') {
    return '127.0.0.1';
  }
  return ip;
}

/**
 * Records a security audit event in `user_security_logs` collection
 * and updates user document with recent login details.
 */
export async function recordSecurityLog(params: SecurityLogParams): Promise<void> {
  try {
    const { userId, action, details, ipAddress, userAgent, device, metadata } = params;
    if (!userId) return;

    const db = getAdminDb();
    const now = new Date().toISOString();
    const finalDevice = device || parseDeviceFromUserAgent(userAgent);
    const finalIp = ipAddress ? cleanIp(ipAddress) : '127.0.0.1';

    const logRef = db.collection('user_security_logs').doc();
    await logRef.set({
      id: logRef.id,
      userId,
      action,
      details,
      ipAddress: finalIp,
      device: finalDevice,
      userAgent: userAgent || '',
      metadata: metadata || {},
      timestamp: now,
      createdAt: now,
    });

    // If it's a login action, update lastLogin on the user profile
    if (action === 'LOGIN' || action === 'SSO_LOGIN') {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          lastLoginAt: now,
          lastLoginIp: finalIp,
          lastLoginDevice: finalDevice,
          updatedAt: now,
        }, { merge: true });
      } catch (uErr) {
        console.warn('[SecurityAudit] User profile lastLogin update warning:', uErr);
      }
    }
  } catch (error: any) {
    console.error('[SecurityAudit] Error recording security log:', error?.message || error);
  }
}
