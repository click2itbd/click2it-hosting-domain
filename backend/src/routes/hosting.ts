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
  triggerHostingAutoSSL,
} from '../services/hosting.js';
import { HostingUsageStats } from '../providers/hosting/IHostingProvider.js';
import { config } from '../config/index.js';
import { recordSecurityLog, extractClientIp } from '../services/securityAudit.js';

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
    const { providerAccountId, hostingAccountId, domain } = req.body;
    let targetProviderId = providerAccountId;
    let accountData: any = null;

    const db = getAdminDb();
    if (hostingAccountId) {
      const snap = await db.collection('hostingAccounts').doc(hostingAccountId).get();
      if (snap.exists) {
        accountData = snap.data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view usage for this account' });
          }
        }
        targetProviderId = accountData.providerAccountId || accountData.username || targetProviderId;
      }
    } else if (providerAccountId) {
      const snap = await db.collection('hostingAccounts').where('providerAccountId', '==', providerAccountId).limit(1).get();
      if (!snap.empty) {
        accountData = snap.docs[0].data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view usage for this account' });
          }
        }
      }
    } else if (domain) {
      const snap = await db.collection('hostingAccounts').where('domain', '==', domain).limit(1).get();
      if (!snap.empty) {
        accountData = snap.docs[0].data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view usage for this account' });
          }
        }
        targetProviderId = accountData.providerAccountId || accountData.username;
      }
    }

    if (!targetProviderId) {
      return res.status(400).json({ success: false, error: 'providerAccountId, hostingAccountId, or domain is required' });
    }

    try {
      const usage: HostingUsageStats = await getHostingAccountUsage(targetProviderId);
      return res.json({ success: true, data: usage });
    } catch (whmError: any) {
      console.warn(`[HostingUsage] Live WHM query failed for ${targetProviderId}:`, whmError?.message);
      const fallbackUsage: HostingUsageStats = {
        providerAccountId: targetProviderId,
        diskUsageMB: accountData?.diskUsageMb ? accountData.diskUsageMb * 1024 : 1240,
        diskLimitMB: accountData?.diskLimitMb ? accountData.diskLimitMb * 1024 : 5120,
        bandwidthUsageMB: accountData?.bandwidthUsageMb ? accountData.bandwidthUsageMb * 1024 : 3400,
        bandwidthLimitMB: 51200,
        lastUpdated: new Date().toISOString(),
      };
      return res.json({ success: true, data: fallbackUsage, fallback: true });
    }
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

hostingRouter.get('/admin/cloudlinux-config', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const adminCheck = await isUserAdmin(req.user.uid, req.user.email);
    if (!adminCheck) return res.status(403).json({ success: false, error: 'Admin access required' });
    const { getCloudLinuxConfig, maskCloudLinuxConfig } = await import('../services/cloudlinuxConfig.js');
    const cfg = await getCloudLinuxConfig();
    return res.json({ success: true, config: maskCloudLinuxConfig(cfg) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch CloudLinux config' });
  }
});

hostingRouter.post('/admin/cloudlinux-config', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const adminCheck = await isUserAdmin(req.user.uid, req.user.email);
    if (!adminCheck) return res.status(403).json({ success: false, error: 'Admin access required' });
    const { saveCloudLinuxConfig, getCloudLinuxConfig, maskCloudLinuxConfig } = await import('../services/cloudlinuxConfig.js');
    await saveCloudLinuxConfig(req.body || {});
    const cfg = await getCloudLinuxConfig();
    return res.json({ success: true, message: 'CloudLinux configuration saved successfully', config: maskCloudLinuxConfig(cfg) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to save CloudLinux config' });
  }
});

hostingRouter.post('/admin/cloudlinux-test', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const adminCheck = await isUserAdmin(req.user.uid, req.user.email);
    if (!adminCheck) return res.status(403).json({ success: false, error: 'Admin access required' });
    const { getCloudLinuxProviderWithSettings } = await import('../services/cloudlinuxConfig.js');
    const provider = await getCloudLinuxProviderWithSettings(req.body || {});
    const result = await provider.testConnection();
    return res.json(result);
  } catch (error: any) {
    return res.json({ success: false, code: 'CLOUDLINUX_ERROR', message: error?.message || 'Connection test failed' });
  }
});

hostingRouter.post('/cloudlinux/license', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { getCloudLinuxConfig, getCloudLinuxProviderWithSettings } = await import('../services/cloudlinuxConfig.js');
    const cfg = await getCloudLinuxConfig();
    if (!cfg.enabled) {
      return res.status(400).json({ success: false, error: 'CloudLinux integration is disabled in settings.' });
    }

    const { ip, type } = req.body;
    if (!ip || !type) {
      return res.status(400).json({ success: false, error: 'ip and type are required' });
    }

    const provider = await getCloudLinuxProviderWithSettings();
    const result = await provider.addLicense(ip, type);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('CloudLinux license error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
  }
});

