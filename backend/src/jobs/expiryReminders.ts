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
    console.log('[CRON] Running expiry reminders job...');
    try {
      await processExpiryReminders();
    } catch (error) {
      console.error('[CRON] Expiry reminders job failed:', error);
    }
  });
}

async function processExpiryReminders() {
  const db = getAdminDb();
  const now = new Date();
  
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
  const domainsRef = db.collection('domainOrders');
  const activeDomainsSnap = await domainsRef.where('status', '==', 'active').get();
  
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
        }
      }
    } catch (docErr) {
      console.error(`[CRON] Error processing domain expiry for doc ${doc.id}:`, docErr);
    }
  }

  // 2. Process Hosting Expiry Reminders
  const hostingRef = db.collection('hostingAccounts');
  const activeHostingSnap = await hostingRef.where('status', '==', 'active').get();
  
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
        }
      }
    } catch (docErr) {
      console.error(`[CRON] Error processing hosting expiry for doc ${doc.id}:`, docErr);
    }
  }
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
