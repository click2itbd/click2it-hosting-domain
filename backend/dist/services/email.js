import { getAdminDb } from '../firebase/admin.js';
import { SmtpEmailProvider } from '../providers/email/SmtpEmailProvider.js';
let cachedSmtpProvider = null;
let lastSmtpConfigHash = '';
export async function getSmtpProvider(forceReload = false) {
    let host = '';
    let port = 587;
    let secure = false;
    let user = '';
    let password = '';
    let fromName = 'Click2IT';
    let fromEmail = 'noreply@click2it.bd';
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
                    if (data.mailFromName)
                        fromName = data.mailFromName.trim();
                    if (data.mailFromAddress)
                        fromEmail = data.mailFromAddress.trim();
                    else if (user.includes('@'))
                        fromEmail = user;
                }
            }
        }
    }
    catch (err) {
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
        if (process.env.SMTP_FROM_NAME)
            fromName = process.env.SMTP_FROM_NAME;
        if (process.env.SMTP_FROM_EMAIL)
            fromEmail = process.env.SMTP_FROM_EMAIL;
        else if (user && user.includes('@'))
            fromEmail = user;
    }
    const currentHash = `${host}:${port}:${user}:${password}:${fromEmail}:${fromName}:${secure}`;
    if (!cachedSmtpProvider || forceReload || currentHash !== lastSmtpConfigHash) {
        const config = {
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
export async function logEmailToFirestore(options, status, error) {
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
    }
    catch (logError) {
        console.error('Failed to log email to Firestore:', logError);
    }
}
export async function isEmailDuplicate(options) {
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
    }
    catch (error) {
        console.error('Failed to check email duplicate:', error);
        return false;
    }
}
export async function getResendConfig() {
    let apiKey = process.env.RESEND_API_KEY || '';
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@click2it.bd';
    let fromName = process.env.SMTP_FROM_NAME || 'Click2IT';
    try {
        const db = getAdminDb();
        if (db) {
            const [siteSnap, hostingSnap, keysSnap] = await Promise.all([
                db.collection('settings').doc('site').get().catch(() => null),
                db.collection('settings').doc('hostingApiConfig').get().catch(() => null),
                db.collection('settings').doc('api_keys').get().catch(() => null),
            ]);
            for (const snap of [keysSnap, hostingSnap, siteSnap]) {
                if (snap && snap.exists) {
                    const data = snap.data() || {};
                    if (data.resendApiKey && String(data.resendApiKey).trim()) {
                        apiKey = String(data.resendApiKey).trim();
                    }
                    if (data.resendFromEmail && String(data.resendFromEmail).trim()) {
                        fromEmail = String(data.resendFromEmail).trim();
                    }
                    else if (data.mailFromAddress && String(data.mailFromAddress).trim()) {
                        fromEmail = String(data.mailFromAddress).trim();
                    }
                    if (data.mailFromName && String(data.mailFromName).trim()) {
                        fromName = String(data.mailFromName).trim();
                    }
                    else if (data.brandName && String(data.brandName).trim()) {
                        fromName = String(data.brandName).trim();
                    }
                }
            }
        }
    }
    catch (err) {
        console.warn('Could not read Resend config from Firestore:', err);
    }
    return { apiKey, fromEmail, fromName };
}
export async function sendViaResend(to, subject, html, attachments) {
    const { apiKey, fromEmail, fromName } = await getResendConfig();
    if (!apiKey) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }
    const formattedFrom = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;
    const sendPayload = async (fromAddress) => {
        const formattedAttachments = attachments && attachments.length > 0
            ? attachments.map((att) => ({
                filename: att.filename || 'attachment.pdf',
                content: Buffer.isBuffer(att.content)
                    ? att.content.toString('base64')
                    : att.content,
            }))
            : undefined;
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                ...(formattedAttachments ? { attachments: formattedAttachments } : {}),
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.id) {
            return { success: true, id: data.id };
        }
        return {
            success: false,
            error: data?.message || data?.error || `Resend delivery failed (${response.status})`,
        };
    };
    try {
        const primaryAttempt = await sendPayload(formattedFrom);
        if (primaryAttempt.success) {
            return primaryAttempt;
        }
        // If custom domain is not yet verified in Resend, automatically retry with onboarding@resend.dev
        if (!fromEmail.endsWith('@resend.dev') &&
            (primaryAttempt.error?.toLowerCase().includes('domain') ||
                primaryAttempt.error?.toLowerCase().includes('verified') ||
                primaryAttempt.error?.toLowerCase().includes('not allowed'))) {
            const fallbackAttempt = await sendPayload(`${fromName} <onboarding@resend.dev>`);
            if (fallbackAttempt.success) {
                return fallbackAttempt;
            }
        }
        return primaryAttempt;
    }
    catch (err) {
        return { success: false, error: err?.message || 'Resend request failed' };
    }
}
export async function sendEmail(options, retries = 2) {
    const { to, subject, html, attachments } = options;
    if (await isEmailDuplicate(options)) {
        console.log(`Duplicate email prevented: ${subject} to ${to}`);
        return { success: true };
    }
    // 1. Try Resend first if RESEND_API_KEY is configured
    const resendCfg = await getResendConfig();
    if (resendCfg.apiKey) {
        const resendResult = await sendViaResend(to, subject, html, attachments);
        if (resendResult.success) {
            await logEmailToFirestore(options, 'sent');
            return { success: true, provider: 'resend' };
        }
        console.warn('[Email] Resend delivery failed, attempting SMTP fallback:', resendResult.error);
    }
    // 2. Fallback to SMTP Provider
    const provider = await getSmtpProvider();
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        const result = attachments !== undefined
            ? await provider.sendEmail(to, subject, html, attachments)
            : await provider.sendEmail(to, subject, html);
        if (result.success) {
            await logEmailToFirestore(options, 'sent');
            return { success: true, provider: 'smtp' };
        }
        lastError = result.error;
        if (result.code === 'SMTP_CONFIG_MISSING' || result.code === 'SMTP_AUTH_FAILED' || result.code === 'SMTP_RECIPIENT_REJECTED') {
            break;
        }
    }
    await logEmailToFirestore(options, 'failed', lastError);
    return { success: false, error: lastError };
}
export async function verifySmtpConnection() {
    const provider = await getSmtpProvider(true);
    return provider.verifyConnection();
}
export const EmailTemplates = {
    orderReceived: (orderId, customerName, total, paymentMethod) => ({
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
    paymentSubmitted: (orderId, customerName, transactionId, total) => ({
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
    paymentVerified: (orderId, customerName, total, transactionId) => ({
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
    paymentRejected: (orderId, customerName, reason) => ({
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
    orderProcessing: (orderId, customerName) => ({
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
    domainRegistered: (domain, expiryDate) => ({
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
    domainRegistrationFailed: (domain, reason) => ({
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
    domainRenewed: (domain, expiryDate, amount) => ({
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
    domainRenewalFailed: (domain, reason) => ({
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
    domainTransferSuccess: (domain) => ({
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
    domainTransferFailed: (domain, reason) => ({
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
    hostingActivated: (domain, controlPanelUrl, username) => ({
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
    hostingProvisioningFailed: (domain, reason) => ({
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
    hostingSuspended: (domain, reason) => ({
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
    hostingTerminated: (domain) => ({
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
    orderCompleted: (orderId, customerName) => ({
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
    orderFailed: (orderId, customerName, reason) => ({
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
    orderConfirmation: (orderId, customerName) => ({
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
    orderStatusUpdate: (orderId, customerName, status) => ({
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
    paymentVerification: (orderId, customerName, amount, method) => ({
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
    pcBuildSummary: (customerName, totalAmount) => ({
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
    lowStockWarning: (productName, currentStock) => ({
        subject: `[ALERT] Low Stock Warning - ${productName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; background-color: #fef2f2;">
        <h2 style="color: #dc2626; margin-top: 0;">Low Stock Alert</h2>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Current Stock:</strong> ${currentStock} units</p>
        <p>Please restock this product soon to avoid missing out on sales.</p>
        <a href="https://click2it.bd/admin" style="display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Go to Admin Panel</a>
      </div>
    `,
    }),
    welcome: (customerName, email) => ({
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
    passwordReset: (email, resetUrl, expiresInMinutes = 60) => ({
        subject: 'Reset Your Click2IT Account Password',
        html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #081621 0%, #1e3a8a 100%); padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.4px;">CLICK2IT</h1>
          <p style="margin: 6px 0 0; color: #93c5fd; font-size: 13px;">Account Security & Password Recovery</p>
        </div>
        <div style="padding: 28px 28px 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 700;">Password Reset Request</h2>
          <p style="margin: 0 0 16px;">Hello,</p>
          <p style="margin: 0 0 20px;">We received a request to reset the password for your Click2IT account associated with <strong>${email}</strong>. Click the secure button below to set a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
              Reset My Password
            </a>
          </div>
          <p style="margin: 0 0 12px; font-size: 12px; color: #64748b;">Or copy and paste this link into your browser:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; word-break: break-all; font-family: monospace; font-size: 12px; color: #2563eb; margin-bottom: 20px;">
            ${resetUrl}
          </div>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 12px; color: #92400e;">
            <strong>Security Notice:</strong> This password reset link is valid for <strong>${expiresInMinutes} minutes</strong>. If you did not request a password reset, please ignore this email — your account remains secure.
          </div>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0; font-weight: 700; color: #0f172a;">Click2IT Hosting & Cloud</p>
          <p style="margin: 4px 0 0;">Email: info@click2it.bd | Web: <a href="https://click2it.bd" style="color: #2563eb; text-decoration: none;">click2it.bd</a></p>
        </div>
      </div>
    `,
    }),
    passwordResetConfirmation: (email) => ({
        subject: 'Your Click2IT Password Has Been Changed',
        html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #081621 0%, #065f46 100%); padding: 26px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">CLICK2IT</h1>
          <p style="margin: 6px 0 0; color: #6ee7b7; font-size: 13px;">Password Updated Successfully</p>
        </div>
        <div style="padding: 26px 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p style="margin: 0 0 14px;">Hello,</p>
          <p style="margin: 0 0 16px;">The password for your Click2IT account (<strong>${email}</strong>) was recently changed.</p>
          <p style="margin: 0 0 20px;">If you made this change, no further action is needed. You can sign in anytime at <a href="https://click2it.bd/login" style="color: #2563eb; font-weight: 600;">click2it.bd/login</a>.</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 12px; color: #991b1b;">
            If you did not authorize this change, please contact our security & support team immediately at <strong>info@click2it.bd</strong>.
          </div>
        </div>
      </div>
    `,
    }),
};
