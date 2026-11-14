import { apiPost } from '../services/apiClient';

const SESSION_STORAGE_KEY = 'c2i_device_session_id';

export function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id || id.length < 10) {
      id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export function getFriendlyDeviceName(): string {
  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'Apple iOS';
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
 * Registers the current browser device session with the server
 */
export async function registerCurrentSession(): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const device = getFriendlyDeviceName();
    await apiPost('/api/customers/sessions/register', {
      sessionId,
      device,
    });
  } catch (err) {
    // Non-blocking
  }
}
