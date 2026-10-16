const { getFirestore } = require('firebase-admin/firestore');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

async function logEmailToFirestore(options, status, error) {
  try {
    await db.collection('emailLogs').add({
      orderId: options.orderId || null,
      customerEmail: options.customerEmail || options.to,
      subject: options.subject,
      content: options.html,
      category: options.category || 'system',
      sentAt: new Date().toISOString(),
      status,
      error: error || null,
      createdAt: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log email to Firestore:', logError);
  }
}

async function sendEmail(options) {
  const { to, subject, html } = options;

  if (!resend) {
    const error = 'Email service not configured';
    console.warn(`${error}:`, subject);
    await logEmailToFirestore(options, 'failed', error);
    return { success: false, error };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Click2IT <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      await logEmailToFirestore(options, 'failed', error.message);
      return { success: false, error: error.message };
    }

    await logEmailToFirestore(options, 'sent');
    return { success: true, data };
  } catch (error) {
    const errorMessage = error?.message || 'Failed to send email';
    console.error('Email send error:', error);
    await logEmailToFirestore(options, 'failed', errorMessage);
    return { success: false, error: errorMessage };
  }
}

const EmailTemplates = {
  orderConfirmation: (orderId, customerName, items, total) => ({
    subject: `Order Confirmed - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order. Your order <strong>${orderId}</strong> has been confirmed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${items.map(item => `<li>${item.name} - ${item.quantity} x ৳${item.price}</li>`).join('')}
        </ul>
        <p><strong>Total: ৳${total}</strong></p>
        <p>We will notify you when your order is processed.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  paymentSuccess: (orderId, customerName, amount, paymentMethod) => ({
    subject: `Payment Successful - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Successful!</h2>
        <p>Dear ${customerName},</p>
        <p>Your payment for order <strong>${orderId}</strong> has been successfully processed.</p>
        <p><strong>Amount:</strong> ৳${amount}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p>Your order is now being processed. We will notify you once it's ready.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  paymentFailed: (orderId, customerName, reason) => ({
    subject: `Payment Failed - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payment Failed</h2>
        <p>Dear ${customerName},</p>
        <p>Your payment for order <strong>${orderId}</strong> could not be processed.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please try again or contact support if you believe this is an error.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  hostingReady: (domain, serverIp, controlPanelUrl, username, password) => ({
    subject: `Your Hosting is Ready - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Hosting is Ready!</h2>
        <p>Great news! Your hosting account for <strong>${domain}</strong> has been activated.</p>
        <h3>Account Details:</h3>
        <ul>
          <li><strong>Domain:</strong> ${domain}</li>
          <li><strong>Server IP:</strong> ${serverIp}</li>
          <li><strong>cPanel URL:</strong> <a href="${controlPanelUrl}">${controlPanelUrl}</a></li>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>You can now log in to your cPanel and start building your website.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  hostingFailed: (domain, reason) => ({
    subject: `Hosting Provisioning Failed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Hosting Provisioning Failed</h2>
        <p>We were unable to provision hosting for <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Our team has been notified and will contact you shortly.</p>
        <p>Thank you for your patience,<br>Click2IT Team</p>
      </div>
    `,
  }),

  domainRegistered: (domain, expiryDate) => ({
    subject: `Domain Registered - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Domain Registered Successfully!</h2>
        <p>Your domain <strong>${domain}</strong> has been successfully registered.</p>
        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
        <p>You can now use this domain for your website and email.</p>
        <p>Thank you for choosing Click2IT!</p>
      </div>
    `,
  }),

  domainTransferSuccess: (domain) => ({
    subject: `Domain Transfer Successful - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Domain Transfer Failed</h2>
        <p>We were unable to transfer your domain <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support for assistance.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  domainRenewalSuccess: (domain, expiryDate, amount) => ({
    subject: `Domain Renewed - ${domain}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Domain Renewal Failed</h2>
        <p>We were unable to renew your domain <strong>${domain}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact support immediately to avoid domain expiration.</p>
        <p>Thank you,<br>Click2IT Team</p>
      </div>
    `,
  }),

  welcome: (customerName, email) => ({
    subject: 'Welcome to Click2IT!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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

module.exports = {
  sendEmail,
  EmailTemplates,
};
