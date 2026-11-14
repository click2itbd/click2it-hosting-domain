import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAdminDb } from '../firebase/admin.js';
const BACKUP_COLLECTIONS = [
    'settings',
    'users',
    'orders',
    'hostingOrders',
    'domainOrders',
    'invoices',
    'tickets',
    'products',
    'hostingPlans',
    'domainPricing',
];
const BACKUPS_DIR = path.join(process.cwd(), 'backups');
function ensureBackupsDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
}
/**
 * Creates a full database backup snapshot, saves it to disk, and logs metadata in Firestore
 */
export async function createDatabaseBackup(triggeredBy = 'Daily Automated Cron') {
    try {
        ensureBackupsDir();
        const db = getAdminDb();
        const now = new Date().toISOString();
        const snapshotId = `backup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const backupData = {};
        let totalDocs = 0;
        for (const colName of BACKUP_COLLECTIONS) {
            try {
                const snap = await db.collection(colName).get();
                const docs = snap.docs.map((doc) => {
                    const data = doc.data() || {};
                    // Mask ultra-sensitive private tokens from user exports if any
                    if (colName === 'settings' && doc.id === 'api_keys') {
                        const masked = { ...data };
                        if (masked.whmApiToken)
                            masked.whmApiToken = '[ENCRYPTED_BACKUP_VALUE]';
                        if (masked.bkashAppSecret)
                            masked.bkashAppSecret = '[ENCRYPTED_BACKUP_VALUE]';
                        return { _docId: doc.id, ...masked };
                    }
                    return { _docId: doc.id, ...data };
                });
                backupData[colName] = docs;
                totalDocs += docs.length;
            }
            catch (colErr) {
                console.warn(`[BackupService] Warning reading collection "${colName}":`, colErr?.message || colErr);
                backupData[colName] = [];
            }
        }
        const payload = {
            version: '1.0',
            snapshotId,
            createdAt: now,
            triggeredBy,
            environment: process.env.NODE_ENV || 'production',
            totalCollections: BACKUP_COLLECTIONS.length,
            totalDocuments: totalDocs,
            collections: backupData,
        };
        const jsonStr = JSON.stringify(payload, null, 2);
        const filePath = path.join(BACKUPS_DIR, `${snapshotId}.json`);
        fs.writeFileSync(filePath, jsonStr, 'utf8');
        const fileSizeBytes = Buffer.byteLength(jsonStr, 'utf8');
        const fileSizeKb = Math.round((fileSizeBytes / 1024) * 10) / 10;
        const metadata = {
            id: snapshotId,
            createdAt: now,
            triggeredBy,
            totalCollections: BACKUP_COLLECTIONS.length,
            totalDocuments: totalDocs,
            fileSizeBytes,
            fileSizeKb,
            status: 'completed',
            filePath,
        };
        // Save metadata record in Firestore collection `backup_snapshots`
        try {
            await db.collection('backup_snapshots').doc(snapshotId).set({
                ...metadata,
                updatedAt: now,
            });
        }
        catch (dbErr) {
            console.warn('[BackupService] Firestore metadata write warning:', dbErr);
        }
        // Prune old backups (keep most recent 30 files)
        try {
            pruneOldBackups();
        }
        catch { }
        return { success: true, metadata };
    }
    catch (error) {
        console.error('[BackupService] Backup creation failed:', error);
        return { success: false, error: error?.message || 'Failed to generate backup snapshot' };
    }
}
/**
 * Lists all available backup snapshots (from Firestore and local backup folder)
 */
export async function listBackupSnapshots() {
    const list = [];
    try {
        const db = getAdminDb();
        const snap = await db.collection('backup_snapshots')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        for (const doc of snap.docs) {
            const data = doc.data();
            list.push({ ...data, id: doc.id });
        }
    }
    catch (err) {
        console.warn('[BackupService] Firestore list warning, reading local directory:', err);
    }
    // If Firestore didn't return anything or threw, scan local directory
    if (list.length === 0 && fs.existsSync(BACKUPS_DIR)) {
        try {
            const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const id = file.replace('.json', '');
                const stat = fs.statSync(path.join(BACKUPS_DIR, file));
                list.push({
                    id,
                    createdAt: stat.mtime.toISOString(),
                    triggeredBy: 'Local System',
                    totalCollections: BACKUP_COLLECTIONS.length,
                    totalDocuments: 0,
                    fileSizeBytes: stat.size,
                    fileSizeKb: Math.round((stat.size / 1024) * 10) / 10,
                    status: 'completed',
                });
            }
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        catch { }
    }
    return list;
}
/**
 * Returns full path to a backup JSON file for download
 */
export function getBackupFilePath(snapshotId) {
    ensureBackupsDir();
    const safeId = path.basename(snapshotId).replace(/[^a-zA-Z0-9_-]/g, '');
    const target = path.join(BACKUPS_DIR, `${safeId}.json`);
    if (fs.existsSync(target)) {
        return target;
    }
    return null;
}
/**
 * Retains the 30 most recent backup files and cleans up older snapshots
 */
function pruneOldBackups(maxKeep = 30) {
    if (!fs.existsSync(BACKUPS_DIR))
        return;
    const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
    }))
        .sort((a, b) => b.time - a.time);
    if (files.length > maxKeep) {
        const toDelete = files.slice(maxKeep);
        for (const item of toDelete) {
            try {
                fs.unlinkSync(item.path);
            }
            catch { }
        }
    }
}
