import { Router } from 'express';
import { sendEmail, EmailTemplates, verifySmtpConnection } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { getDynamicTemplate } from '../services/templateHelper.js';
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
        const result = await verifySmtpConnection();
        res.status(200).json(result);
    }
    catch (error) {
        console.error('SMTP verify error:', error);
        res.status(500).json({ success: false, message: error.message || 'Verification failed' });
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
        res.status(200).json({ success: true, message: 'Admin notification sent' });
    }
    catch (error) {
        console.error('Admin notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        try {
            const adminAuth = getAdminAuth();
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
