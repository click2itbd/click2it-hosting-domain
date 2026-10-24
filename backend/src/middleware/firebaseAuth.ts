import { Request, Response, NextFunction } from 'express';
import { getAdminDb, getAdminAuth, isUserAdmin } from '../firebase/admin.js';

function decodeDevToken(idToken: string): any {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_INSECURE_DEV_TOKEN !== 'true') {
    return null;
  }
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Robust, universal Firebase ID Token verification
 * 1. Checks Firebase Admin SDK verifyIdToken
 * 2. Falls back to Google's official public tokeninfo endpoint (works in any server environment)
 */
export async function verifyFirebaseTokenSecurely(idToken: string): Promise<any | null> {
  // 1. Try Firebase Admin Auth SDK
  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (decoded?.uid) {
        return decoded;
      }
    }
  } catch (sdkErr: any) {
    console.warn('[verifyToken] Admin SDK verification warning:', sdkErr?.message || sdkErr);
  }

  // 2. Google's official public tokeninfo endpoint (cryptographically validates Google-issued ID token)
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (googleRes.ok) {
      const tokenInfo: any = await googleRes.json();
      const nowSec = Math.floor(Date.now() / 1000);
      const exp = parseInt(tokenInfo.exp, 10);
      
      // Ensure token is not expired and has user id
      if (exp && exp > nowSec && (tokenInfo.user_id || tokenInfo.sub)) {
        return {
          ...tokenInfo,
          uid: tokenInfo.user_id || tokenInfo.sub,
          email: tokenInfo.email || '',
        };
      }
    } else {
      const errText = await googleRes.text().catch(() => '');
      console.warn('[verifyToken] Google tokeninfo response not ok:', googleRes.status, errText);
    }
  } catch (netErr: any) {
    console.error('[verifyToken] Google tokeninfo lookup failed:', netErr?.message || netErr);
  }

  // 3. Fallback dev JWT decode ONLY when explicitly allowed in development
  const decoded = decodeDevToken(idToken);
  if (decoded?.user_id || decoded?.sub || decoded?.uid) {
    console.warn('[verifyToken] Insecure dev token bypass used (development only).');
    return {
      ...decoded,
      uid: decoded.user_id || decoded.sub || decoded.uid,
      email: decoded.email || '',
    };
  }

  return null;
}

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || (req.headers['http_authorization'] as string) || (req.headers['x-authorization'] as string) || '') as string;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const verifiedUser = await verifyFirebaseTokenSecurely(idToken);
  if (verifiedUser && verifiedUser.uid) {
    (req as any).user = verifiedUser;
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || (req.headers['http_authorization'] as string) || (req.headers['x-authorization'] as string) || '') as string;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const verifiedUser = await verifyFirebaseTokenSecurely(idToken);
  if (!verifiedUser || !verifiedUser.uid) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  (req as any).user = verifiedUser;
  const uid = verifiedUser.uid;
  const email = verifiedUser.email || '';

  // Verifies user role field from users collection via isUserAdmin
  const isAdmin = await isUserAdmin(uid, email, verifiedUser).catch(() => false);
  if (isAdmin) {
    return next();
  }

  return res.status(403).json({ error: 'Admin access required' });
}
