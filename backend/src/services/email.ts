import { getAdminDb } from '../firebase/admin.js';
import { SmtpEmailProvider, SmtpConfig } from '../providers/email/SmtpEmailProvider.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  orderId?: string;
  customerEmail?: string;
  category?: 'order' | 'provisioning' | 'payment' | 'domain' | 'hosting' | 'system';
  type?: string;
}

export interface EmailLog {
  orderId?: string;
  recipient: string;
  type: string;
  status: 'sent' | 'failed' | 'queued';
  subject: string;
  error?: string;
  timestamp: string;
  createdAt: string;
}

let cachedSmtpProvider: SmtpEmailProvider | null = null;
let lastSmtpConfigHash = '';

export async function getSmtpProvider(forceReload = false): Promise<SmtpEmailProvider> {
  let host = '';
  let port = 587;
  let secure = false;
  let user = '';
  let password = '';
  let fromName = 'Click2IT';
  let fromEmail = 'noreply@click2itbd.com';

  // 1. Check Firestore settings/site first (allows runtime admin configuration from UI)
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection('settings').doc('site').get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.mailUsername && data.mailPassword) {
          user = data.mailUsername.trim();
          password = data.mailPassword.trim();
          const isGmailUser = user.toLowerCase().endsWith('@gmail.com');
          host = data.mailHost ? data.mailHost.trim() : (isGmailUser ? 'smtp.gmail.com' : '');
          port = parseInt(data.mailPort) || (isGmailUser ? 465 : 587);
          secure = data.mailEncryption === 'ssl' || String(port) === '465';
          if (data.mailFromName) fromName = data.mailFromName.trim();
          if (data.mailFromAddress) fromEmail = data.mailFromAddress.trim();
          else if (user.includes('@')) fromEmail = user;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read email settings from Firestore:', err);
  }

  // 2. Fallback to environment variables if not configured in Firestore
  if (!host || !user || !password) {
    user = user || process.env.SMTP_USER || process.env.GMAIL_USER || '';
    password = password || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '';
    const isGmail = (user && user.toLowerCase().endsWith('@gmail.com')) || !!process.env.GMAIL_USER;
    host = host || process.env.SMTP_HOST || (isGmail ? 'smtp.gmail.com' : '');
    port = port || parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '587'));
    secure = process.env.SMTP_SECURE === 'true' || port === 465 || isGmail;
    if (process.env.SMTP_FROM_NAME) fromName = process.env.SMTP_FROM_NAME;
    if (process.env.SMTP_FROM_EMAIL) fromEmail = process.env.SMTP_FROM_EMAIL;
    else if (user && user.includes('@')) fromEmail = user;
  }

  const currentHash = `${host}:${port}:${user}:${password}:${fromEmail}:${fromName}:${secure}`;
  if (!cachedSmtpProvider || forceReload || currentHash !== lastSmtpConfigHash) {
    const config: SmtpConfig = {
      host,
      port,
      secure,
      user,
      password,
      fromName,
      fromEmail,
    };
    cachedSmtpProvider = new SmtpEmailProvider(config);
    lastSmtpConfigHash = currentHash;
  }

  return cachedSmtpProvider;
}

export async function logEmailToFirestore(options: EmailOptions, status: 'sent' | 'failed', error?: string): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection('emailLogs').add({
      orderId: options.orderId || null,
      recipient: options.customerEmail || options.to,
      type: options.type || options.category || 'system',
      status,
      subject: options.subject,
      error: error || null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log email to Firestore:', logError);
  }
}

export async function isEmailDuplicate(options: EmailOptions): Promise<boolean> {
  try {
    const db = getAdminDb();
    const type = options.type || options.category || 'system';
    const recentWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const snapshot = await db.collection('emailLogs')
      .where('recipient', '==', options.customerEmail || options.to)
      .where('type', '==', type)
      .where('subject', '==', options.subject)
      .where('timestamp', '>=', recentWindow)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('Failed to check email duplicate:', error);
    return false;
  }
}

export async function sendEmail(options: EmailOptions, retries: number = 2): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, attachments } = options;

  if (await isEmailDuplicate(options)) {
    console.log(`Duplicate email prevented: ${subject} to ${to}`);
    return { success: true };
  }

  const provider = await getSmtpProvider();

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    const result = attachments !== undefined
      ? await provider.sendEmail(to, subject, html, attachments)
      : await provider.sendEmail(to, subject, html);

    if (result.success) {
      await logEmailToFirestore(options, 'sent');
      return { success: true };
    }

    lastError = result.error;

    if (result.code === 'SMTP_CONFIG_MISSING' || result.code === 'SMTP_AUTH_FAILED' || result.code === 'SMTP_RECIPIENT_REJECTED') {
      break;
    }
  }

  await logEmailToFirestore(options, 'failed', lastError);
  return { success: false, error: lastError };
}

