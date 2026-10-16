import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuthSdk } from 'firebase-admin/auth';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let adminDb: any = null;
let adminAuth: any = null;
let clientAdapterDb: any = null;
let initializationFailed = false;

export function validateServiceAccountStructure(serviceAccount: any): void {
  if (!serviceAccount || typeof serviceAccount !== 'object') {
    throw new Error('Invalid Firebase service account key format.');
  }

  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
    'auth_provider_x509_cert_url',
    'client_x509_cert_url',
  ];

  for (const field of requiredFields) {
    if (!(field in serviceAccount) || typeof serviceAccount[field] !== 'string' || serviceAccount[field].trim() === '') {
      throw new Error('Invalid Firebase service account key format.');
    }
  }

  if (serviceAccount.type !== 'service_account') {
    throw new Error('Invalid Firebase service account key format.');
  }

  if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') || !serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid Firebase service account key format.');
  }
}

function getFirebaseClientConfig(): any {
  const candidatePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(__dirname, '..', '..', 'firebase-applet-config.json'),
    path.resolve(__dirname, '..', '..', '..', 'firebase-applet-config.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        console.warn('[Firebase] Error reading config from', p, err);
      }
    }
  }

  return {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0990631330',
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277'
  };
}

function wrapDocSnapshot(snap: any) {
  const exists = typeof snap.exists === 'function' ? snap.exists() : Boolean(snap.exists);
  const data = exists ? snap.data() : undefined;
  return {
    id: snap.id,
    exists,
    data: () => data,
    get: (field: string) => data?.[field],
    ref: wrapDocRef(snap.ref)
  };
}

function wrapDocRef(rawRef: any) {
  return {
    id: rawRef.id,
    path: rawRef.path,
    _webDocRef: rawRef,
    get: async () => wrapDocSnapshot(await getDoc(rawRef)),
    set: async (data: any, opts?: any) => setDoc(rawRef, data, opts || {}),
    update: async (data: any) => updateDoc(rawRef, data),
    delete: async () => deleteDoc(rawRef)
  };
}

class QueryAdapter {
  protected ref: any;
  protected constraints: any[];

  constructor(ref: any, constraints: any[] = []) {
    this.ref = ref;
    this.constraints = constraints;
  }

  where(field: string, op: any, val: any) {
    return new QueryAdapter(this.ref, [...this.constraints, where(field, op, val)]);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new QueryAdapter(this.ref, [...this.constraints, orderBy(field, dir)]);
  }

  limit(n: number) {
    return new QueryAdapter(this.ref, [...this.constraints, limit(n)]);
  }

  async get() {
    const q = query(this.ref, ...this.constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(wrapDocSnapshot);
    return {
      empty: snap.empty,
      size: snap.size,
      docs,
      forEach: (cb: (doc: any) => void) => docs.forEach(cb)
    };
  }
}

class CollectionAdapter extends QueryAdapter {
  private name: string;
  private webDb: any;

  constructor(name: string, webDb: any) {
    const colRef = collection(webDb, name);
    super(colRef, []);
    this.name = name;
    this.webDb = webDb;
  }

