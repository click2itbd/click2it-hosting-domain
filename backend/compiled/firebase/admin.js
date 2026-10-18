import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuthSdk } from 'firebase-admin/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let adminDb = null;
let adminAuth = null;
let clientAdapterDb = null;
let initializationFailed = false;
export function validateServiceAccountStructure(serviceAccount) {
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
function getFirebaseClientConfig() {
    const candidatePaths = [
        path.resolve(process.cwd(), 'firebase-applet-config.json'),
        path.resolve(__dirname, '..', '..', 'firebase-applet-config.json'),
        path.resolve(__dirname, '..', '..', '..', 'firebase-applet-config.json'),
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            try {
                return JSON.parse(fs.readFileSync(p, 'utf8'));
            }
            catch (err) {
                console.warn('[Firebase] Error reading config from', p, err);
            }
        }
    }
    return {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0990631330',
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID ||
            process.env.FIRESTORE_DATABASE_ID ||
            'ai-studio-422fbad2-d827-4e69-8599-aed85390d277',
    };
}
function toFirestoreValue(val) {
    if (val === null || val === undefined)
        return { nullValue: null };
    if (typeof val === 'boolean')
        return { booleanValue: val };
    if (typeof val === 'number') {
        return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === 'string')
        return { stringValue: val };
    if (val instanceof Date)
        return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined)
                fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}
