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
  hostingSuspended: number;
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
    hostingSuspended: 0,
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
          const reminderYear = expiryDate.getFullYear();
          const reminderField = `reminderSent_${target.days}d_${reminderYear}`;
          const isTargetMatch = expiryIsoPrefix === target.dateStringPrefix || daysDiff === target.days;

          if (isTargetMatch && !data[reminderField]) {
            await sendReminderEmail(doc.id, 'domain', data, target.days, expiryDate);
            await doc.ref.update({ 
              [reminderField]: true,
              lastReminderSentAt: now.toISOString()
            });
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

  // 2. Process Hosting Expiry Reminders & 3. Automated Suspension for Overdue Accounts
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
        
        // 2a. Pre-expiry reminders (30d, 7d, 1d)
        for (const target of targetDates) {
          const reminderYear = expiryDate.getFullYear();
          const reminderField = `reminderSent_${target.days}d_${reminderYear}`;
          const isTargetMatch = expiryIsoPrefix === target.dateStringPrefix || daysDiff === target.days;

          if (isTargetMatch && !data[reminderField]) {
            await sendReminderEmail(doc.id, 'hosting', data, target.days, expiryDate);
            await doc.ref.update({ 
              [reminderField]: true,
              lastReminderSentAt: now.toISOString()
            });
            stats.hostingRemindersSent++;
          }
        }

        // 3. Automated Hosting Suspension Engine (3+ Days Past Expiration Grace Period)
        const overdueDays = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (overdueDays >= 3 && !data.suspensionExempt) {
          console.log(`[CRON] Hosting account ${doc.id} (${data.domain}) is ${overdueDays} days overdue. Executing auto-suspension...`);
          
          let whmSuspended = false;
          const targetUsername = data.providerAccountId || data.username || data.cpanelUsername;
          if (targetUsername) {
            try {
              const { suspendHostingAccount } = await import('../services/hosting.js');
              await suspendHostingAccount(targetUsername);
              whmSuspended = true;
            } catch (whmErr: any) {
              console.warn(`[CRON] WHM suspend call warning for ${data.domain}:`, whmErr?.message);
            }
          }

          const nowIso = now.toISOString();
          await doc.ref.update({
            status: 'suspended',
            suspendedAt: nowIso,
            suspensionReason: `Automated suspension: Renewal overdue by ${overdueDays} days (grace period expired).`,
            whmSuspended,
            updatedAt: nowIso
          });
          stats.hostingSuspended++;

          // Send automated suspension notice email
          const email = data.customerEmail || data.email || data.contactEmail;
          if (email) {
            const domainName = data.domain || 'Hosting Plan';
            await sendEmail({
              to: email,
              subject: `⚠️ Service Suspended: Hosting for ${domainName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px; background: #fffaf0;">
                  <h2 style="color: #dc2626; margin-top: 0;">Hosting Service Suspended</h2>
                  <p>Dear Customer,</p>
                  <p>Your cloud hosting account for <strong>${domainName}</strong> has been suspended due to an overdue renewal invoice (3+ days past expiry).</p>
                  <div style="background: #ffffff; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0 0 6px 0;"><strong>Domain:</strong> ${domainName}</p>
                    <p style="margin: 0 0 6px 0;"><strong>Expired On:</strong> ${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p style="margin: 0; color: #c2410c;"><strong>Status:</strong> Suspended (Data preserved)</p>
                  </div>
                  <p><strong>Instant Automatic Restoration:</strong></p>
                  <p>To restore your website immediately, please log in and pay the renewal invoice. Your hosting will be <strong>automatically un-suspended in real time</strong> upon payment without needing admin approval.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://click2itbd.com/account/services" style="display: inline-block; padding: 12px 28px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Renew & Restore Service</a>
                  </div>
                  <p style="font-size: 13px; color: #78716c;">Thank you for your prompt attention.<br><strong>Click2IT Automated Billing Engine</strong></p>
                </div>
              `
            }).catch(e => console.warn('[CRON] Suspension email error:', e));
          }
        }
      } catch (docErr) {
        console.error(`[CRON] Error processing hosting account for doc ${doc.id}:`, docErr);
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
