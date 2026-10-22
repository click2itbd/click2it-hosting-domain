import { Request, Response, NextFunction } from 'express';
import { getAdminDb, getAdminAuth, isUserAdmin } from '../firebase/admin.js';

function decodeDevToken(idToken: string): any {
  // CRITICAL SECURITY ENFORCEMENT:
  // Never decode unverified tokens in production or standard environments.
  // Requires explicit opt-in in local non-production environment.
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

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || (req.headers['http_authorization'] as string) || (req.headers['x-authorization'] as string) || '') as string;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      return next();
    } else {
      console.error('[requireFirebaseAuth] Firebase Admin Auth SDK not initialized.');
    }
  } catch (error: any) {
    console.warn('[requireFirebaseAuth] token verification failed:', error?.message || error);
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_INSECURE_DEV_TOKEN !== 'true') {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
  }

  // Fallback dev JWT decode ONLY when explicitly allowed in development
  const decoded = decodeDevToken(idToken);
  if (decoded?.user_id || decoded?.sub || decoded?.uid) {
    console.warn('[requireFirebaseAuth] WARNING: Insecure dev token bypass used (development only).');
    (req as any).user = { ...decoded, uid: decoded.user_id || decoded.sub || decoded.uid, email: decoded.email || '' };
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

  let uid = '';
  let email = '';
  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      uid = decodedToken.uid;
      email = decodedToken.email || '';
    } else {
      console.error('[requireAdmin] Firebase Admin Auth SDK not initialized.');
    }
  } catch (error: any) {
    console.warn('[requireAdmin] token verification failed:', error?.message || error);
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_INSECURE_DEV_TOKEN !== 'true') {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
  }

  if (!uid) {
    const decoded = decodeDevToken(idToken);
    if (decoded?.user_id || decoded?.sub || decoded?.uid) {
      console.warn('[requireAdmin] WARNING: Insecure dev token bypass used for admin (development only).');
      (req as any).user = { ...decoded, uid: decoded.user_id || decoded.sub || decoded.uid, email: decoded.email || '' };
      uid = decoded.user_id || decoded.sub || decoded.uid;
      email = decoded.email || '';
    }
  }

  if (!uid) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Verifies user role field from users collection via isUserAdmin
  const isAdmin = await isUserAdmin(uid, email).catch(() => false);
  if (isAdmin) {
    return next();
  }

  return res.status(403).json({ error: 'Admin access required' });
}