function fromFirestoreValue(val) {
    if (!val || typeof val !== 'object')
        return undefined;
    if ('nullValue' in val)
        return null;
    if ('booleanValue' in val)
        return Boolean(val.booleanValue);
    if ('integerValue' in val)
        return Number(val.integerValue);
    if ('doubleValue' in val)
        return Number(val.doubleValue);
    if ('stringValue' in val)
        return String(val.stringValue);
    if ('timestampValue' in val)
        return String(val.timestampValue);
    if ('arrayValue' in val) {
        return (val.arrayValue?.values || []).map(fromFirestoreValue);
    }
    if ('mapValue' in val) {
        return fromFirestoreFields(val.mapValue?.fields || {});
    }
    return undefined;
}
function fromFirestoreFields(fields = {}) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
        out[k] = fromFirestoreValue(v);
    }
    return out;
}
function createRestFirestoreAdapter() {
    const cfg = getFirebaseClientConfig();
    const projectId = cfg.projectId || 'gen-lang-client-0990631330';
    const dbId = cfg.firestoreDatabaseId || 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents`;
    const makeDocRef = (colName, docId) => {
        const id = docId || crypto.randomBytes(10).toString('hex');
        const docPath = `${colName}/${id}`;
        const docUrl = `${baseUrl}/${encodeURIComponent(colName)}/${encodeURIComponent(id)}`;
        const refObj = {
            id,
            path: docPath,
            async get() {
                const res = await fetch(docUrl);
                if (res.status === 404) {
                    return {
                        id,
                        exists: false,
                        data: () => undefined,
                        get: () => undefined,
                        ref: refObj,
                    };
                }
                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`Firestore GET failed (${res.status}): ${errText}`);
                }
                const json = await res.json();
                const parsed = fromFirestoreFields(json.fields || {});
                return {
                    id,
                    exists: true,
                    data: () => parsed,
                    get: (field) => parsed?.[field],
                    ref: refObj,
                };
            },
            async set(data, opts) {
                const fields = {};
                const keys = Object.keys(data || {}).filter((k) => data[k] !== undefined);
                for (const k of keys) {
                    fields[k] = toFirestoreValue(data[k]);
                }
                let url = docUrl;
                if (opts?.merge && keys.length > 0) {
                    const maskParams = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
                    url = `${docUrl}?${maskParams}`;
                }
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields }),
                });
                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`Firestore SET failed (${res.status}): ${errText}`);
                }
            },
            async update(data) {
                return refObj.set(data, { merge: true });
            },
            async delete() {
                const res = await fetch(docUrl, { method: 'DELETE' });
                if (!res.ok && res.status !== 404) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`Firestore DELETE failed (${res.status}): ${errText}`);
                }
            },
        };
        return refObj;
    };
    class RestQueryAdapter {
        colName;
        filters;
        orders;
        limitCount;
        constructor(colName, filters = [], orders = [], limitCount) {
            this.colName = colName;
            this.filters = filters;
            this.orders = orders;
            this.limitCount = limitCount;
        }
        where(field, op, val) {
            return new RestQueryAdapter(this.colName, [...this.filters, { field, op, val }], this.orders, this.limitCount);
        }
        orderBy(field, dir = 'asc') {
            return new RestQueryAdapter(this.colName, this.filters, [...this.orders, { field, dir }], this.limitCount);
        }
        limit(n) {
            return new RestQueryAdapter(this.colName, this.filters, this.orders, n);
        }
        async get() {
            const opMap = {
                '==': 'EQUAL',
                '!=': 'NOT_EQUAL',
                '<': 'LESS_THAN',
                '<=': 'LESS_THAN_OR_EQUAL',
                '>': 'GREATER_THAN',
                '>=': 'GREATER_THAN_OR_EQUAL',
                'array-contains': 'ARRAY_CONTAINS',
                in: 'IN',
            };
            const structuredQuery = {
                from: [{ collectionId: this.colName }],
            };
            if (this.filters.length === 1) {
                const f = this.filters[0];
                structuredQuery.where = {
                    fieldFilter: {
                        field: { fieldPath: f.field },
                        op: opMap[f.op] || 'EQUAL',
                        value: toFirestoreValue(f.val),
                    },
                };
            }
            else if (this.filters.length > 1) {
                structuredQuery.where = {
                    compositeFilter: {
                        op: 'AND',
                        filters: this.filters.map((f) => ({
                            fieldFilter: {
                                field: { fieldPath: f.field },
                                op: opMap[f.op] || 'EQUAL',
                                value: toFirestoreValue(f.val),
                            },
                        })),
                    },
                };
            }
            if (this.orders.length > 0) {
                structuredQuery.orderBy = this.orders.map((o) => ({
                    field: { fieldPath: o.field },
                    direction: o.dir === 'desc' ? 'DESCENDING' : 'ASCENDING',
                }));
            }
            if (this.limitCount) {
                structuredQuery.limit = this.limitCount;
            }
            const res = await fetch(`${baseUrl}:runQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ structuredQuery }),
            });
            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                throw new Error(`Firestore Query failed (${res.status}): ${errText}`);
            }
            const rows = (await res.json());
            const docs = (rows || [])
                .filter((r) => r && r.document)
                .map((r) => {
                const docName = r.document.name || '';
                const id = docName.split('/').pop() || '';
                const parsed = fromFirestoreFields(r.document.fields || {});
                const ref = makeDocRef(this.colName, id);
                return {
                    id,
                    exists: true,
                    data: () => parsed,
                    get: (field) => parsed?.[field],
                    ref,
                };
            });
            return {
                empty: docs.length === 0,
                size: docs.length,
                docs,
                forEach: (cb) => docs.forEach(cb),
            };
        }
    }
    class RestCollectionAdapter extends RestQueryAdapter {
        constructor(colName) {
            super(colName);
        }
        doc(id) {
            return makeDocRef(this.colName, id);
        }
        async add(data) {
            const dRef = makeDocRef(this.colName);
            await dRef.set(data);
            return dRef;
        }
    }
    return {
        collection: (name) => new RestCollectionAdapter(name),
        batch: () => {
            const ops = [];
            const resolveRef = (target) => (target?.ref ? target.ref : target);
            return {
                set: (target, data, opts) => {
                    ops.push(() => resolveRef(target).set(data, opts));
                },
                update: (target, data) => {
                    ops.push(() => resolveRef(target).update(data));
                },
                delete: (target) => {
                    ops.push(() => resolveRef(target).delete());
                },
                commit: async () => {
                    await Promise.all(ops.map((fn) => fn()));
                },
            };
        },
    };
}
export function getAdminDb() {
    // Check if a service account was provided and validated
    if (!adminDb && !clientAdapterDb) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
        let serviceAccount = null;
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
                    }
                    catch (err) {
                        console.warn('[Firebase Admin] Could not parse service account file:', err);
                        serviceAccount = null;
                    }
                }
            }
            else {
                try {
                    serviceAccount = JSON.parse(serviceAccountKey);
                    validateServiceAccountStructure(serviceAccount);
                }
                catch {
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
            }
            catch (err) {
                console.warn('[Firebase Admin] Falling back to REST adapter:', err);
            }
        }
        // Fallback: Initialize zero-dependency Firestore REST API adapter
        try {
            clientAdapterDb = createRestFirestoreAdapter();
            return clientAdapterDb;
        }
        catch (adapterErr) {
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
            }
            catch {
                adminAuth = null;
            }
        }
    }
    return adminAuth;
}
export function isAdminDbAvailable() {
    if (initializationFailed)
        return false;
    return Boolean(adminDb || clientAdapterDb || getAdminApps().length > 0);
}
export async function getAdminDocument(collectionName, docId) {
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(docId);
    const snap = await docRef.get();
    if (snap.exists) {
        return { exists: true, data: snap.data() };
    }
    return { exists: false, data: null };
}
export async function setAdminDocument(collectionName, docId, data) {
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.set(data);
}
export async function isUserAdmin(uid, email) {
    if (!uid && !email)
        return false;
    const cleanEmail = (email || '').toLowerCase().trim();
    if (cleanEmail === 'click2itbd@gmail.com' || cleanEmail === 'clcik2itbd@gmail.com')
        return true;
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
                if (Array.isArray(data?.permissions) && (data.permissions.includes('manage_services') ||
                    data.permissions.includes('manage_settings') ||
                    data.permissions.includes('manage_finances') ||
                    data.permissions.includes('manage_orders'))) {
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
    }
    catch (error) {
        console.error('[Firebase Admin] Failed to check admin status:', error);
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        return false;
    }
}
