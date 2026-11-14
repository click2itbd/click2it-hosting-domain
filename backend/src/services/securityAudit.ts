import { getAdminDb } from '../firebase/admin.js';
import { sendEmail, EmailTemplates } from './email.js';

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

    // Fetch user details for security notifications and device tracking
    let targetEmail = metadata?.customerEmail || metadata?.email || '';
    let customerName = metadata?.customerName || '';
    let prevDevice = '';
    let prevIp = '';
    let hasPreviousLogin = false;

    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const uData = userSnap.data() || {};
        targetEmail = targetEmail || uData.email || '';
        customerName = customerName || uData.displayName || uData.name || '';
        prevDevice = uData.lastLoginDevice || '';
        prevIp = uData.lastLoginIp || '';
        hasPreviousLogin = !!uData.lastLoginAt;
      }
    } catch (uErr) {
      console.warn('[SecurityAudit] User profile fetch warning:', uErr);
    }

    // 1. Handle Login actions and detect new device / IP
    if (action === 'LOGIN' || action === 'SSO_LOGIN') {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          lastLoginAt: now,
          lastLoginIp: finalIp,
          lastLoginDevice: finalDevice,
          updatedAt: now,
        }, { merge: true });

        // Trigger alert email if logging in from a newly detected device or different IP
        const isNewDeviceOrIp = hasPreviousLogin && (
          (prevDevice && prevDevice !== finalDevice) ||
          (prevIp && prevIp !== finalIp && finalIp !== '127.0.0.1')
        );

        if (isNewDeviceOrIp && targetEmail) {
          const alert = EmailTemplates.securityAlert({
            customerEmail: targetEmail,
            customerName,
            alertType: 'NEW_LOGIN',
            title: 'New Device / Location Login Detected',
            description: `We detected a successful sign-in to your Click2IT account from a new device (${finalDevice}) or IP address (${finalIp}).`,
            device: finalDevice,
            ipAddress: finalIp,
            timestamp: now,
            details: details || 'New web session initiated',
          });

          sendEmail({
            to: targetEmail,
            customerEmail: targetEmail,
            subject: alert.subject,
            html: alert.html,
            category: 'system',
            type: 'security_alert_new_login',
          }).catch(err => console.warn('[SecurityAudit] Alert email warning:', err?.message || err));
        }
      } catch (uErr) {
        console.warn('[SecurityAudit] User profile lastLogin update warning:', uErr);
      }
    }

    // 2. Handle Password Change event alert
    if (action === 'PASSWORD_CHANGE' && targetEmail) {
      try {
        const alert = EmailTemplates.securityAlert({
          customerEmail: targetEmail,
          customerName,
          alertType: 'PASSWORD_CHANGE',
          title: 'Account Password Changed',
          description: 'The password for your Click2IT account was just updated.',
          device: finalDevice,
          ipAddress: finalIp,
          timestamp: now,
          details: details || 'Your account password was updated successfully.',
        });

        sendEmail({
          to: targetEmail,
          customerEmail: targetEmail,
          subject: alert.subject,
          html: alert.html,
          category: 'system',
          type: 'security_alert_password_change',
        }).catch(err => console.warn('[SecurityAudit] Password alert email warning:', err?.message || err));
      } catch (pErr) {
        console.warn('[SecurityAudit] Password change alert error:', pErr);
      }
    }

    // 3. Handle Profile / Phone Number update alert
    if (action === 'PROFILE_UPDATE' && targetEmail) {
      try {
        const alert = EmailTemplates.securityAlert({
          customerEmail: targetEmail,
          customerName,
          alertType: 'PROFILE_UPDATE',
          title: 'Account Profile / Contact Details Updated',
          description: 'Your account profile contact details or personal information was modified.',
          device: finalDevice,
          ipAddress: finalIp,
          timestamp: now,
          details: details || 'Profile details updated.',
        });

        sendEmail({
          to: targetEmail,
          customerEmail: targetEmail,
          subject: alert.subject,
          html: alert.html,
          category: 'system',
          type: 'security_alert_profile_update',
        }).catch(err => console.warn('[SecurityAudit] Profile update alert email warning:', err?.message || err));
      } catch (prErr) {
        console.warn('[SecurityAudit] Profile update alert error:', prErr);
      }
    }

    // 4. Handle Domain Nameserver / DNS change alert
    if (action === 'NAMESERVER_CHANGE' && targetEmail) {
      try {
        const domainName = metadata?.domain || 'Your Domain';
        const alert = EmailTemplates.securityAlert({
          customerEmail: targetEmail,
          customerName,
          alertType: 'NAMESERVER_CHANGE',
          title: `Domain Nameservers Updated (${domainName})`,
          description: `The authoritative nameserver records for your domain "${domainName}" were updated.`,
          device: finalDevice,
          ipAddress: finalIp,
          timestamp: now,
          details: details || `Nameserver configuration changed.`,
        });

        sendEmail({
          to: targetEmail,
          customerEmail: targetEmail,
          subject: alert.subject,
          html: alert.html,
          category: 'system',
          type: 'security_alert_nameserver_change',
        }).catch(err => console.warn('[SecurityAudit] Nameserver alert email warning:', err?.message || err));
      } catch (nsErr) {
        console.warn('[SecurityAudit] Nameserver change alert error:', nsErr);
      }
    }
  } catch (error: any) {
    console.error('[SecurityAudit] Error recording security log:', error?.message || error);
  }
}
