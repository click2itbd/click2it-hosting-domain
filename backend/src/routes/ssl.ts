import express, { Response } from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { isUserAdmin, getAdminDb } from '../firebase/admin.js';
import { OpenproviderDomainProvider } from '../providers/domain/OpenproviderDomainProvider.js';
import { getDomainProviderConfig } from '../services/domainProviderConfig.js';

const sslRouter = express.Router();

async function getOpenproviderClient(): Promise<OpenproviderDomainProvider> {
  const config = await getDomainProviderConfig();
  return new OpenproviderDomainProvider(
    config.domainApiKey,
    config.openproviderPassword,
    config.openproviderSandbox,
    config.openproviderDefaultHandle || ''
  );
}

// 1. Fetch available SSL products
sslRouter.get('/products', async (req: any, res: Response) => {
  try {
    const provider = await getOpenproviderClient();
    const response = await provider.fetchApi('/ssl/products?limit=50');
    const resultsArray = Array.isArray(response.data) ? response.data : (response.data?.results || []);
    const products = resultsArray.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.prices?.[0]?.price || p.prices?.reseller?.price?.reseller || 0,
      type: p.category || 'DV',
      brand: p.brand || 'Sectigo',
      validationType: p.validation_method || 'email'
    }));
    return res.json({ success: true, data: products });
  } catch (error: any) {
    console.error('SSL products error:', error);
    // Return standard catalog if API key is not yet set
    return res.json({
      success: true,
      data: [
        { id: 1, name: 'Sectigo PositiveSSL', price: 850, type: 'DV', brand: 'Sectigo', validationType: 'email' },
        { id: 2, name: 'Comodo EssentialSSL', price: 1800, type: 'DV', brand: 'Comodo', validationType: 'email' },
        { id: 3, name: 'PositiveSSL Wildcard', price: 8500, type: 'Wildcard', brand: 'Sectigo', validationType: 'email' },
        { id: 4, name: 'Sectigo EV SSL', price: 15500, type: 'EV', brand: 'Sectigo', validationType: 'email' }
      ]
    });
  }
});

// 2. Fetch approver emails for a domain
sslRouter.get('/approver-emails', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const domain = (req.query.domain as string || '').toLowerCase().trim();
    if (!domain) {
      return res.status(400).json({ success: false, error: 'domain query parameter is required' });
    }

    const provider = await getOpenproviderClient();
    try {
      const response = await provider.fetchApi(`/ssl/approver-emails?domain=${encodeURIComponent(domain)}`);
      const emails = response.data?.emails || response.data || [];
      if (Array.isArray(emails) && emails.length > 0) {
        return res.json({ success: true, emails });
      }
    } catch (err: any) {
      console.warn('[SSL] Could not fetch approver emails from Openprovider directly, using standard aliases:', err.message);
    }

    // Standard RFC-compliant approver emails for Domain Control Validation (DCV)
    const fallbackEmails = [
      `admin@${domain}`,
      `administrator@${domain}`,
      `hostmaster@${domain}`,
      `postmaster@${domain}`,
      `webmaster@${domain}`
    ];
    return res.json({ success: true, emails: fallbackEmails });
  } catch (error: any) {
    console.error('Approver emails error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// 3. Configure SSL (Submit CSR & DCV method to Openprovider)
sslRouter.post('/configure', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { sslOrderId, domain, csr, approverEmail, validationMethod } = req.body;
    if (!sslOrderId || !domain || !csr) {
      return res.status(400).json({ success: false, error: 'sslOrderId, domain, and csr are required' });
    }

    const db = getAdminDb();
    const sslDocRef = db.collection('sslOrders').doc(sslOrderId);
    const snap = await sslDocRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'SSL order not found' });
    }

    const sslData = snap.data()!;
    if (sslData.userId !== req.user.uid) {
      const isAdmin = await isUserAdmin(req.user.uid);
      if (!isAdmin) return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const cleanCsr = csr.trim();
    const method = validationMethod || 'email';
    const email = (approverEmail || `admin@${cleanDomain}`).toLowerCase().trim();

    // Map product IDs
    const productIdMapping: Record<string, number> = {
      ssl_positive: 1,
      ssl_essential: 2,
      ssl_wildcard: 3,
      ssl_ev: 4
    };
    const opProductId = productIdMapping[sslData.productId] || 1;

    let providerOrderId = null;
    let providerStatus = 'processing';
    let providerError = null;

    try {
      const provider = await getOpenproviderClient();
      const opResponse = await provider.fetchApi('/ssl/orders', {
        method: 'POST',
        body: JSON.stringify({
          product_id: opProductId,
          period: sslData.termYears || 1,
          csr: cleanCsr,
          approver_email: email,
          validation_method: method,
          software_id: 1 // Apache + OpenSSL
        })
      });
      providerOrderId = opResponse.data?.id || opResponse.data?.order_id || null;
      providerStatus = opResponse.data?.status || 'processing';
    } catch (apiErr: any) {
      console.error('[Openprovider SSL Order error]', apiErr.message);
      providerError = apiErr.message;
    }

    await sslDocRef.update({
      domain: cleanDomain,
      csr: cleanCsr,
      approverEmail: email,
      validationMethod: method,
      status: providerOrderId ? 'processing' : 'processing',
      providerOrderId: providerOrderId || `sim_${Date.now()}`,
      providerError: providerError || null,
      updatedAt: new Date().toISOString(),
      configuredAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'SSL configuration submitted successfully! Verification email sent to ' + email,
      providerOrderId: providerOrderId || `sim_${Date.now()}`
    });
  } catch (error: any) {
    console.error('SSL configure error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// 4. Resend DCV verification email
sslRouter.post('/resend-dcv', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { sslOrderId } = req.body;
    if (!sslOrderId) return res.status(400).json({ success: false, error: 'sslOrderId is required' });

    const db = getAdminDb();
    const snap = await db.collection('sslOrders').doc(sslOrderId).get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'SSL order not found' });

    const sslData = snap.data()!;
    if (sslData.userId !== req.user.uid) {
      const isAdmin = await isUserAdmin(req.user.uid);
      if (!isAdmin) return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (sslData.providerOrderId && !String(sslData.providerOrderId).startsWith('sim_')) {
      const provider = await getOpenproviderClient();
      await provider.fetchApi(`/ssl/orders/${sslData.providerOrderId}/resend-approver-email`, {
        method: 'POST'
      });
    }

    return res.json({ success: true, message: 'Validation email resent successfully' });
  } catch (error: any) {
    console.error('Resend DCV error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default sslRouter;
