import { Router } from 'express';
import { sendEmail, notifyAdmins, EmailTemplates, verifySmtpConnection, sendTestEmail, resetSmtpCache } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { getDynamicTemplate } from '../services/templateHelper.js';
import { getAdminDb } from '../firebase/admin.js';
import { FieldValue } from 'firebase-admin/firestore';
const emailRouter = Router();
emailRouter.post('/send-email', requireFirebaseAuth, async (req, res) => {
    try {
        const { to, subject, html, attachments } = req.body;
        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
        }
        const result = await sendEmail({ to, subject, html, attachments });
        if (!result.success) {
            return res.status(400).json({ error: result.error || 'Failed to send email' });
        }
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    }
    catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
emailRouter.post('/verify-smtp', requireFirebaseAuth, async (req, res) => {
    try {
        const customConfig = req.body.customConfig || req.body.smtpConfig || (req.body.host || req.body.mailHost ? {
            host: req.body.mailHost || req.body.host,
            port: req.body.mailPort || req.body.port,
            user: req.body.mailUsername || req.body.user,
            password: req.body.mailPassword || req.body.password,
            secure: req.body.mailEncryption === 'ssl' || String(req.body.mailPort || req.body.port) === '465',
            fromName: req.body.mailFromName || req.body.fromName,
            fromEmail: req.body.mailFromAddress || req.body.fromEmail,
        } : undefined);
        const result = await verifySmtpConnection(customConfig);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('SMTP verify error:', error);
        res.status(500).json({ success: false, message: error.message || 'Verification failed' });
    }
});
emailRouter.post('/send-test-email', requireFirebaseAuth, async (req, res) => {
    try {
        const { to, subject, body, templateId } = req.body;
        if (!to || typeof to !== 'string' || !to.includes('@')) {
            return res.status(400).json({ success: false, error: 'A valid recipient email address is required.' });
        }
        const customConfig = req.body.customConfig || (req.body.mailHost ? {
            host: req.body.mailHost,
            port: req.body.mailPort,
            user: req.body.mailUsername,
            password: req.body.mailPassword,
            secure: req.body.mailEncryption === 'ssl' || String(req.body.mailPort) === '465',
            fromName: req.body.mailFromName,
            fromEmail: req.body.mailFromAddress,
        } : undefined);
        let finalSubject = subject;
        let finalBody = body;
        // If templateId provided, load template with rich sample mock data
        if (templateId) {
            const sampleVars = {
                customer_name: 'Tanvir Hossain',
                customerName: 'Tanvir Hossain',
                order_id: 'ORD-98214',
                orderId: 'ORD-98214',
                invoice_no: 'INV-2026-0042',
                domain: 'example-company.com',
                domain_name: 'example-company.com',
                total_amount: '৳1,450',
                total: '৳1,450',
                amount: '৳1,450',
                due_date: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB'),
                expiry_date: new Date(Date.now() + 365 * 86400000).toLocaleDateString('en-GB'),
                payment_method: 'bKash Online',
                nameservers: 'ns1.click2itbd.com, ns2.click2itbd.com',
                ns1: 'ns1.click2itbd.com',
                ns2: 'ns2.click2itbd.com',
                transfer_id: '#OP-92841',
                registration_id: '#REG-88219',
                package_name: 'Turbo Cloud Hosting - 10GB SSD',
                cpanel_url: 'https://cpanel.example-company.com:2083',
                username: 'tanvir_host',
                password: 'Click2IT#Secure2026!',
                server_ip: '103.145.118.25',
                client_portal_url: 'https://click2it.bd/account/services',
                ticket_id: '#TCK-552',
                ticket_subject: 'SSL Certificate Renewal Inquiry',
                staff_name: 'Click2IT Technical Support',
                reply_message: 'Your SSL certificate has been auto-renewed and installed successfully.',
                company_name: 'Click2IT BD',
            };
            const defaultPreview = `<p>This is a live test preview for template: <strong>${templateId}</strong></p>`;
            const rendered = await getDynamicTemplate(templateId, sampleVars, subject || `Preview: ${templateId}`, defaultPreview);
            finalSubject = `[PREVIEW] ${rendered.subject}`;
            finalBody = rendered.html;
        }
        const result = await sendTestEmail({
            to,
            customConfig,
            subject: finalSubject,
            body: finalBody,
        });
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Send test email error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to dispatch test email' });
    }
});
emailRouter.get('/settings', requireFirebaseAuth, async (req, res) => {
    try {
        const db = getAdminDb();
        let data = {};
        const configSnap = await db.collection('settings').doc('email_config').get();
        if (configSnap.exists) {
            data = configSnap.data() || {};
        }
        else {
            const siteSnap = await db.collection('settings').doc('site').get();
            if (siteSnap.exists) {
                data = siteSnap.data() || {};
            }
        }
        return res.status(200).json({
            success: true,
            settings: {
                mailDriver: data.mailDriver || 'smtp',
                mailHost: data.mailHost || '',
                mailPort: data.mailPort || '587',
                mailUsername: data.mailUsername || '',
                mailPassword: data.mailPassword || '',
                mailEncryption: data.mailEncryption || 'tls',
                mailFromName: data.mailFromName || 'Click2IT',
                mailFromAddress: data.mailFromAddress || '',
                resendApiKey: data.resendApiKey || '',
            }
        });
    }
    catch (error) {
        console.error('Failed to get email settings:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
emailRouter.post('/settings', requireFirebaseAuth, async (req, res) => {
    try {
        const db = getAdminDb();
        const { mailDriver, mailHost, mailPort, mailUsername, mailPassword, mailEncryption, mailFromName, mailFromAddress, resendApiKey, } = req.body;
        const payload = {
            updatedAt: new Date().toISOString(),
        };
        if (mailDriver !== undefined)
            payload.mailDriver = String(mailDriver).trim();
        if (mailHost !== undefined)
            payload.mailHost = String(mailHost).trim();
        if (mailPort !== undefined)
            payload.mailPort = String(mailPort).trim();
        if (mailUsername !== undefined)
            payload.mailUsername = String(mailUsername).trim();
        if (mailPassword !== undefined)
            payload.mailPassword = String(mailPassword).trim();
        if (mailEncryption !== undefined)
            payload.mailEncryption = String(mailEncryption).trim();
        if (mailFromName !== undefined)
            payload.mailFromName = String(mailFromName).trim();
        if (mailFromAddress !== undefined)
            payload.mailFromAddress = String(mailFromAddress).trim();
        if (resendApiKey !== undefined)
            payload.resendApiKey = String(resendApiKey).trim();
        // Save to restricted email_config collection doc
        await db.collection('settings').doc('email_config').set(payload, { merge: true });
        // Clean sensitive credentials from public site document if they were stored there
        try {
            await db.collection('settings').doc('site').set({
                mailPassword: FieldValue.delete(),
                resendApiKey: FieldValue.delete(),
            }, { merge: true });
        }
        catch (cleanupErr) {
            console.warn('Could not clean old sensitive fields from settings/site:', cleanupErr);
        }
        resetSmtpCache();
        return res.status(200).json({
            success: true,
            message: 'Email & SMTP settings saved securely.',
        });
    }
    catch (error) {
        console.error('Failed to save email settings:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
// --- Support Ticket Dual Email Notifications ---
emailRouter.post('/ticket-reply', requireFirebaseAuth, async (req, res) => {
    try {
        const { ticketId, ticketSubject, customerEmail, customerName, staffName, replyMessage, ticketUrl } = req.body;
        if (!ticketId || !customerEmail || !replyMessage) {
            return res.status(400).json({ error: 'Missing required ticket fields' });
        }
        const defaultSubject = `Support Ticket Update: #${ticketId.slice(0, 8)} - ${ticketSubject || 'Inquiry'}`;
        const defaultHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: #2563eb; color: #ffffff; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">Support Ticket Response</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Ticket #${ticketId.slice(0, 8)}</p>
        </div>
        <p>Dear <strong>${customerName || 'Valued Customer'}</strong>,</p>
        <p>Our support team has replied to your ticket regarding <strong>${ticketSubject || 'Support Request'}</strong>:</p>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${replyMessage}</div>
        <p style="font-size: 13px; color: #64748b;">Replied by: <strong>${staffName || 'Click2IT Technical Support'}</strong></p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${ticketUrl || 'https://click2it.bd/account/tickets'}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View & Reply in Portal</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px; text-align: center;">Please do not reply directly to this automated email. Use the client portal link above.</p>
      </div>
    `;
        const template = await getDynamicTemplate('ticket_reply', {
            ticket_id: `#${ticketId.slice(0, 8)}`,
            ticket_subject: ticketSubject || 'Support Request',
            customer_name: customerName || 'Valued Customer',
            staff_name: staffName || 'Click2IT Technical Support',
            reply_message: replyMessage,
            ticket_url: ticketUrl || 'https://click2it.bd/account/tickets',
        }, defaultSubject, defaultHtml);
        const result = await sendEmail({
            to: customerEmail,
            subject: template.subject,
            html: template.html,
            category: 'system',
        });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        return res.status(200).json({ success: true, message: 'Customer notification email sent' });
    }
    catch (error) {
        console.error('Error dispatching ticket reply email:', error);
        return res.status(500).json({ error: error.message || 'Failed to send ticket email' });
    }
});
emailRouter.post('/ticket-created-admin-notify', requireFirebaseAuth, async (req, res) => {
    try {
        const { ticketId, ticketSubject, customerEmail, customerName, priority, message, isCustomerReply } = req.body;
        if (!ticketId || !message) {
            return res.status(400).json({ error: 'Missing ticket information' });
        }
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || 'support@click2it.bd';
        const actionLabel = isCustomerReply ? 'Customer Replied to Ticket' : 'New Support Ticket Created';
        const subject = `[SUPPORT] ${actionLabel}: #${ticketId.slice(0, 8)} - ${ticketSubject || 'Inquiry'}`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">${actionLabel}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Ticket #${ticketId.slice(0, 8)} | Priority: ${priority || 'Normal'}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 30%;"><strong>Customer:</strong></td><td>${customerName || 'Customer'} (${customerEmail || 'No email'})</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td><td>${ticketSubject || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Priority:</strong></td><td style="text-transform: capitalize;">${priority || 'medium'}</td></tr>
        </table>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://click2it.bd/admin?tab=tickets" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Open Ticket in Admin Desk</a>
        </div>
      </div>
    `;
        // Dispatch notification to all configured administrators
        notifyAdmins({
            subject,
            html,
            category: 'system',
        });
        return res.status(200).json({ success: true, message: 'Admin notification triggered' });
    }
    catch (error) {
        console.error('Error dispatching ticket admin notify email:', error);
        return res.status(500).json({ error: error.message });
    }
});
// --- Customer E-Commerce Emails ---
emailRouter.post('/order-confirmation', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, customerName, customerEmail, attachments } = req.body;
        if (!orderId || !customerName || !customerEmail)
            return res.status(400).json({ error: 'Missing fields' });
        const defaultTmpl = EmailTemplates.orderConfirmation(orderId, customerName);
        const template = await getDynamicTemplate('order_confirmation', { orderId, customerName }, defaultTmpl.subject, defaultTmpl.html);
        const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, attachments, category: 'order' });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        res.status(200).json({ success: true, message: 'Order confirmation sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
emailRouter.post('/order-status-update', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, customerName, customerEmail, status } = req.body;
        if (!orderId || !customerName || !customerEmail || !status)
            return res.status(400).json({ error: 'Missing fields' });
        const defaultTmpl = EmailTemplates.orderStatusUpdate(orderId, customerName, status);
        const template = await getDynamicTemplate('order_status_update', { orderId, customerName, status: status.toUpperCase() }, defaultTmpl.subject, defaultTmpl.html);
        const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, category: 'order' });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        res.status(200).json({ success: true, message: 'Order status update sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
emailRouter.post('/payment-verification', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, customerName, customerEmail, amount, method } = req.body;
        if (!orderId || !customerName || !customerEmail || !amount || !method)
            return res.status(400).json({ error: 'Missing fields' });
        const defaultTmpl = EmailTemplates.paymentVerification(orderId, customerName, amount, method);
        const template = await getDynamicTemplate('payment_verification', { orderId, customerName, total: String(amount), paymentMethod: method }, defaultTmpl.subject, defaultTmpl.html);
        const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, category: 'payment' });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        res.status(200).json({ success: true, message: 'Payment verification sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// --- PC Builder Emails ---
emailRouter.post('/pc-build-summary', requireFirebaseAuth, async (req, res) => {
    try {
        const { customerName, customerEmail, totalAmount, attachments } = req.body;
        if (!customerName || !customerEmail || !totalAmount)
            return res.status(400).json({ error: 'Missing fields' });
        const defaultTmpl = EmailTemplates.pcBuildSummary(customerName, totalAmount);
        const template = await getDynamicTemplate('pc_build_summary', { customerName, total: String(totalAmount) }, defaultTmpl.subject, defaultTmpl.html);
        const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, attachments, category: 'system' });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        res.status(200).json({ success: true, message: 'PC Build Summary sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// --- Admin Alerts ---
emailRouter.post('/low-stock-warning', requireFirebaseAuth, async (req, res) => {
    try {
        const { productName, currentStock } = req.body;
        if (!productName || currentStock === undefined)
            return res.status(400).json({ error: 'Missing fields' });
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@click2it.bd';
        const defaultTmpl = EmailTemplates.lowStockWarning(productName, currentStock);
        const template = await getDynamicTemplate('low_stock_warning', { productName, currentStock: String(currentStock) }, defaultTmpl.subject, defaultTmpl.html);
        const result = await sendEmail({ to: adminEmail, subject: template.subject, html: template.html, category: 'system' });
        if (!result.success)
            return res.status(400).json({ error: result.error });
        res.status(200).json({ success: true, message: 'Low stock warning sent' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
emailRouter.post('/notify-admin-new-order', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, orderData } = req.body;
        if (!orderId || !orderData) {
            return res.status(400).json({ error: 'Missing orderId or orderData' });
        }
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@click2it.bd';
        const customerName = orderData.customerName || 'A customer';
        const totalAmount = orderData.total || 0;
        const subject = `New Order Received - #${orderId.slice(0, 8)}`;
        let itemsHtml = '';
        if (orderData.items && orderData.items.length > 0) {
            itemsHtml = '<h3>Order Items:</h3><ul>' + orderData.items.map((i) => `<li>${i.name} (x${i.quantity || 1}) - ৳${i.price}</li>`).join('') + '</ul>';
        }
        const defaultHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">New Order Received!</h2>
        <p>A new order has been placed on Click2ItBD.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName} (${orderData.customerEmail || 'No email'})</p>
        <p><strong>Phone:</strong> ${orderData.customerPhone || 'N/A'}</p>
        <p><strong>Total Amount:</strong> ৳ ${totalAmount}</p>
        <p><strong>Payment Method:</strong> ${orderData.paymentMethod || 'N/A'}</p>
        ${itemsHtml}
        <br/>
        <a href="https://click2it.bd/admin" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Order in Admin Panel</a>
      </div>
    `;
        const template = await getDynamicTemplate('admin_new_order', { orderId, customerName, total: String(totalAmount), paymentMethod: orderData.paymentMethod || 'N/A' }, subject, defaultHtml);
        const result = await sendEmail({
            to: adminEmail,
            subject: template.subject,
            html: template.html,
            orderId,
            category: 'system'
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error || 'Failed to send admin notification' });
        }
        // Also notify Customer about Order Placement
        if (orderData.customerEmail) {
            try {
                const docNum = orderData.documentNumber || `INV-${orderId.slice(0, 8)}`;
                const customerSubject = `Order Placed & Confirmation - #${orderId.slice(0, 8)} [${docNum}]`;
                const customerItemsHtml = (orderData.items || []).map((item) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${item.name || item.domain || 'Service'}</td>
            <td style="padding: 10px 8px; color: #64748b; text-align: center;">${item.termYears ? `${item.termYears} Year(s)` : (item.description || '1 Year')}</td>
            <td style="padding: 10px 8px; font-weight: 700; color: #0f172a; text-align: right;">৳${item.price || 0}</td>
          </tr>
        `).join('');
                const customerHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 6px 0; font-weight: 800;">Click2IT</h1>
              <p style="color: #2563eb; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">Order Received & Invoice Created</p>
            </div>

            <div style="padding: 20px 0;">
              <p style="font-size: 15px; margin: 0 0 12px 0;">Dear <strong>${orderData.customerName || 'Valued Customer'}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
                Thank you for your order! We have received your order <strong>#${orderId.slice(0, 8)}</strong> (${docNum}). Our system is preparing to activate your services.
              </p>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px 8px; text-align: left; color: #475569; font-weight: 600;">Item / Service</th>
                    <th style="padding: 10px 8px; text-align: center; color: #475569; font-weight: 600;">Duration</th>
                    <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerItemsHtml}
                  <tr>
                    <td colspan="2" style="padding: 12px 8px; font-weight: 700; text-align: right; color: #334155;">Total Amount:</td>
                    <td style="padding: 12px 8px; font-weight: 800; text-align: right; color: #2563eb; font-size: 15px;">৳${orderData.total || 0}</td>
                  </tr>
                </tbody>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Order Summary:</p>
                <p style="margin: 0 0 4px 0; color: #475569;"><strong>Invoice No:</strong> ${docNum}</p>
                <p style="margin: 0 0 4px 0; color: #475569;"><strong>Payment Method:</strong> ${(orderData.paymentMethod || 'Online').toUpperCase()}</p>
                <p style="margin: 0; color: #475569;"><strong>Next Step:</strong> You will receive an activation email as soon as your domain & hosting services are fully provisioned.</p>
              </div>

              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="https://click2it.bd/account/services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">View My Account & Orders</a>
              </div>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">Click2IT BD &bull; Premium Hosting & Domain Solutions</p>
              <p style="margin: 0;">Need support? Contact us at info@click2itbd.com</p>
            </div>
          </div>
        `;
                await sendEmail({
                    to: orderData.customerEmail,
                    subject: customerSubject,
                    html: customerHtml,
                    orderId,
                    customerEmail: orderData.customerEmail,
                    category: 'order'
                });
            }
            catch (custMailErr) {
                console.warn('Failed to send customer order confirmation (non-blocking):', custMailErr);
            }
        }
        res.status(200).json({ success: true, message: 'Admin and customer order notifications sent' });
    }
    catch (error) {
        console.error('Order notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
emailRouter.post('/notify-order-status-update', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, newStatus, note } = req.body;
        if (!orderId || !newStatus) {
            return res.status(400).json({ error: 'Missing orderId or newStatus' });
        }
        const db = getAdminDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const orderData = orderDoc.data() || {};
        const recipientEmail = orderData.customerEmail;
        if (!recipientEmail) {
            return res.status(200).json({ success: true, message: 'No customer email found for this order.' });
        }
        const docNum = orderData.documentNumber || `INV-${orderId.slice(0, 8)}`;
        const statusUpper = String(newStatus).toUpperCase();
        const statusColors = {
            COMPLETED: {
                bg: '#16a34a',
                text: '#ffffff',
                label: 'COMPLETED & ACTIVE',
                desc: 'All services in your order have been successfully activated and are ready for use.'
            },
            PROCESSING: {
                bg: '#2563eb',
                text: '#ffffff',
                label: 'PROCESSING',
                desc: 'Our engineering team is actively provisioning and deploying your services.'
            },
            PENDING: {
                bg: '#f59e0b',
                text: '#ffffff',
                label: 'PENDING',
                desc: 'Your order is currently awaiting review or payment verification.'
            },
            CANCELLED: {
                bg: '#dc2626',
                text: '#ffffff',
                label: 'CANCELLED',
                desc: 'Your order has been cancelled. Please contact our support team if you believe this is in error.'
            },
            REFUNDED: {
                bg: '#7c3aed',
                text: '#ffffff',
                label: 'REFUNDED',
                desc: 'A refund has been processed for your order payment.'
            }
        };
        const statusInfo = statusColors[statusUpper] || {
            bg: '#475569',
            text: '#ffffff',
            label: statusUpper,
            desc: `Your order status has been updated to ${statusUpper}.`
        };
        const subject = `Order Status Update: ${statusInfo.label} - #${orderId.slice(0, 8)} [${docNum}]`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 6px 0; font-weight: 800;">Click2IT</h1>
          <div style="display: inline-block; background-color: ${statusInfo.bg}; color: ${statusInfo.text}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 14px; border-radius: 20px; margin-top: 4px;">
            Status: ${statusInfo.label}
          </div>
        </div>

        <div style="padding: 20px 0;">
          <p style="font-size: 15px; margin: 0 0 12px 0;">Dear <strong>${orderData.customerName || 'Valued Customer'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
            ${statusInfo.desc}
          </p>
          ${note ? `<div style="background-color: #f1f5f9; padding: 12px 16px; border-left: 4px solid ${statusInfo.bg}; border-radius: 4px; margin-bottom: 16px; font-size: 13px; color: #334155;"><strong>Note from Team:</strong> ${note}</div>` : ''}

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Order Details:</p>
            <p style="margin: 0 0 4px 0; color: #475569;"><strong>Order ID:</strong> #${orderId.slice(0, 8)}</p>
            <p style="margin: 0 0 4px 0; color: #475569;"><strong>Invoice No:</strong> ${docNum}</p>
            <p style="margin: 0; color: #475569;"><strong>Total Amount:</strong> ৳${orderData.total || 0}</p>
          </div>

          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="https://click2it.bd/account/services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Check Status in Dashboard</a>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 4px 0;">Click2IT BD &bull; Premium Hosting & Domain Solutions</p>
          <p style="margin: 0;">Need support? Reach out anytime at info@click2itbd.com</p>
        </div>
      </div>
    `;
        const sendRes = await sendEmail({
            to: recipientEmail,
            subject,
            html,
            orderId,
            customerEmail: recipientEmail,
            category: 'order'
        });
        return res.json({ success: sendRes.success, message: 'Status update email dispatched.' });
    }
    catch (error) {
        console.error('Status update email error:', error);
        return res.status(500).json({ error: error.message || 'Failed to send status update email.' });
    }
});
// --- Public Password Reset Notification System (Resend + Token Verification) ---
emailRouter.post('/forgot-password', async (req, res) => {
    try {
        const rawEmail = req.body?.email;
        if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
        }
        const cleanEmail = rawEmail.trim().toLowerCase();
        const crypto = await import('crypto');
        const { getAdminDb, getAdminAuth } = await import('../firebase/admin.js');
        const db = getAdminDb();
        // Determine base URL for the password reset link
        let baseUrl = req.body?.origin || process.env.FRONTEND_URL || 'https://click2it.bd';
        try {
            const siteSnap = await db.collection('settings').doc('site').get();
            if (siteSnap.exists) {
                const sData = siteSnap.data() || {};
                if (!req.body?.origin && (sData.primaryDomain || sData.hostingDomain)) {
                    const dom = sData.primaryDomain || sData.hostingDomain;
                    baseUrl = dom.startsWith('http') ? dom : `https://${dom}`;
                }
            }
        }
        catch {
            // ignore
        }
        baseUrl = baseUrl.replace(/\/+$/, '');
        // Generate cryptographically secure 60-minute reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresInMinutes = 60;
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
        await db.collection('passwordResets').doc(token).set({
            token,
            email: cleanEmail,
            expiresAt,
            used: false,
            createdAt: new Date().toISOString(),
        });
        // Optionally generate Firebase Admin oobCode if service account is active
        let oobCode = '';
        const adminAuth = getAdminAuth();
        try {
            if (adminAuth) {
                const fbLink = await adminAuth.generatePasswordResetLink(cleanEmail, {
                    url: `${baseUrl}/login`,
                });
                const parsedUrl = new URL(fbLink);
                oobCode = parsedUrl.searchParams.get('oobCode') || '';
            }
        }
        catch {
            // Fallback to token-based link if Firebase Admin Auth link is not generated
        }
        if (!oobCode && !adminAuth) {
            return res.status(200).json({
                success: true,
                emailDispatched: false,
                fallbackClientFirebase: true,
                message: 'Triggering Firebase client password reset email.',
            });
        }
        const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}${oobCode ? `&oobCode=${encodeURIComponent(oobCode)}` : ''}`;
        const defaultTmpl = EmailTemplates.passwordReset(cleanEmail, resetUrl, expiresInMinutes);
        const template = await getDynamicTemplate('password_reset', { email: cleanEmail, resetUrl, expiresInMinutes: String(expiresInMinutes) }, defaultTmpl.subject, defaultTmpl.html);
        const emailResult = await sendEmail({
            to: cleanEmail,
            customerEmail: cleanEmail,
            subject: template.subject,
            html: template.html,
            category: 'system',
            type: 'password_reset',
        });
        if (!emailResult.success) {
            return res.status(200).json({
                success: true,
                emailDispatched: false,
                fallbackClientFirebase: true,
                message: 'Password reset token generated. Triggering client email dispatch.',
            });
        }
        return res.status(200).json({
            success: true,
            emailDispatched: true,
            provider: emailResult.provider || 'resend',
            message: 'A secure password reset link has been sent to your email.',
        });
    }
    catch (error) {
        console.error('[Forgot Password Error]:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Failed to process password reset request.',
        });
    }
});
emailRouter.post('/verify-reset-token', async (req, res) => {
    try {
        const { token, email } = req.body || {};
        if (!token) {
            return res.status(400).json({ success: false, error: 'Missing reset token.' });
        }
        const { getAdminDb } = await import('../firebase/admin.js');
        const db = getAdminDb();
        const snap = await db.collection('passwordResets').doc(String(token)).get();
        if (!snap.exists) {
            return res.status(404).json({ success: false, error: 'Invalid or expired password reset link.' });
        }
        const data = snap.data() || {};
        if (data.used) {
            return res.status(400).json({ success: false, error: 'This password reset link has already been used.' });
        }
        if (new Date(data.expiresAt).getTime() < Date.now()) {
            return res.status(400).json({ success: false, error: 'This password reset link has expired. Please request a new one.' });
        }
        if (email && data.email && data.email.toLowerCase() !== String(email).trim().toLowerCase()) {
            return res.status(400).json({ success: false, error: 'Token does not match the provided email address.' });
        }
        return res.status(200).json({
            success: true,
            email: data.email,
            expiresAt: data.expiresAt,
        });
    }
    catch (error) {
        console.error('[Verify Reset Token Error]:', error);
        return res.status(500).json({ success: false, error: 'Failed to verify reset token.' });
    }
});
emailRouter.post('/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword, completedViaFirebaseClient } = req.body || {};
        if (!newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
        }
        const { getAdminDb, getAdminAuth } = await import('../firebase/admin.js');
        const db = getAdminDb();
        let targetEmail = email ? String(email).trim().toLowerCase() : '';
        if (token) {
            const snap = await db.collection('passwordResets').doc(String(token)).get();
            if (!snap.exists) {
                return res.status(404).json({ success: false, error: 'Invalid or expired password reset token.' });
            }
            const data = snap.data() || {};
            if (data.used) {
                return res.status(400).json({ success: false, error: 'This password reset link has already been used.' });
            }
            if (new Date(data.expiresAt).getTime() < Date.now()) {
                return res.status(400).json({ success: false, error: 'This password reset link has expired.' });
            }
            targetEmail = data.email || targetEmail;
        }
        if (!targetEmail) {
            return res.status(400).json({ success: false, error: 'Email address could not be determined.' });
        }
        // Update password in Firebase Auth if not already completed via Firebase client confirmPasswordReset
        if (!completedViaFirebaseClient) {
            const adminAuth = getAdminAuth();
            if (adminAuth) {
                const userRecord = await adminAuth.getUserByEmail(targetEmail);
                await adminAuth.updateUser(userRecord.uid, { password: String(newPassword) });
            }
            else {
                return res.status(400).json({
                    success: false,
                    requiresOobCode: true,
                    error: 'Please use the verification code from your email to complete the password reset.',
                });
            }
        }
        if (token) {
            await db.collection('passwordResets').doc(String(token)).set({
                used: true,
                usedAt: new Date().toISOString(),
            }, { merge: true });
        }
        // Send confirmation notification via Resend
        const confirmTmpl = EmailTemplates.passwordResetConfirmation(targetEmail);
        await sendEmail({
            to: targetEmail,
            customerEmail: targetEmail,
            subject: confirmTmpl.subject,
            html: confirmTmpl.html,
            category: 'system',
            type: 'password_reset_confirmation',
        }).catch(() => null);
        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully. You can now sign in with your new password.',
        });
    }
    catch (error) {
        console.error('[Reset Password Error]:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Failed to reset password.',
        });
    }
});
export default emailRouter;
