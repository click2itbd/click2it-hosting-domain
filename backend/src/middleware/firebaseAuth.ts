import { Request, Response, NextFunction } from 'express';
import { getAdminDb, getAdminAuth, isUserAdmin } from '../firebase/admin.js';

function decodeDevToken(idToken: string): any {
  try {
    const payload = idToken.split('.')[1];
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

  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      return next();
    }
  } catch (error: any) {
    console.warn('[requireFirebaseAuth] token verification error:', error?.message || error);
  }

  // Fallback to dev JWT decode if present
  const decoded = decodeDevToken(idToken);
  if (decoded?.user_id || decoded?.sub || decoded?.uid) {
    (req as any).user = { uid: decoded.user_id || decoded.sub || decoded.uid, email: decoded.email || '' };
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || (req.headers['http_authorization'] as string) || (req.headers['x-authorization'] as string) || '') as string;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  let uid = '';
  let email = '';
  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      uid = decodedToken.uid;
      email = decodedToken.email || '';
    }
  } catch (error: any) {
    console.warn('[requireAdmin] token verification error:', error?.message || error);
  }

  if (!uid) {
    const decoded = decodeDevToken(idToken);
    if (decoded?.user_id || decoded?.sub || decoded?.uid) {
      (req as any).user = { uid: decoded.user_id || decoded.sub || decoded.uid, email: decoded.email || '' };
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