  doc(id?: string) {
    const dRef = id ? doc(this.webDb, this.name, id) : doc(collection(this.webDb, this.name));
    return wrapDocRef(dRef);
  }
}

function createClientFirestoreAdapter() {
  const config = getFirebaseClientConfig();
  const clientApp = getClientApps().length > 0 
    ? getClientApps()[0] 
    : initClientApp(config, 'backend-client-adapter');
  
  const webDb = initializeFirestore(clientApp, {}, config.firestoreDatabaseId || 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  return {
    collection: (name: string) => new CollectionAdapter(name, webDb),
    batch: () => {
      const batch = writeBatch(webDb);
      const unwrap = (target: any) => target?._webDocRef || target?.ref?._webDocRef || target?.ref || target;
      return {
        set: (target: any, data: any, opts?: any) => batch.set(unwrap(target), data, opts || {}),
        update: (target: any, data: any) => batch.update(unwrap(target), data),
        delete: (target: any) => batch.delete(unwrap(target)),
        commit: () => batch.commit()
      };
    }
  };
}

export function getAdminDb(): any {
  // Check if a service account was provided and validated
  if (!adminDb && !clientAdapterDb) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
    let serviceAccount: any = null;

    if (serviceAccountKey) {
      if (serviceAccountKey.endsWith('.json') || serviceAccountKey.startsWith('.') || serviceAccountKey.includes('/') || serviceAccountKey.includes('\\')) {
        const candidatePaths = [
          path.isAbsolute(serviceAccountKey) ? serviceAccountKey : path.resolve(process.cwd(), serviceAccountKey),
          path.resolve(__dirname, '..', '..', serviceAccountKey),
          path.resolve(__dirname, '..', '..', '..', serviceAccountKey),
        ];
        const foundPath = candidatePaths.find(p => fs.existsSync(p));
        if (foundPath) {
          try {
            const fileContent = fs.readFileSync(foundPath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
            validateServiceAccountStructure(serviceAccount);
          } catch (err) {
            console.warn('[Firebase Admin] Could not parse service account file:', err);
            serviceAccount = null;
          }
        }
      } else {
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
          validateServiceAccountStructure(serviceAccount);
        } catch {
          serviceAccount = null;
        }
      }
    }

    if (serviceAccount) {
      try {
        let app = getAdminApps()[0];
        if (!app) {
          app = initAdminApp({ credential: cert(serviceAccount) });
        }
        const dbId = process.env.FIREBASE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277';
        adminDb = getAdminFirestore(app, dbId);
        return adminDb;
      } catch (err) {
        console.warn('[Firebase Admin] Falling back to Web SDK adapter:', err);
      }
    }

    // Fallback: Initialize Firestore Client SDK adapter (100% full read/write via client config)
    try {
      clientAdapterDb = createClientFirestoreAdapter();
      return clientAdapterDb;
    } catch (adapterErr) {
      console.error('[Firebase Admin] Failed to initialize Firestore adapter:', adapterErr);
      initializationFailed = true;
      throw adapterErr;
    }
  }

  return adminDb || clientAdapterDb;
}

export function getAdminAuth() {
  if (!adminAuth) {
    const app = getAdminApps()[0];
    if (app) {
      try {
        adminAuth = getAdminAuthSdk(app);
      } catch {
        adminAuth = null;
      }
    }
  }
  return adminAuth;
}

export function isAdminDbAvailable(): boolean {
  if (initializationFailed) return false;
  return Boolean(adminDb || clientAdapterDb || getAdminApps().length > 0 || getClientApps().length > 0);
}

export async function getAdminDocument(collectionName: string, docId: string) {
  const db = getAdminDb();
  const docRef = db.collection(collectionName).doc(docId);
  const snap = await docRef.get();
  if (snap.exists) {
    return { exists: true, data: snap.data() };
  }
  return { exists: false, data: null };
}

export async function setAdminDocument(collectionName: string, docId: string, data: any) {
  const db = getAdminDb();
  const docRef = db.collection(collectionName).doc(docId);
  await docRef.set(data);
}

export async function isUserAdmin(uid: string, email?: string): Promise<boolean> {
  if (!uid && !email) return false;
  const cleanEmail = (email || '').toLowerCase().trim();
  if (cleanEmail === 'click2itbd@gmail.com' || cleanEmail === 'clcik2itbd@gmail.com') return true;
  try {
    const db = getAdminDb();
    if (uid) {
      const userDoc = db.collection('users').doc(uid);
      const snap = await userDoc.get();
      if (snap.exists) {
        const data = snap.data();
        const role = data?.role;
        if (role === 'admin' || role === 'manager' || role === 'staff' || data?.isAdmin === true) {
          return true;
        }
        if (Array.isArray(data?.permissions) && (
          data.permissions.includes('manage_services') ||
          data.permissions.includes('manage_settings') ||
          data.permissions.includes('manage_finances') ||
          data.permissions.includes('manage_orders')
        )) {
          return true;
        }
      }
    }
    // Check if email matches any admin user in users collection
    if (email) {
      const userSnap = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
      if (!userSnap.empty) {
        const data = userSnap.docs[0].data();
        const role = data?.role;
        if (role === 'admin' || role === 'manager' || role === 'staff' || data?.isAdmin === true) {
          return true;
        }
      }
    }
    // In development mode, if user is authenticated with a valid token, allow admin access
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Firebase Admin] Failed to check admin status:', error);
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }
}
