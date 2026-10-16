import cron from 'node-cron';
import { getAdminDb } from '../firebase/admin.js';
import { sendEmail } from '../services/email.js';

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

  const domainsRef = db.collection('domainOrders');
  const activeDomainsSnap = await domainsRef.where('status', '==', 'active').get();
  
  for (const doc of activeDomainsSnap.docs) {
    const data = doc.data();
    if (!data.expiresAt) continue;
    
    for (const target of targetDates) {
      const reminderField = `reminderSent_${target.days}d`;
      if (data.expiresAt.startsWith(target.dateStringPrefix) && !data[reminderField]) {
        await sendReminderEmail(doc.id, 'domain', data, target.days);
        await doc.ref.update({ [reminderField]: true });
      }
    }
  }

  const hostingRef = db.collection('hostingAccounts');
  const activeHostingSnap = await hostingRef.where('status', '==', 'active').get();
  
  for (const doc of activeHostingSnap.docs) {
    const data = doc.data();
    if (!data.expiresAt) continue;
    
    for (const target of targetDates) {
      const reminderField = `reminderSent_${target.days}d`;
      if (data.expiresAt.startsWith(target.dateStringPrefix) && !data[reminderField]) {
        await sendReminderEmail(doc.id, 'hosting', data, target.days);
        await doc.ref.update({ [reminderField]: true });
      }
    }
  }
}

async function sendReminderEmail(id: string, type: 'domain' | 'hosting', data: any, daysLeft: number) {
  const email = data.customerEmail || data.email || data.contactEmail;
  if (!email) return;

  const itemName = type === 'domain' ? data.domain : (data.domain || 'Hosting Plan');
  const expiresAt = new Date(data.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const subject = `Action Required: Your ${type} ${itemName} expires in ${daysLeft} days!`;
  
  const htmlBody = `
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
  <h2>Expiry Reminder</h2>
  <p>Dear Customer,</p>
  <p>This is a friendly reminder that your ${type} <strong>${itemName}</strong> is set to expire in <strong>${daysLeft} days</strong> on <strong>${expiresAt}</strong>.</p>
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