export async function verifySmtpConnection(): Promise<{ success: boolean; code: string; message: string }> {
  const provider = await getSmtpProvider(true);
  return provider.verifyConnection();
}

export const EmailTemplates = {
  orderReceived: (orderId: string, customerName: string, total: number, paymentMethod: string) => ({
    subject: `Order Received - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Order Received!</h2>
        <p>Dear ${customerName},</p>
        <p>We have received your order <strong>#${orderId.slice(0, 8)}</strong>.</p>
        <p><strong>Total:</strong> ৳${total}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p>Your order is pending payment verification. We will notify you once it is confirmed.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  paymentSubmitted: (orderId: string, customerName: string, transactionId: string, total: number) => ({
    subject: `Payment Submitted - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #f59e0b;">Payment Submitted</h2>
        <p>Dear ${customerName},</p>
        <p>We have received your payment for order <strong>#${orderId.slice(0, 8)}</strong>.</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Amount:</strong> ৳${total}</p>
        <p>Your payment is pending verification. We will notify you once it is confirmed.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  paymentVerified: (orderId: string, customerName: string, total: number, transactionId: string) => ({
    subject: `Payment Confirmed - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Payment Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Your payment for order <strong>#${orderId.slice(0, 8)}</strong> has been verified.</p>
        <p><strong>Amount:</strong> ৳${total}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p>Your order is now being processed. We will notify you once it is completed.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  paymentRejected: (orderId: string, customerName: string, reason: string) => ({
    subject: `Payment Rejected - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Payment Rejected</h2>
        <p>Dear ${customerName},</p>
        <p>Your payment for order <strong>#${orderId.slice(0, 8)}</strong> could not be verified.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support or try again with a valid transaction.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  orderProcessing: (orderId: string, customerName: string) => ({
    subject: `Order Processing - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Order Processing</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>#${orderId.slice(0, 8)}</strong> is now being processed.</p>
        <p>We will notify you once it is completed.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  domainRegistered: (domain: string, expiryDate: string) => ({
    subject: `Domain Registered - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Domain Registered Successfully!</h2>
        <p>Your domain <strong>${domain}</strong> has been successfully registered.</p>
        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
        <p>You can now use this domain for your website and email.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  domainRegistrationFailed: (domain: string, reason: string) => ({
    subject: `Domain Registration Failed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Domain Registration Failed</h2>
        <p>We were unable to register your domain <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support for assistance.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  domainRenewed: (domain: string, expiryDate: string, amount: number) => ({
    subject: `Domain Renewed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Domain Renewed Successfully!</h2>
        <p>Your domain <strong>${domain}</strong> has been successfully renewed.</p>
        <p><strong>New Expiry Date:</strong> ${expiryDate}</p>
        <p><strong>Amount Paid:</strong> ৳${amount}</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  domainRenewalFailed: (domain: string, reason: string) => ({
    subject: `Domain Renewal Failed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Domain Renewal Failed</h2>
        <p>We were unable to renew your domain <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support immediately to avoid domain expiration.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  domainTransferSuccess: (domain: string) => ({
    subject: `Domain Transfer Successful - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Domain Transfer Successful!</h2>
        <p>Your domain <strong>${domain}</strong> has been successfully transferred to Click2IT.</p>
        <p>The transfer process typically takes 5-7 days to complete. You will receive another notification once the transfer is fully complete.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  domainTransferFailed: (domain: string, reason: string) => ({
    subject: `Domain Transfer Failed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Domain Transfer Failed</h2>
        <p>We were unable to transfer your domain <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support for assistance.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  hostingActivated: (domain: string, controlPanelUrl: string, username: string) => ({
    subject: `Your Hosting is Ready - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Your Hosting is Ready!</h2>
        <p>Great news! Your hosting account for <strong>${domain}</strong> has been activated.</p>
        <h3>Account Details:</h3>
        <ul>
          <li><strong>Domain:</strong> ${domain}</li>
          <li><strong>cPanel URL:</strong> <a href="${controlPanelUrl}">${controlPanelUrl}</a></li>
          <li><strong>Username:</strong> ${username}</li>
        </ul>
        <p>For security reasons, your password has been sent to you separately. Please check your email or contact support if you need assistance accessing your account.</p>
        <p>You can now log in to your cPanel and start building your website.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  hostingProvisioningFailed: (domain: string, reason: string) => ({
    subject: `Hosting Provisioning Failed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Hosting Provisioning Failed</h2>
        <p>We were unable to provision hosting for <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Our team has been notified and will contact you shortly.</p>
        <p>Thank you for your patience,<br>Click2IT Team</p>
      </div>
    `,
  }),

  hostingSuspended: (domain: string, reason: string) => ({
    subject: `Hosting Suspended - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #f59e0b;">Hosting Suspended</h2>
        <p>Your hosting account for <strong>${domain}</strong> has been suspended.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support for more information or to resolve this issue.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  hostingTerminated: (domain: string) => ({
    subject: `Hosting Terminated - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Hosting Terminated</h2>
        <p>Your hosting account for <strong>${domain}</strong> has been terminated.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  orderCompleted: (orderId: string, customerName: string) => ({
    subject: `Order Completed - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Order Completed!</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>#${orderId.slice(0, 8)}</strong> has been completed successfully.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  orderFailed: (orderId: string, customerName: string, reason: string) => ({
    subject: `Order Failed - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #dc2626;">Order Failed</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>#${orderId.slice(0, 8)}</strong> could not be completed.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support for assistance.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  orderConfirmation: (orderId: string, customerName: string) => ({
    subject: `Order Confirmation - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">Order Confirmed!</h2>
        </div>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Thank you for your order. We have successfully received it and are currently processing it.</p>
        <p><strong>Order ID:</strong> #${orderId}</p>
        <p>You will find your detailed invoice attached to this email as a PDF.</p>
        <p>We will notify you once your order has been shipped. If you have any questions, please contact our support team.</p>
        <p>Best regards,<br><strong>Click2ItBD Team</strong></p>
      </div>
    `,
  }),

  orderStatusUpdate: (orderId: string, customerName: string, status: string) => ({
    subject: `Order Status Update: ${status.toUpperCase()} - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Order Status Update</h2>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>The status of your order <strong>#${orderId.slice(0, 8)}</strong> has been updated.</p>
        <p>New Status: <span style="display: inline-block; padding: 5px 10px; background: #e0e7ff; color: #3730a3; border-radius: 5px; font-weight: bold;">${status.toUpperCase()}</span></p>
        <p>Thank you for shopping with Click2ItBD!</p>
      </div>
    `,
  }),

  paymentVerification: (orderId: string, customerName: string, amount: number, method: string) => ({
    subject: `Payment Verified - #${orderId.slice(0, 8)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #16a34a;">Payment Verified</h2>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>We have successfully verified your payment for order <strong>#${orderId.slice(0, 8)}</strong>.</p>
        <p><strong>Amount:</strong> ৳ ${amount}</p>
        <p><strong>Method:</strong> ${method}</p>
        <p>Your order is now being processed.</p>
        <p>Thank you,<br>Click2ItBD Team</p>
      </div>
    `,
  }),

  pcBuildSummary: (customerName: string, totalAmount: number) => ({
    subject: `Your Custom PC Build Summary`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Your Custom PC Build</h2>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Thank you for using the Click2ItBD PC Builder! Your custom build summary is attached to this email.</p>
        <p><strong>Estimated Total:</strong> ৳ ${totalAmount}</p>
        <p>If you're ready to order or need expert advice, feel free to reply to this email or contact our support.</p>
        <p>Best regards,<br>Click2ItBD Team</p>
      </div>
    `,
  }),

  lowStockWarning: (productName: string, currentStock: number) => ({
    subject: `[ALERT] Low Stock Warning - ${productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; background-color: #fef2f2;">
        <h2 style="color: #dc2626; margin-top: 0;">Low Stock Alert</h2>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Current Stock:</strong> ${currentStock} units</p>
        <p>Please restock this product soon to avoid missing out on sales.</p>
        <a href="https://click2itbd.com/admin" style="display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Go to Admin Panel</a>
      </div>
    `,
  }),

  welcome: (customerName: string, email: string) => ({
    subject: 'Welcome to Click2IT!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Welcome to Click2IT!</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for signing up with Click2IT. We're excited to have you on board!</p>
        <p>You can now:</p>
        <ul>
          <li>Search and register domains</li>
          <li>Purchase hosting plans</li>
          <li>Manage your services from your dashboard</li>
          <li>Access 24/7 support</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>Click2IT Team</p>
      </div>
    `,
  }),
};
