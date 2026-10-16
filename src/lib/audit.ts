import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export type AuditAction = 'CREATE' | 'EDIT' | 'DELETE' | 'STATUS_CHANGE' | 'RESTORE' | 'SETTINGS' | 'SECURITY';

export interface AuditLogItem {
  id?: string;
  action: AuditAction | string;
  entityType: string;
  details: string;
  performedBy: string;
  timestamp: string;
  entityId?: string;
  previousState?: any;
  newState?: any;
  userAgent?: string;
}

export const logAudit = async (
  action: AuditAction | string,
  entityType: string,
  details: string,
  performedBy: string,
  extraMetadata?: {
    entityId?: string;
    previousState?: any;
    newState?: any;
    userAgent?: string;
  }
) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      entityType,
      details,
      performedBy,
      timestamp: new Date().toISOString(),
      userAgent: extraMetadata?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      ...(extraMetadata || {})
    });
  } catch (error) {
    console.error("Failed to log audit action", error);
  }
};
