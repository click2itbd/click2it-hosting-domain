import { Router } from 'express';
import { getAdminDb, isUserAdmin } from '../firebase/admin.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { sendEmail } from '../services/email.js';
import { getAdminDocument } from '../firebase/admin.js';
import { testHostingConnection, provisionHostingAccount, suspendHostingAccount, unsuspendHostingAccount, terminateHostingAccount, getHostingAccountUsage, changeHostingPlan, classifyHostingError, createHostingLoginSession, } from '../services/hosting.js';
import { config } from '../config/index.js';
const hostingRouter = Router();
hostingRouter.get('/health', async (req, res) => {
    try {
        const result = await testHostingConnection();
        return res.json({
            success: result.success,
            code: result.code,
            message: result.message,
        });
    }
    catch (error) {
        const classified = classifyHostingError(error);
        return res.status(500).json({
            success: false,
            code: classified.code,
            message: classified.message,
        });
    }
});
hostingRouter.post('/test-connection', async (req, res) => {
    try {
        const result = await testHostingConnection();
        return res.json({
            success: result.success,
            code: result.code,
            message: result.message,
        });
    }
    catch (error) {
        const classified = classifyHostingError(error);
        return res.status(500).json({
            success: false,
            code: classified.code,
            message: classified.message,
        });
    }
});
hostingRouter.post('/provision', requireFirebaseAuth, async (req, res) => {
    try {
        const { domain, contactEmail, billingCycle, planCode, idempotencyKey } = req.body;
        if (!domain || !contactEmail || !billingCycle) {
            return res.status(400).json({ success: false, error: 'domain, contactEmail, and billingCycle are required' });
        }
        const db = getAdminDb();
        const key = idempotencyKey || `${domain}-${planCode || 'default'}-${billingCycle}`;
        const existing = await db.collection('hostingAccounts')
            .where('idempotencyKey', '==', key)
            .where('status', '!=', 'cancelled')
            .limit(1)
            .get();
        if (!existing.empty) {
            const existingDoc = existing.docs[0];
            return res.json({
                success: true,
                data: { orderId: existingDoc.id, ...existingDoc.data() },
                message: 'Duplicate request detected. Returning existing account.',
            });
        }
        const result = await provisionHostingAccount({
            domain,
            contactEmail,
            billingCycle,
            planCode: planCode || 'default',
            idempotencyKey: key,
        });
        if (result.success) {
            const accountRef = db.collection('hostingAccounts').doc();
            await accountRef.set({
                userId: req.user?.uid || 'guest',
                domain,
                providerAccountId: result.providerAccountId,
                planId: planCode || 'default',
                status: 'active',
                provisioningStatus: 'completed',
                cPanelUrl: result.cPanelUrl,
                nameservers: result.nameservers || [],
                billingCycle,
                autoRenew: false,
                idempotencyKey: key,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            let fromName = 'Click2IT';
            try {
                const siteResult = await getAdminDocument('settings', 'site');
                if (siteResult.exists && siteResult.data) {
                    fromName = siteResult.data.siteName || 'Click2IT';
                }
            }
            catch (error) {
                console.error('Failed to read site settings:', error);
            }
            const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #16a34a;">Hosting Account Provisioned</h2>
          <p>Hi,</p>
          <p>Your hosting account for <strong>${domain}</strong> has been successfully provisioned.</p>
          ${result.cPanelUrl ? `<p><strong>Control Panel:</strong> <a href="${result.cPanelUrl}">${result.cPanelUrl}</a></p>` : ''}
          ${result.nameservers?.length ? `<p><strong>Nameservers:</strong> ${result.nameservers.join(', ')}</p>` : ''}
          <p><strong>Billing Cycle:</strong> ${billingCycle}</p>
          <p style="color: #888; font-size: 0.9em;">Thank you for choosing ${fromName}.</p>
        </div>
      `;
            sendEmail({ to: contactEmail, subject: `Hosting Ready: ${domain}`, html }).catch(err => {
                console.warn('Hosting ready email send error:', err?.message);
            });
        }
        else {
            let adminEmail = null;
            try {
                const siteResult = await getAdminDocument('settings', 'site');
                if (siteResult.exists && siteResult.data) {
                    adminEmail = siteResult.data.contactEmail || null;
                }
            }
            catch (error) {
                console.error('Failed to read site settings:', error);
            }
            if (adminEmail) {
                sendEmail({ to: adminEmail, subject: `Hosting Provision Failed: ${domain}`, html: `<p>Hosting provisioning for <strong>${domain}</strong> failed: ${result.error || 'Unknown error'}</p>` }).catch(err => {
                    console.warn('Hosting failed email send error:', err?.message);
                });
            }
        }
        return res.json({ success: result.success, data: result, error: result.error });
    }
    catch (error) {
        console.error('Hosting provision error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/suspend', requireFirebaseAuth, async (req, res) => {
    try {
        const { providerAccountId } = req.body;
        if (!providerAccountId)
            return res.status(400).json({ success: false, error: 'providerAccountId is required' });
        await suspendHostingAccount(providerAccountId);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Hosting suspend error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/unsuspend', requireFirebaseAuth, async (req, res) => {
    try {
        const { providerAccountId } = req.body;
        if (!providerAccountId)
            return res.status(400).json({ success: false, error: 'providerAccountId is required' });
        await unsuspendHostingAccount(providerAccountId);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Hosting unsuspend error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/terminate', requireFirebaseAuth, async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user?.uid);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin authorization required for termination' });
        }
        const { providerAccountId } = req.body;
        if (!providerAccountId)
            return res.status(400).json({ success: false, error: 'providerAccountId is required' });
        await terminateHostingAccount(providerAccountId);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Hosting terminate error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/usage', requireFirebaseAuth, async (req, res) => {
    try {
        const { providerAccountId } = req.body;
        if (!providerAccountId)
            return res.status(400).json({ success: false, error: 'providerAccountId is required' });
        const usage = await getHostingAccountUsage(providerAccountId);
        return res.json({ success: true, data: usage });
    }
    catch (error) {
        console.error('Hosting usage error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/change-package', requireFirebaseAuth, async (req, res) => {
    try {
        const { providerAccountId, newPlanCode } = req.body;
        if (!providerAccountId || !newPlanCode) {
            return res.status(400).json({ success: false, error: 'providerAccountId and newPlanCode are required' });
        }
        const allowedPackages = ['starter', 'basic', 'business', 'enterprise', 'default'];
        if (!allowedPackages.includes(newPlanCode)) {
            return res.status(400).json({ success: false, error: `Invalid package: ${newPlanCode}. Allowed packages: ${allowedPackages.join(', ')}` });
        }
        await changeHostingPlan(providerAccountId, newPlanCode);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Hosting change package error:', error);
        const classified = classifyHostingError(error);
        return res.status(500).json({ success: false, error: classified.message, code: classified.code });
    }
});
hostingRouter.post('/retry', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId, orderType } = req.body;
        if (!orderId || !orderType) {
            return res.status(400).json({ success: false, error: 'orderId and orderType are required' });
        }
        const db = getAdminDb();
        const collectionName = orderType === 'hosting' ? 'hostingAccounts' : 'orders';
        const orderRef = db.collection(collectionName).doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (orderData.status !== 'failed' && orderData.provisioningStatus !== 'failed') {
            return res.status(400).json({ success: false, error: `Order status '${orderData.status}' is not eligible for retry` });
        }
        await orderRef.update({
            status: 'processing',
            provisioningStatus: 'pending',
            updatedAt: new Date(),
        });
        return res.json({ success: true, message: 'Retry initiated. Provisioning will be attempted.' });
    }
    catch (error) {
        console.error('Hosting retry error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
    }
});
hostingRouter.post('/cloudlinux/license', requireFirebaseAuth, async (req, res) => {
    try {
        if (config.cloudlinux.enabled !== 'true') {
            return res.status(400).json({ success: false, error: 'CloudLinux integration is not enabled.' });
        }
        const { ip, type } = req.body;
        if (!ip || !type) {
            return res.status(400).json({ success: false, error: 'ip and type are required' });
        }
        const { getCloudLinuxProvider } = await import('../providers/cloudlinux/CloudLinuxProvider');
        const provider = getCloudLinuxProvider();
        const result = await provider.addLicense(ip, type);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('CloudLinux license error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
    }
});
hostingRouter.delete('/cloudlinux/license', requireFirebaseAuth, async (req, res) => {
    try {
        if (config.cloudlinux.enabled !== 'true') {
            return res.status(400).json({ success: false, error: 'CloudLinux integration is not enabled.' });
        }
        const { ip, type } = req.body;
        if (!ip || !type) {
            return res.status(400).json({ success: false, error: 'ip and type are required' });
        }
        const { getCloudLinuxProvider } = await import('../providers/cloudlinux/CloudLinuxProvider');
        const provider = getCloudLinuxProvider();
        const result = await provider.removeLicense(ip, type);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('CloudLinux license removal error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
    }
});
hostingRouter.post('/sso', requireFirebaseAuth, async (req, res) => {
    try {
        const { providerAccountId } = req.body;
        if (!providerAccountId) {
            return res.status(400).json({ success: false, error: 'providerAccountId is required' });
        }
        const db = getAdminDb();
        const snap = await db.collection('hostingAccounts').where('providerAccountId', '==', providerAccountId).where('userId', '==', req.user.uid).get();
        if (snap.empty) {
            return res.status(403).json({ success: false, error: 'Hosting account not found or unauthorized' });
        }
        const url = await createHostingLoginSession(providerAccountId);
        return res.json({ success: true, url });
    }
    catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Failed to generate SSO URL' });
    }
});
hostingRouter.post('/cancellation-request', requireFirebaseAuth, async (req, res) => {
    try {
        const { accountId, reason, cancellationType } = req.body;
        if (!accountId) {
            return res.status(400).json({ success: false, error: 'accountId is required' });
        }
        const db = getAdminDb();
        const accRef = db.collection('hostingAccounts').doc(accountId);
        const accSnap = await accRef.get();
        if (!accSnap.exists) {
            return res.status(404).json({ success: false, error: 'Hosting account not found' });
        }
        const accData = accSnap.data() || {};
        if (accData.userId !== req.user.uid) {
            const { isUserAdmin } = await import('../firebase/admin.js');
            const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
            if (!isAdmin) {
                return res.status(403).json({ success: false, error: 'Unauthorized to cancel this account' });
            }
        }
        const now = new Date().toISOString();
        await accRef.update({
            cancellationRequested: true,
            cancellationReason: reason || 'Customer requested cancellation',
            cancellationType: cancellationType || 'end_of_cycle',
            cancellationRequestedAt: now,
            updatedAt: now
        });
        // Create a support ticket record for administrative tracking
        try {
            const ticketRef = db.collection('tickets').doc();
            await ticketRef.set({
                id: ticketRef.id,
                userId: req.user.uid,
                customerEmail: req.user.email || accData.customerEmail || '',
                subject: `[Cancellation Request] Hosting for ${accData.domain || accountId}`,
                category: 'cancellation',
                priority: 'medium',
                status: 'open',
                message: `Customer requested cancellation for hosting account ${accData.domain || accountId}.\nType: ${cancellationType || 'End of billing cycle'}\nReason: ${reason || 'Not specified'}`,
                createdAt: now,
                updatedAt: now
            });
        }
        catch (tErr) {
            console.warn('Could not record cancellation ticket:', tErr);
        }
        return res.json({
            success: true,
            message: 'Cancellation request submitted successfully. Our billing department has been notified.'
        });
    }
    catch (error) {
        console.error('Cancellation request error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit cancellation request' });
    }
});
export default hostingRouter;
