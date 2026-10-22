import cron from 'node-cron';
import { getAdminDb } from '../firebase/admin.js';
import { sendEmail } from '../services/email.js';

/**
 * Safely parse any date representation (ISO string, Firestore Timestamp, Date object, or epoch number)
 */
function parseExpiryDate(val: any): Date | null {
  if (!val) return null;
  try {
    if (typeof val?.toDate === 'function') {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'object' && typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function setupExpiryReminders() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running in-memory expiry reminders job...');
    try {
      const result = await processExpiryReminders();
      console.log('[CRON] In-memory expiry reminders completed:', result);
    } catch (error) {
      console.error('[CRON] In-memory expiry reminders job failed:', error);
    }
  });
}

export interface ExpiryReminderResult {
  domainsChecked: number;
  domainRemindersSent: number;
  hostingChecked: number;
  hostingRemindersSent: number;
  errors: number;
}

export async function processExpiryReminders(): Promise<ExpiryReminderResult> {
  const db = getAdminDb();
  const now = new Date();
  
  const stats: ExpiryReminderResult = {
    domainsChecked: 0,
    domainRemindersSent: 0,
    hostingChecked: 0,
    hostingRemindersSent: 0,
    errors: 0
  };

  const daysToCheck = [30, 7, 1];
  const targetDates = daysToCheck.map(days => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return {
      days,
      dateStringPrefix: d.toISOString().split('T')[0]
    };
  });

  // 1. Process Domain Expiry Reminders
  try {
    const domainsRef = db.collection('domainOrders');
    const activeDomainsSnap = await domainsRef.where('status', '==', 'active').get();
    stats.domainsChecked = activeDomainsSnap.size;
    
    for (const doc of activeDomainsSnap.docs) {
      try {
        const data = doc.data();
        const expiryDate = parseExpiryDate(data.expiresAt || data.newExpiryDate);
        if (!expiryDate) continue;

        const expiryIsoPrefix = expiryDate.toISOString().split('T')[0];
        const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        for (const target of targetDates) {
          const reminderField = `reminderSent_${target.days}d`;
          const isTargetMatch = expiryIsoPrefix === target.dateStringPrefix || daysDiff === target.days;

          if (isTargetMatch && !data[reminderField]) {
            await sendReminderEmail(doc.id, 'domain', data, target.days, expiryDate);
            await doc.ref.update({ [reminderField]: true });
            stats.domainRemindersSent++;
          }
        }
      } catch (docErr) {
        console.error(`[CRON] Error processing domain expiry for doc ${doc.id}:`, docErr);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error('[CRON] Error fetching active domain orders:', err);
    stats.errors++;
  }

  // 2. Process Hosting Expiry Reminders
  try {
    const hostingRef = db.collection('hostingAccounts');
    const activeHostingSnap = await hostingRef.where('status', '==', 'active').get();
    stats.hostingChecked = activeHostingSnap.size;
    
    for (const doc of activeHostingSnap.docs) {
      try {
        const data = doc.data();
        const expiryDate = parseExpiryDate(data.expiresAt || data.newExpiryDate);
        if (!expiryDate) continue;

        const expiryIsoPrefix = expiryDate.toISOString().split('T')[0];
        const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        for (const target of targetDates) {
          const reminderField = `reminderSent_${target.days}d`;
          const isTargetMatch = expiryIsoPrefix === target.dateStringPrefix || daysDiff === target.days;

          if (isTargetMatch && !data[reminderField]) {
            await sendReminderEmail(doc.id, 'hosting', data, target.days, expiryDate);
            await doc.ref.update({ [reminderField]: true });
            stats.hostingRemindersSent++;
          }
        }
      } catch (docErr) {
        console.error(`[CRON] Error processing hosting expiry for doc ${doc.id}:`, docErr);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error('[CRON] Error fetching active hosting accounts:', err);
    stats.errors++;
  }

  return stats;
}

async function sendReminderEmail(id: string, type: 'domain' | 'hosting', data: any, daysLeft: number, parsedExpiry?: Date | null) {
  const email = data.customerEmail || data.email || data.contactEmail;
  if (!email) return;

  const itemName = type === 'domain' ? data.domain : (data.domain || 'Hosting Plan');
  const expiryDate = parsedExpiry || parseExpiryDate(data.expiresAt || data.newExpiryDate);
  const formattedExpiry = expiryDate
    ? expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Upcoming Expiry Date';

  const subject = `Action Required: Your ${type} ${itemName} expires in ${daysLeft} days!`;
  
  const htmlBody = `
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
  <h2>Expiry Reminder</h2>
  <p>Dear Customer,</p>
  <p>This is a friendly reminder that your ${type} <strong>${itemName}</strong> is set to expire in <strong>${daysLeft} days</strong> on <strong>${formattedExpiry}</strong>.</p>
  <p>To ensure continuous service and avoid suspension, please log in to your account and renew it as soon as possible.</p>
  <p><br>Thank you,<br><strong>The click2itbd Team</strong></p>
</div>`.trim();

  try {
    await sendEmail({ to: email, subject, html: htmlBody });
    console.log(`[CRON] Sent ${daysLeft}-day reminder to ${email} for ${type} ${itemName}`);
  } catch (error) {
    console.error(`[CRON] Error sending email to ${email}:`, error);
  }
}