hostingRouter.delete('/cloudlinux/license', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { getCloudLinuxConfig, getCloudLinuxProviderWithSettings } = await import('../services/cloudlinuxConfig.js');
    const cfg = await getCloudLinuxConfig();
    if (!cfg.enabled) {
      return res.status(400).json({ success: false, error: 'CloudLinux integration is disabled in settings.' });
    }

    const { ip, type } = req.body;
    if (!ip || !type) {
      return res.status(400).json({ success: false, error: 'ip and type are required' });
    }

    const provider = await getCloudLinuxProviderWithSettings();
    const result = await provider.removeLicense(ip, type);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('CloudLinux license removal error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'CloudLinux operation failed' });
  }
});


hostingRouter.post('/sso', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { providerAccountId, hostingAccountId, domain } = req.body;
    let targetProviderId = providerAccountId;
    let targetDomain = domain;
    let accountData: any = null;

    const db = getAdminDb();
    if (hostingAccountId) {
      const snap = await db.collection('hostingAccounts').doc(hostingAccountId).get();
      if (snap.exists) {
        accountData = snap.data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to access this hosting account' });
          }
        }
        targetProviderId = accountData.providerAccountId || accountData.username || targetProviderId;
        targetDomain = accountData.domain || targetDomain;
      }
    } else if (providerAccountId) {
      const snap = await db.collection('hostingAccounts').where('providerAccountId', '==', providerAccountId).limit(1).get();
      if (!snap.empty) {
        accountData = snap.docs[0].data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to access this hosting account' });
          }
        }
        targetDomain = accountData.domain || targetDomain;
      }
    } else if (domain) {
      const snap = await db.collection('hostingAccounts').where('domain', '==', domain).limit(1).get();
      if (!snap.empty) {
        accountData = snap.docs[0].data();
        if (accountData.userId !== req.user.uid) {
          const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
          if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized to access this hosting account' });
          }
        }
        targetProviderId = accountData.providerAccountId || accountData.username;
      }
    }

    if (!targetProviderId && targetDomain) {
      targetProviderId = targetDomain.replace(/[^a-z0-9]/gi, '').slice(0, 8);
    }

    if (!targetProviderId) {
      return res.status(400).json({ success: false, error: 'providerAccountId or hostingAccountId is required' });
    }

    let url: string | null = null;
    try {
      url = await createHostingLoginSession(targetProviderId);
    } catch (ssoErr: any) {
      console.warn(`[HostingSSO] Live session generation failed for ${targetProviderId}:`, ssoErr?.message);
      // Fallback direct URL to cPanel login
      url = accountData?.cPanelUrl || accountData?.controlPanelUrl || (targetDomain ? `https://${targetDomain}:2083` : null);
    }

    if (!url) {
      return res.status(400).json({ success: false, error: 'Failed to generate cPanel login URL' });
    }

    // Record Security Log
    recordSecurityLog({
      userId: req.user.uid,
      action: 'SSO_LOGIN',
      details: `One-Click cPanel SSO session opened for ${targetDomain || targetProviderId}`,
      ipAddress: extractClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      metadata: { domain: targetDomain, providerAccountId: targetProviderId }
    }).catch(err => console.warn('[SecurityAudit] SSO log error:', err));

    return res.json({ success: true, url });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Failed to generate SSO URL' });
  }
});

hostingRouter.post('/cancellation-request', requireFirebaseAuth, async (req: any, res: Response) => {
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
    } catch (tErr) {
      console.warn('Could not record cancellation ticket:', tErr);
    }

    return res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Our billing department has been notified.'
    });
  } catch (error: any) {
    console.error('Cancellation request error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to submit cancellation request' });
  }
});

export default hostingRouter;

/**
 * POST /api/hosting/autossl/trigger
 * Triggers cPanel AutoSSL check for a specific hosting account or provider username
 */
hostingRouter.post('/autossl/trigger', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { hostingAccountId, providerAccountId } = req.body;
    let targetProviderId = providerAccountId;

    const db = getAdminDb();
    if (hostingAccountId) {
      const snap = await db.collection('hostingAccounts').doc(hostingAccountId).get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Hosting account not found' });
      }
      const data = snap.data() || {};
      if (data.userId !== req.user.uid) {
        const isAdmin = await isUserAdmin(req.user.uid, req.user.email);
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Unauthorized to manage this hosting account' });
        }
      }
      targetProviderId = data.providerAccountId || data.username || targetProviderId;
    }

    if (!targetProviderId) {
      return res.status(400).json({ success: false, error: 'providerAccountId or hostingAccountId is required' });
    }

    const result = await triggerHostingAutoSSL(targetProviderId);
    if (hostingAccountId) {
      await db.collection('hostingAccounts').doc(hostingAccountId).update({
        lastAutoSslTriggeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: result.success,
      message: result.message || 'AutoSSL check successfully triggered. Certificate will issue automatically.'
    });
  } catch (error: any) {
    console.error('AutoSSL trigger error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to trigger AutoSSL' });
  }
});
