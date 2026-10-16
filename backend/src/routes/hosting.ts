import { Router, Response } from 'express';
import { getAdminDb, isUserAdmin } from '../firebase/admin.js';
import { requireFirebaseAuth, requireAdmin } from '../middleware/firebaseAuth.js';
import { sendEmail } from '../services/email.js';
import { getAdminDocument } from '../firebase/admin.js';
import {
  testHostingConnection,
  provisionHostingAccount,
  suspendHostingAccount,
  unsuspendHostingAccount,
  terminateHostingAccount,
  getHostingAccountUsage,
  changeHostingPlan,
  classifyHostingError,
  createHostingLoginSession,
} from '../services/hosting.js';
import { HostingUsageStats } from '../providers/hosting/IHostingProvider.js';
import { config } from '../config/index.js';

const hostingRouter = Router();

hostingRouter.get('/health', async (req: any, res: Response) => {
  try {
    const result = await testHostingConnection();
    return res.json({
      success: result.success,
      code: result.code,
      message: result.message,
    });
  } catch (error: any) {
    const classified = classifyHostingError(error);
    return res.status(500).json({
      success: false,
      code: classified.code,
      message: classified.message,
    });
  }
});

hostingRouter.post('/test-connection', async (req: any, res: Response) => {
  try {
    const result = await testHostingConnection();
    return res.json({
      success: result.success,
      code: result.code,
      message: result.message,
    });
  } catch (error: any) {
    const classified = classifyHostingError(error);
    return res.status(500).json({
      success: false,
      code: classified.code,
      message: classified.message,
    });
  }
});

hostingRouter.post('/provision', requireFirebaseAuth, async (req: any, res: Response) => {
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
          fromName = (siteResult.data as any).siteName || 'Click2IT';
        }
      } catch (error) {
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
    } else {
      let adminEmail: string | null = null;
      try {
        const siteResult = await getAdminDocument('settings', 'site');
        if (siteResult.exists && siteResult.data) {
          adminEmail = (siteResult.data as any).contactEmail || null;
        }
      } catch (error) {
        console.error('Failed to read site settings:', error);
      }
      if (adminEmail) {
        sendEmail({ to: adminEmail, subject: `Hosting Provision Failed: ${domain}`, html: `<p>Hosting provisioning for <strong>${domain}</strong> failed: ${result.error || 'Unknown error'}</p>` }).catch(err => {
          console.warn('Hosting failed email send error:', err?.message);
        });
      }
    }

    return res.json({ success: result.success, data: result, error: result.error });
  } catch (error: any) {
    console.error('Hosting provision error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/suspend', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { providerAccountId } = req.body;
    if (!providerAccountId) return res.status(400).json({ success: false, error: 'providerAccountId is required' });

    await suspendHostingAccount(providerAccountId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Hosting suspend error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/unsuspend', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { providerAccountId } = req.body;
    if (!providerAccountId) return res.status(400).json({ success: false, error: 'providerAccountId is required' });

    await unsuspendHostingAccount(providerAccountId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Hosting unsuspend error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/terminate', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin authorization required for termination' });
    }

    const { providerAccountId } = req.body;
    if (!providerAccountId) return res.status(400).json({ success: false, error: 'providerAccountId is required' });

    await terminateHostingAccount(providerAccountId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Hosting terminate error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/usage', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { providerAccountId } = req.body;
    if (!providerAccountId) return res.status(400).json({ success: false, error: 'providerAccountId is required' });

    const usage: HostingUsageStats = await getHostingAccountUsage(providerAccountId);
    return res.json({ success: true, data: usage });
  } catch (error: any) {
    console.error('Hosting usage error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/change-package', requireFirebaseAuth, async (req: any, res: Response) => {
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
  } catch (error: any) {
    console.error('Hosting change package error:', error);
    const classified = classifyHostingError(error);
    return res.status(500).json({ success: false, error: classified.message, code: classified.code });
  }
});

hostingRouter.post('/retry', requireFirebaseAuth, async (req: any, res: Response) => {
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
  } catch (error: any) {
    console.error('Hosting retry error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
});

hostingRouter.post('/cloudlinux/license', requireFirebaseAuth, async (req: any, res: Response) => {
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
  } catch (error: any) {
    console.error('CloudLinux license error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
  }
});

hostingRouter.delete('/cloudlinux/license', requireFirebaseAuth, async (req: any, res: Response) => {
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
  } catch (error: any) {
    console.error('CloudLinux license removal error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
  }
});


hostingRouter.post('/sso', requireFirebaseAuth, async (req: any, res: Response) => {
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
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Failed to generate SSO URL' });
  }
});

export default hostingRouter;
